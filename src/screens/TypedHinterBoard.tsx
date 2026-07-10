import { useState } from 'react'
import BankGrid from '../components/BankGrid'
import MpScoreStrip from './MpScoreStrip'
import MpLanded from './MpLanded'
import GuessFeed from './GuessFeed'
import CurrentHint from './CurrentHint'
import { openBoardView, type ScreenProps } from './roomScreen'
import { BANK_CAP } from '../engine'
import hp from './HinterPlay.module.css'
import g from './Game.module.css'

// The typed-guess hinter board: the same interaction as the voice HinterBoard
// minus the resolve controls. The hinter builds the bank, rerolls, and gives
// hints by selecting bank words in order; the server adjudicates each guess
// (submitGuess), so there is no give-hint-then-resolve "who guessed it" step.
// Building the bank, rerolling, or giving a new hint each closes any open hint
// server-side, so the hinting controls stay live while guessers are guessing.
// Driven by the hinter's own view (which alone holds the current answer and the
// capability flags); it holds only the word selection and the add-word draft.
export default function TypedHinterBoard({ view, connection, avatars, edition, onSend, onLeave }: ScreenProps) {
  const game = view.game!
  const hinter = view.hinter!
  const [selection, setSelection] = useState<number[]>([])
  const [draft, setDraft] = useState('')

  const complete = game.status === 'complete'
  const full = game.bank.length >= BANK_CAP

  // Selecting a word toggles it, appending in tap order so the hint keeps the
  // order the hinter picked.
  function toggleWord(i: number) {
    setSelection((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
  }

  function handleAdd() {
    const word = draft.trim()
    if (!word) return
    onSend({ type: 'addWord', word })
    setDraft('')
    setSelection([])
  }

  function handleGive() {
    if (selection.length === 0) return
    onSend({ type: 'giveHint', selection })
    setSelection([])
  }

  return (
    <div className={g.screen}>
      <div className={g.scroll}>
        {connection === 'reconnecting' && <div className={g.reconnect}>Reconnecting…</div>}
        <div className={hp.play}>
          <div className={hp.main}>
            <div className={g.whoseTurn}>
              <span className={g.turnName}>Your turn to hint</span>
              <span className={hp.bankCount}>
                {game.bank.length} / {BANK_CAP}
                {full && ' · full'}
              </span>
            </div>
            <div className={hp.progress}>
              <span>{complete ? 'Turn complete' : `Answer ${game.resolved + 1} of ${game.answersPerGame}`}</span>
              <span>{game.hintCount} {game.hintCount === 1 ? 'hint' : 'hints'}</span>
            </div>
            <div className={hp.bar}>
              <div className={hp.barFill} style={{ width: `${(game.resolved / game.answersPerGame) * 100}%` }} />
            </div>

            {!complete && (
              <div className={hp.answer}>
                <span className={hp.answerLabel}>Secret answer{hinter.answerIsRecycled && ' · rerolled earlier'}</span>
                <span className={hp.answerName}>{hinter.currentAnswer ?? ''}</span>
              </div>
            )}

            {!complete && <CurrentHint game={game} />}

            <section className={hp.bankSection}>
              <div className={hp.bankHead}>
                <h2>Hint Bank</h2>
              </div>
              <BankGrid
                bank={game.bank}
                cap={BANK_CAP}
                cutoff={game.cutoff}
                selected={selection}
                interactive={!complete}
                onToggle={toggleWord}
              />
              {!complete &&
                (full ? (
                  <p className={hp.fullNote}>The bank is full. Give a hint from these words, or end the turn.</p>
                ) : (
                  <div className={hp.addRow}>
                    <input
                      className={hp.addInput}
                      value={draft}
                      maxLength={24}
                      placeholder="Add a word to the bank"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button type="button" className={hp.add} onClick={handleAdd} disabled={draft.trim() === ''}>
                      Add
                    </button>
                  </div>
                ))}
            </section>

            {complete ? (
              <div className={hp.actions}>
                <p className={hp.resolvePrompt}>All {game.answersPerGame} answers are in. Review the board, then continue.</p>
                <button type="button" className={hp.primary} onClick={() => onSend({ type: 'finishTurn' })}>
                  Continue
                </button>
              </div>
            ) : (
              <div className={hp.actions}>
                <button type="button" className={hp.primary} onClick={handleGive} disabled={selection.length === 0}>
                  Give hint
                </button>
                <div className={hp.escapes}>
                  <button type="button" className={hp.secondary} onClick={() => hinter.canReroll && onSend({ type: 'reroll' })} disabled={!hinter.canReroll}>
                    Reroll
                  </button>
                  <button type="button" className={hp.danger} onClick={() => hinter.canEndTurn && onSend({ type: 'endTurn' })} disabled={!hinter.canEndTurn}>
                    Bank full? End turn
                  </button>
                </div>
              </div>
            )}

            <div className={g.leaveRow}>
              {/* The streamer case: about to hint, put the neutral board in the
                  capture. Opens a spectator tab; the code never shows here. */}
              <button type="button" className={g.boardView} onClick={() => openBoardView(edition.id, view.code)}>
                Open board view
              </button>
              <button type="button" className={g.leave} onClick={onLeave}>
                Leave room
              </button>
            </div>
          </div>

          {/* The feed lives in the sidebar here, not the main column: the hinter's
              control stack is tall already, and a growing feed under it would push
              the bottom scoreboard off screen. */}
          <div className={hp.results}>
            <MpLanded view={view} game={game} avatars={avatars} />
            <GuessFeed view={view} game={game} avatars={avatars} />
          </div>
        </div>
      </div>

      <MpScoreStrip view={view} avatars={avatars} game={game} />
    </div>
  )
}
