import BankGrid from '../components/BankGrid'
import MpScoreStrip from './MpScoreStrip'
import MpLanded from './MpLanded'
import CurrentHint from './CurrentHint'
import { seatById, type ScreenProps } from './roomScreen'
import { BANK_CAP } from '../engine'
import hp from './HinterPlay.module.css'
import g from './Game.module.css'
import styles from './TypedGuess.module.css'

// The read-only guesser (and spectator) board: the public slice of the turn.
// A projection of viewFor, which never carries the current answer, the deck, or
// the rerolled pile, so this screen is safe to show and to stream. The hinter
// itself never renders this (it gets HinterBoard); a guesser who is the host
// can end the turn if the hinter has dropped.
export default function GuesserBoard({ view, seatId, avatars, onSend, onLeave }: ScreenProps) {
  const game = view.game!
  const hinter = seatById(view, game.hinterId)
  const hinterDropped = hinter?.connection === 'reconnecting'
  const isHost = view.hostId === seatId
  const complete = game.status === 'complete'
  const hintOpen = game.currentHint != null

  return (
    <div className={g.screen}>
      <div className={g.scroll}>
        <div className={hp.play}>
          <div className={hp.main}>
            <div className={g.whoseTurn}>
              <span className={g.turnName}>
                {hinter ? hinter.name : 'Someone'} <span className={g.hinting}>is hinting</span>
              </span>
              <span className={hp.bankCount}>
                {game.bank.length} / {BANK_CAP}
              </span>
            </div>
            <div className={hp.progress}>
              <span>{complete ? 'Turn complete' : `Answer ${game.resolved + 1} of ${game.answersPerGame}`}</span>
              <span>{game.hintCount} {game.hintCount === 1 ? 'hint' : 'hints'}</span>
            </div>
            <div className={hp.bar}>
              <div className={hp.barFill} style={{ width: `${(game.resolved / game.answersPerGame) * 100}%` }} />
            </div>

            {hinterDropped && (
              <div className={g.banner}>
                <span className={g.bannerText}>{hinter?.name} is reconnecting…</span>
                {isHost && (
                  <button type="button" className={g.endBtn} onClick={() => onSend({ type: 'forceEndTurn' })}>
                    End their turn
                  </button>
                )}
              </div>
            )}

            {/* The live hint, same presentation as the typed guesser board: the
                call carries the hint out loud, the strip and the highlighted bank
                words back it up on which words it used. */}
            {!complete &&
              (hintOpen ? (
                <CurrentHint game={game} />
              ) : (
                <p className={styles.hintWaiting}>{hinter ? hinter.name : 'The hinter'} is choosing a hint…</p>
              ))}

            <section className={hp.bankSection}>
              <div className={hp.bankHead}>
                <h2>Hint Bank</h2>
              </div>
              <BankGrid bank={game.bank} cap={BANK_CAP} cutoff={game.cutoff} selected={game.currentHint ?? []} interactive={false} onToggle={() => {}} />
              <p className={hp.fullNote}>Guess out loud from these words. First correct guess lands the answer.</p>
            </section>

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
