import Avatar from '../components/Avatar'
import { avatarOf, playerSeats, seatById, type ScreenProps } from './roomScreen'
import styles from './Interstitial.module.css'

// Between turns, replacing PassToHinter. Every device shows who is up; the
// incoming hinter confirms readiness from their own device (which deals the
// turn), and the host can skip an absent one.
export default function Interstitial({ view, seatId, avatars, onSend, onLeave }: ScreenProps) {
  const upNextId = view.session?.upNext ?? null
  const hinter = seatById(view, upNextId)
  const isHost = view.hostId === seatId
  const youAreUp = upNextId === seatId

  const total = playerSeats(view).length
  const remaining = view.session?.queue.length ?? 0
  const position = total - remaining + 1

  if (!hinter) {
    return (
      <div className={styles.screen}>
        <p className={styles.warn}>Waiting for the next turn…</p>
        <button type="button" className={styles.leave} onClick={onLeave}>
          Leave room
        </button>
      </div>
    )
  }

  const dropped = hinter.connection === 'reconnecting'

  return (
    <div className={styles.screen}>
      <p className={styles.kicker}>
        Hinter {position} of {total}
      </p>
      <div className={styles.avatar}>
        <Avatar avatar={avatarOf(avatars, hinter)} round />
      </div>

      {youAreUp ? (
        <>
          <h2 className={styles.name}>You're hinting next</h2>
          <p className={styles.note}>Everyone else guesses out loud. Start when you're ready.</p>
          <button type="button" className={styles.ready} onClick={() => onSend({ type: 'ready' })}>
            I'm ready, deal my answers
          </button>
        </>
      ) : (
        <>
          <h2 className={styles.name}>{hinter.name} is hinting next</h2>
          <p className={styles.note}>{dropped ? `${hinter.name} is reconnecting…` : `Waiting for ${hinter.name} to start.`}</p>
        </>
      )}

      {isHost && !youAreUp && (
        <button type="button" className={styles.skip} onClick={() => onSend({ type: 'skipHinter' })}>
          Skip {hinter.name}
        </button>
      )}

      <button type="button" className={styles.leave} onClick={onLeave}>
        Leave room
      </button>
    </div>
  )
}
