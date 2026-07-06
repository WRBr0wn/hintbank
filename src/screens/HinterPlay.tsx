import { useState } from 'react'
import Avatar from '../components/Avatar'
import BankGrid from '../components/BankGrid'
import EditModal from '../components/EditModal'
import {
  BANK_CAP,
  addWord,
  canAddWord,
  canEditMode,
  canEndTurn,
  canReroll,
  currentAnswer,
  editResult,
  editWord,
  endTurn,
  giveHint,
  isBankFull,
  resolveHint,
  reroll,
  type GameMode,
  type GameState,
} from '../engine'
import type { Player } from '../types'
import styles from './HinterPlay.module.css'

interface Props {
  game: GameState
  roster: Player[]
  mode: GameMode
  // The active edition's randomizer page, kept reachable in randomizer mode.
  randomizerUrl: string
  onChange: (next: GameState) => void
  // Called when the hinter advances off the completed board to the summary. The
  // board stays up until then so the group can review the finished round.
  onComplete: () => void
}

type EditTarget =
  | { kind: 'word'; index: number; value: string }
  | { kind: 'result'; index: number; value: string }

export default function HinterPlay({ game, roster, mode, randomizerUrl, onChange, onComplete }: Props) {
  // False in untrusted multiplayer; when false every edit affordance is absent.
  const canEdit = canEditMode(mode)
  const [selection, setSelection] = useState<number[]>([])
  const [draft, setDraft] = useState('')
  const [overguess, setOverguess] = useState<Record<string, number>>({})
  const [landed, setLanded] = useState('')
  const [revealed, setRevealed] = useState(false)
  // The resolving phase starts collapsed to a Resolve Guess / Keep hinting choice.
  // The player list and the -1 overguess controls stay hidden until the hinter
  // opts into resolving, so the penalty is never telegraphed on a shared screen.
  const [resolving, setResolving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [resultEditMode, setResultEditMode] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)

  // Randomizer is the host-driven board: no dealt deck, nothing secret on screen.
  // The host types the answer that lands instead of the app revealing it.
  const randomizer = mode === 'online-randomizer'

  // How the dealt answer is shown. Three modes, three behaviors:
  //  plain  in-person, always visible because the device is private
  //  hold   online-one-device, covered until held so a shared screen stays safe
  //  none   randomizer, no panel at all (the host supplies answers on resolve)
  const answerPanel: 'plain' | 'hold' | 'none' = randomizer
    ? 'none'
    : mode === 'online-one-device'
      ? 'hold'
      : 'plain'

  const guessers = roster.filter((p) => p.id !== game.hinterId)
  const answer = currentAnswer(game)
  const full = isBankFull(game)
  const hinting = game.phase === 'hinting'
  const complete = game.status === 'complete'
  const avatarFor = (id: string) => roster.find((p) => p.id === id)?.avatar

  // Word-fixing is only reachable during normal hinting, never while resolving or
  // after the board completes, so a stale editMode can never bleed into them.
  const editing = canEdit && editMode && hinting && !complete

  function toggleWord(i: number) {
    // In edit mode a word click opens the fix modal instead of selecting. Markers
    // are spans with no handler, so only words reach here.
    if (editing) {
      const entry = game.bank[i]
      if (entry?.kind === 'word') setEditTarget({ kind: 'word', index: i, value: entry.word })
      return
    }
    setSelection((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
  }

  function saveEdit(value: string) {
    if (!editTarget) return
    onChange(
      editTarget.kind === 'word'
        ? editWord(game, editTarget.index, value)
        : editResult(game, editTarget.index, value),
    )
    // Confirming a fix exits the section's edit mode; same grammar both sections.
    if (editTarget.kind === 'word') setEditMode(false)
    else setResultEditMode(false)
    setEditTarget(null)
  }

  function handleAdd() {
    const word = draft.trim()
    if (!word || !canAddWord(game)) return
    onChange(addWord(game, word))
    setDraft('')
  }

  function handleGive() {
    if (selection.length === 0) return
    // Keep the selection lit through the resolving phase so the hint words stay
    // readable on a shared screen. It clears when the hint resolves below.
    onChange(giveHint(game, selection))
    setResolving(false)
    setEditMode(false)
  }

  function resetHint() {
    setOverguess({})
    setSelection([])
    setLanded('')
    setResolving(false)
  }

  function handleCorrect(pid: string) {
    // Randomizer: host types the answer. Deck modes: engine reads it from the
    // deck, so answer stays undefined.
    const typed = landed.trim()
    if (randomizer && !typed) return
    onChange(
      resolveHint(game, {
        correctGuesserId: pid,
        overguesses: overguess,
        answer: randomizer ? typed : undefined,
      }),
    )
    resetHint()
  }

  function handleNoOne() {
    onChange(resolveHint(game, { overguesses: overguess }))
    resetHint()
  }

  function handleReroll() {
    if (!canReroll(game)) return
    onChange(reroll(game))
    setSelection([])
  }

  function handleEndTurn() {
    if (!canEndTurn(game)) return
    onChange(endTurn(game))
  }

  return (
    <div className={styles.play}>
      <div className={styles.main}>
      <div className={styles.progress}>
        <span>{complete ? 'Turn complete' : `Answer ${game.resolved + 1} of ${game.answersPerGame}`}</span>
        <span>{game.hintCount} {game.hintCount === 1 ? 'hint' : 'hints'}</span>
      </div>
      <div className={styles.bar}>
        <div className={styles.barFill} style={{ width: `${(game.resolved / game.answersPerGame) * 100}%` }} />
      </div>

      {randomizer && (
        // Randomizer answers come from the separate tool, so keep a way back to it
        // visible the whole turn. New tab so it stays off the shared screen.
        <a
          href={randomizerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.randomizerLink}
        >
          Open randomizer
        </a>
      )}

      {answerPanel === 'plain' && !complete && (
        <div className={styles.answer}>
          <span className={styles.answerLabel}>Secret answer</span>
          <span className={styles.answerName}>{answer ?? ''}</span>
        </div>
      )}

      {answerPanel === 'hold' && !complete && (
        // Pointer events cover mouse, touch, and pen. Leave and cancel re-cover
        // the answer if the press slides off or is interrupted, so it can never
        // stay stuck revealed. The answer text is only in the DOM while held.
        <div
          className={`${styles.answer} ${styles.holdPanel}`}
          onPointerDown={() => setRevealed(true)}
          onPointerUp={() => setRevealed(false)}
          onPointerLeave={() => setRevealed(false)}
          onPointerCancel={() => setRevealed(false)}
        >
          <span className={styles.answerLabel}>{revealed ? 'Secret answer' : 'Hidden'}</span>
          {revealed ? (
            <span className={styles.answerName}>{answer ?? ''}</span>
          ) : (
            <span className={styles.holdHint}>Hold to reveal answer</span>
          )}
        </div>
      )}

      <section className={styles.bankSection}>
        <div className={styles.bankHead}>
          <h2>{editing ? 'Tap a word to fix it' : 'Hint Bank'}</h2>
          <div className={styles.bankHeadRight}>
            {canEdit && hinting && !complete && (
              <button
                type="button"
                className={editMode ? styles.pencilOn : styles.pencil}
                onClick={() => setEditMode((v) => !v)}
                aria-pressed={editMode}
                aria-label={editMode ? 'Done fixing words' : 'Fix a typo'}
                title={editMode ? 'Done fixing words' : 'Fix a typo'}
              >
                ✏️
              </button>
            )}
            <span className={full ? styles.bankFull : styles.bankCount}>
              {game.bank.length} / {BANK_CAP}
              {full && ' · bank full'}
            </span>
          </div>
        </div>

        <BankGrid bank={game.bank} cap={BANK_CAP} cutoff={game.hinterBase} selected={selection} interactive={hinting && !complete} onToggle={toggleWord} />

        {!complete &&
          (full ? (
            <p className={styles.fullNote}>The bank is full. Give hints from these words, or end the turn.</p>
          ) : (
            <div className={styles.addRow}>
              <input
                className={styles.addInput}
                value={draft}
                maxLength={24}
                placeholder="Add a word to the bank"
                disabled={!hinting}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <button type="button" className={styles.add} onClick={handleAdd} disabled={!canAddWord(game) || draft.trim() === ''}>
                Add
              </button>
            </div>
          ))}
      </section>

      {complete ? (
        <div className={styles.actions}>
          <p className={styles.resolvePrompt}>All {game.answersPerGame} answers are in. Review the board, then continue.</p>
          <button type="button" className={styles.primary} onClick={onComplete}>
            Continue
          </button>
        </div>
      ) : hinting ? (
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={handleGive} disabled={selection.length === 0}>
            Give hint
          </button>
          <div className={styles.escapes}>
            <button type="button" className={styles.secondary} onClick={handleReroll} disabled={!canReroll(game)}>
              Reroll
            </button>
            <button type="button" className={styles.danger} onClick={handleEndTurn} disabled={!canEndTurn(game)}>
              Bank full? End turn
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.resolve}>
          {resolving ? (
            <>
              <p className={styles.resolvePrompt}>
                {randomizer ? 'Who landed it? Type the answer, then mark them correct.' : 'Who guessed it?'}
              </p>
              {randomizer && (
                <input
                  className={styles.addInput}
                  value={landed}
                  maxLength={32}
                  placeholder="Answer that just landed"
                  onChange={(e) => setLanded(e.target.value)}
                />
              )}
              <ul className={guessers.length >= 5 ? `${styles.guessers} ${styles.guessersGrid}` : styles.guessers}>
                {guessers.map((p) => (
                  <li key={p.id} className={styles.guesser}>
                    <span className={styles.guesserName}>
                      <Avatar avatar={p.avatar} size={22} /> {p.name}
                      {overguess[p.id] ? <span className={styles.penalty}> −{overguess[p.id]}</span> : null}
                    </span>
                    <span className={styles.guesserBtns}>
                      <button
                        type="button"
                        className={styles.minus}
                        onClick={() => setOverguess((o) => ({ ...o, [p.id]: (o[p.id] ?? 0) + 1 }))}
                        aria-label={`Overguess for ${p.name}`}
                      >
                        x2 (−1)
                      </button>
                      <button
                        type="button"
                        className={styles.correct}
                        onClick={() => handleCorrect(p.id)}
                        disabled={randomizer && landed.trim() === ''}
                      >
                        Correct
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" className={styles.secondary} onClick={handleNoOne}>
                Keep Hinting!
              </button>
            </>
          ) : (
            // Collapsed default: no player list, no -1 controls on the shared
            // screen until the hinter chooses to resolve a guess.
            <div className={styles.escapes}>
              <button
                type="button"
                className={`${styles.primary} ${styles.choice}`}
                onClick={() => setResolving(true)}
              >
                Resolve Guess
              </button>
              <button
                type="button"
                className={`${styles.secondary} ${styles.choice}`}
                onClick={handleNoOne}
              >
                Keep hinting
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      <aside className={styles.results}>
        <div className={styles.resultsHeadRow}>
          <h2 className={styles.resultsHead}>{resultEditMode ? 'Tap an answer to fix it' : 'Landed'}</h2>
          {canEdit && randomizer && (
            // Randomizer answers are host-typed, so let the host fix one after
            // the fact. Deck-mode answers come from the dataset, so no pencil.
            // Same toggle grammar as the bank's.
            <button
              type="button"
              className={resultEditMode ? styles.pencilOn : styles.pencil}
              onClick={() => setResultEditMode((v) => !v)}
              aria-pressed={resultEditMode}
              aria-label={resultEditMode ? 'Done fixing answers' : 'Fix an answer'}
              title={resultEditMode ? 'Done fixing answers' : 'Fix an answer'}
            >
              ✏️
            </button>
          )}
        </div>
        <ol className={styles.resultList}>
          {Array.from({ length: game.answersPerGame }, (_, i) => {
            const result = game.results[i]
            const winner = result ? avatarFor(result.guesserId) : undefined
            const content = (
              <>
                <span className={styles.resultNum}>{i + 1}</span>
                <span className={styles.resultName}>{result ? result.answer : ''}</span>
                <span className={styles.resultAvatar}>{winner && <Avatar avatar={winner} size={20} />}</span>
              </>
            )
            // In edit mode the landed box itself is the tap target, like the
            // bank's words; there are no per-item controls.
            if (resultEditMode && result) {
              return (
                <li key={i} className={`${styles.resultRow} ${styles.resultRowEdit}`}>
                  <button
                    type="button"
                    className={styles.resultFix}
                    onClick={() => setEditTarget({ kind: 'result', index: i, value: result.answer })}
                    aria-label={`Fix answer ${i + 1}`}
                    title="Fix this answer"
                  >
                    {content}
                  </button>
                </li>
              )
            }
            return (
              <li key={i} className={result ? styles.resultRow : styles.resultPending}>
                {content}
              </li>
            )
          })}
        </ol>
      </aside>

      {editTarget && (
        <EditModal
          label={editTarget.kind === 'word' ? 'Fix this hint word' : 'Fix this answer'}
          initialValue={editTarget.value}
          maxLength={editTarget.kind === 'word' ? 24 : 32}
          confirmLabel="Save"
          cancelLabel="Cancel"
          onConfirm={saveEdit}
          // Cancel and backdrop dismiss the modal but stay in edit mode for the next fix.
          onCancel={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
