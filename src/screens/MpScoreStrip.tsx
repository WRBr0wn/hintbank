import Avatar from '../components/Avatar'
import { avatarOf, playerSeats, seatScore } from './roomScreen'
import type { PublicGameView, RoomView } from '../protocol'
import type { PlayerAvatar } from '../types'
import styles from './Game.module.css'

// The live score row, the multiplayer analogue of the local ScoreBar, built
// from the view. Guessers tick up as they land answers this turn; the hinter's
// session total holds until the turn is recorded, showing a pending "+ ?" while
// playing and the resolved delta on the completed board.
export default function MpScoreStrip({
  view,
  avatars,
  game,
}: {
  view: RoomView
  avatars: PlayerAvatar[]
  game: PublicGameView | null
}) {
  return (
    <div className={styles.scoreStrip} aria-label="Player scores">
      {playerSeats(view).map((seat) => {
        const { total, isHinter, pending, delta } = seatScore(view, game, seat.id)
        const dropped = seat.connection === 'reconnecting'
        return (
          <div
            key={seat.id}
            className={`${isHinter ? styles.scoreHinter : styles.scoreChip} ${dropped ? styles.scoreDropped : ''}`}
          >
            <Avatar avatar={avatarOf(avatars, seat)} size={30} />
            <span className={styles.scoreInfo}>
              <span className={styles.scoreName}>
                {seat.name}
                {isHinter && <span className={styles.badge}>Hinter</span>}
                {dropped && <span className={styles.presenceTag}>·off</span>}
              </span>
              <span className={styles.scoreTotal}>
                {total}
                {pending && <span className={styles.scorePending}> + ?</span>}
                {delta !== null && (
                  <span className={styles.scorePending}>{` ${delta < 0 ? '−' : '+'} ${Math.abs(delta)}`}</span>
                )}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
