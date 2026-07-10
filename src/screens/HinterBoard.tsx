import { useState } from 'react'
import Avatar from '../components/Avatar'
import BankGrid from '../components/BankGrid'
import MpScoreStrip from './MpScoreStrip'
import MpLanded from './MpLanded'
import { avatarOf, playerSeats, type ScreenProps } from './roomScreen'
import { BANK_CAP } from '../engine'
import hp from './HinterPlay.module.css'
import g from './Game.module.css'

// The networked hinter screen: functionally the local HinterPlay, but driven by
// the hinter's own view (which carries the current answer and the capability
// flags) and sending intents. It holds no game state, only ephemeral UI (the
// word selection, the add-word draft, the overguess tally); the server resolves
// every action and the next snapshot re-renders. No typo-editing: canEditMode
// is false in multiplayer. The hinter's device is private, so the answer shows
// plainly.
export default function HinterBoard({ view, connection, avatars, onSend, onLeave }: ScreenProps) {
  const game = view.game!
  const hinter = view.hinter!
  const [selection, setSelection] = useState<number[]>([])
  const [draft, setDraft] = useState('')
  const [overguess, setOverguess] = useState<Record<string, number>>({})

  const hinting = game.phase === 'hinting'
  const resolving = game.phase === 'resolving'
  const complete = game.status === 'complete'
  const full = game.bank.length >= BANK_CAP
  const guessers = playerSeats(view).filter((s) => s.id !== game.hinterId)

  function toggleWord(i: number) {
    setSelection((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
  }

  function handleAdd() {
    const word = draft.trim()
    if (!word || !hinter.canAddWord) return
    onSend({ type: 'addWord', word })
    setDraft('')
  }

  function handleGive() {
    if (selection.length === 0) return
    onSend({ type: 'giveHint', selection })
    setSelection([])
  }

  function resolveWith(correctGuesserId?: string) {
    onSend({ type: 'resolve', outcome: correctGuesserId ? { correctGuesserId, overguesses: overguess } : { overguesses: overguess } })
    setOverguess({})
    setSelection([])
  }

  function handleReroll() {
    if (!hinter.canReroll) return
    onSend({ type: 'reroll' })
    setSelection([])
  }

  function handleEndTurn() {
    if (hinter.canEndTurn) onSend({ type: 'endTurn' })
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

            <section className={hp.bankSection}>
              <div className={hp.bankHead}>
                <h2>Hint Bank</h2>
              </div>
              <BankGrid
                bank={game.bank}
                cap={BANK_CAP}
                cutoff={game.cutoff}
                selected={selection}
                interactive={hinting && !complete}
                onToggle={toggleWord}
              />
              {!complete &&
                (full ? (
                  <p className={hp.fullNote}>The bank is full. Give hints from these words, or end the turn.</p>
                ) : (
                  <div className={hp.addRow}>
                    <input
                      className={hp.addInput}
                      value={draft}
                      maxLength={24}
                      placeholder="Add a word to the bank"
                      disabled={!hinting}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button type="button" className={hp.add} onClick={handleAdd} disabled={!hinter.canAddWord || draft.trim() === ''}>
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
            ) : hinting ? (
              <div className={hp.actions}>
                <button type="button" className={hp.primary} onClick={handleGive} disabled={selection.length === 0}>
                  Give hint
                </button>
                <div className={hp.escapes}>
                  <button type="button" className={hp.secondary} onClick={handleReroll} disabled={!hinter.canReroll}>
                    Reroll
                  </button>
                  <button type="button" className={hp.danger} onClick={handleEndTurn} disabled={!hinter.canEndTurn}>
                    Bank full? End turn
                  </button>
                </div>
              </div>
            ) : resolving ? (
              <div className={hp.resolve}>
                <p className={hp.resolvePrompt}>Who guessed it?</p>
                <ul className={guessers.length >= 5 ? `${hp.guessers} ${hp.guessersGrid}` : hp.guessers}>
                  {guessers.map((seat) => (
                    <li key={seat.id} className={hp.guesser}>
                      <span className={hp.guesserName}>
                        <Avatar avatar={avatarOf(avatars, seat)} size={22} /> {seat.name}
                        {overguess[seat.id] ? <span className={hp.penalty}> −{overguess[seat.id]}</span> : null}
                      </span>
                      <span className={hp.guesserBtns}>
                        <button
                          type="button"
                          className={hp.minus}
                          onClick={() => setOverguess((o) => ({ ...o, [seat.id]: (o[seat.id] ?? 0) + 1 }))}
                          aria-label={`Overguess for ${seat.name}`}
                        >
                          x2 (−1)
                        </button>
                        <button type="button" className={hp.correct} onClick={() => resolveWith(seat.id)}>
                          Correct
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <button type="button" className={hp.secondary} onClick={() => resolveWith()}>
                  Keep Hinting!
                </button>
              </div>
            ) : null}

            <div className={g.leaveRow}>
              <button type="button" className={g.leave} onClick={onLeave}>
                Leave room
              </button>
            </div>
          </div>

          <div className={hp.results}>
            <MpLanded view={view} game={game} avatars={avatars} />
          </div>
        </div>
      </div>

      <MpScoreStrip view={view} avatars={avatars} game={game} />
    </div>
  )
}
