import { useState } from 'react'
import Avatar from '../components/Avatar'
import BankGrid from '../components/BankGrid'
import {
  ANSWERS_PER_GAME,
  BANK_CAP,
  addWord,
  canAddWord,
  canEndTurn,
  canReroll,
  currentAnswer,
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
  onChange: (next: GameState) => void
}

export default function HinterPlay({ game, roster, mode, onChange }: Props) {
  const [selection, setSelection] = useState<number[]>([])
  const [draft, setDraft] = useState('')
  const [overguess, setOverguess] = useState<Record<string, number>>({})
  const [landed, setLanded] = useState('')
  const [revealed, setRevealed] = useState(false)
  // The resolving phase starts collapsed to a Resolve Guess / Keep hinting choice.
  // The player list and the -1 overguess controls stay hidden until the hinter
  // opts into resolving, so the penalty is never telegraphed on a shared screen.
  const [resolving, setResolving] = useState(false)

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
  const avatarFor = (id: string) => roster.find((p) => p.id === id)?.avatar

  function toggleWord(i: number) {
    setSelection((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
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
    setOverguess({})
    setSelection([])
    setLanded('')
    setResolving(false)
  }

  function handleNoOne() {
    onChange(resolveHint(game, { overguesses: overguess }))
    setOverguess({})
    setSelection([])
    setLanded('')
    setResolving(false)
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
        <span>Answer {game.resolved + 1} of {ANSWERS_PER_GAME}</span>
        <span>{game.hintCount} {game.hintCount === 1 ? 'hint' : 'hints'}</span>
      </div>
      <div className={styles.bar}>
        <div className={styles.barFill} style={{ width: `${(game.resolved / ANSWERS_PER_GAME) * 100}%` }} />
      </div>

      {randomizer && (
        // Randomizer answers come from the separate tool, so keep a way back to it
        // visible the whole turn. New tab so it stays off the shared screen.
        <a
          href={`${import.meta.env.BASE_URL}randomizer/`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.randomizerLink}
        >
          Open randomizer
        </a>
      )}

      {answerPanel === 'plain' && (
        <div className={styles.answer}>
          <span className={styles.answerLabel}>Secret answer</span>
          <span className={styles.answerName}>{answer ?? ''}</span>
        </div>
      )}

      {answerPanel === 'hold' && (
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
          <h2>Hint Bank</h2>
          <span className={full ? styles.bankFull : styles.bankCount}>
            {game.bank.length} / {BANK_CAP}
            {full && ' · bank full'}
          </span>
        </div>

        <BankGrid bank={game.bank} cap={BANK_CAP} selected={selection} interactive={hinting} onToggle={toggleWord} />

        {full ? (
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
        )}
      </section>

      {hinting ? (
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
              <ul className={styles.guessers}>
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
                        Guessed x2 (−1)
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
        <h2 className={styles.resultsHead}>Landed</h2>
        <ol className={styles.resultList}>
          {Array.from({ length: ANSWERS_PER_GAME }, (_, i) => {
            const result = game.results[i]
            const winner = result ? avatarFor(result.guesserId) : undefined
            return (
              <li key={i} className={result ? styles.resultRow : styles.resultPending}>
                <span className={styles.resultNum}>{i + 1}</span>
                <span className={styles.resultName}>{result ? result.answer : ''}</span>
                <span className={styles.resultAvatar}>{winner && <Avatar avatar={winner} size={20} />}</span>
              </li>
            )
          })}
        </ol>
      </aside>
    </div>
  )
}
