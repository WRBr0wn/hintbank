import Avatar from '../components/Avatar'
import { avatarOf, seatById, type ScreenProps } from './roomScreen'
import { feedRows } from './typedGuess'
import type { PublicGameView } from '../protocol'
import styles from './TypedGuess.module.css'

// The live guess feed: who picked what and whether it landed, newest first. A
// projection of the view's public feed, so it is safe for every seat (a wrong
// pick is not the answer; a correct pick appears only as it lands) and for
// streaming, the same construction as the guesser board.
export default function GuessFeed({
  view,
  game,
  avatars,
}: {
  view: ScreenProps['view']
  game: PublicGameView
  avatars: ScreenProps['avatars']
}) {
  const rows = feedRows(game.feed, view.seats)

  return (
    <section className={styles.feed}>
      <h2 className={styles.feedHead}>Guesses</h2>
      {rows.length === 0 ? (
        <p className={styles.feedEmpty}>No guesses yet.</p>
      ) : (
        <ul className={styles.feedList}>
          {rows.map((row) => {
            const seat = seatById(view, row.guesserId)
            return (
              <li key={row.key} className={row.correct ? `${styles.feedRow} ${styles.feedHit}` : styles.feedRow}>
                <span className={styles.feedAvatar}>{seat && <Avatar avatar={avatarOf(avatars, seat)} size={20} />}</span>
                <span className={styles.feedName}>{row.name}</span>
                <span className={styles.feedTerm}>{row.term}</span>
                <span className={styles.feedMark}>{row.correct ? 'landed' : 'miss'}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
