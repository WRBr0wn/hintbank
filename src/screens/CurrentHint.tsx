import type { PublicGameView } from '../protocol'
import styles from './TypedGuess.module.css'

// The live hint on every board: the bank words the hinter selected, shown in the
// order they picked them with order numbers, so guessers see what they are
// naming. A projection of the view's currentHint (bank word indices, never the
// answer). Renders nothing when no hint is open; the board shows its own waiting
// state.
export default function CurrentHint({ game }: { game: PublicGameView }) {
  const hint = game.currentHint
  if (!hint || hint.length === 0) return null
  return (
    <div className={styles.hint}>
      <span className={styles.hintLabel}>Current hint</span>
      <ol className={styles.hintWords}>
        {hint.map((i, n) => {
          const entry = game.bank[i]
          const word = entry && entry.kind === 'word' ? entry.word : '?'
          return (
            <li key={n} className={styles.hintWord}>
              <span className={styles.hintNum}>{n + 1}</span>
              {word}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
