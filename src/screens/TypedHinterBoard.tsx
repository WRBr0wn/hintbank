import { useState } from 'react'
import BankGrid from '../components/BankGrid'
import MpScoreStrip from './MpScoreStrip'
import MpLanded from './MpLanded'
import GuessFeed from './GuessFeed'
import { type ScreenProps } from './roomScreen'
import { BANK_CAP } from '../engine'
import hp from './HinterPlay.module.css'
import g from './Game.module.css'

// The typed-guess hinter board: the stripped board. The hinter builds the bank
// and rerolls, and that is all; there is no give-hint or resolve control because
// the server adjudicates typed guesses (submitGuess), so this board carries no
// adjudication. Driven by the hinter's own view (which alone holds the current
// answer and the capability flags), it holds no game state, only the add-word
// draft. No typo-editing: canEditMode is false in multiplayer. The device is
// private, so the answer shows plainly.
export default function TypedHinterBoard({ view, avatars, onSend, onLeave }: ScreenProps) {
  const game = view.game!
  const hinter = view.hinter!
  const [draft, setDraft] = useState('')

  const complete = game.status === 'complete'
  const full = game.bank.length >= BANK_CAP

  function handleAdd() {
    const word = draft.trim()
    if (!word || !hinter.canAddWord) return
    onSend({ type: 'addWord', word })
    setDraft('')
  }

  return (
    <div className={g.screen}>
      <div className={g.scroll}>
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
              <BankGrid bank={game.bank} cap={BANK_CAP} cutoff={game.cutoff} selected={[]} interactive={false} onToggle={() => {}} />
              {!complete &&
                (full ? (
                  <p className={hp.fullNote}>The bank is full. Guessers land the rest, or end the turn.</p>
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
            ) : (
              <div className={hp.actions}>
                <p className={hp.resolvePrompt}>Guessers pick the answers. You just feed and reroll the bank.</p>
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

            <GuessFeed view={view} game={game} avatars={avatars} />

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
