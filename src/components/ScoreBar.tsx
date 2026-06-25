import { guesserScore, type GameState } from '../engine'
import type { Player } from '../types'
import styles from './ScoreBar.module.css'

interface Props {
  roster: Player[]
  totals: Record<string, number>
  giverId: string | null
  game: GameState | null
}

export default function ScoreBar({ roster, totals, giverId, game }: Props) {
  return (
    <div className={styles.bar} aria-label="Player scores">
      {roster.map((p) => {
        const isGiver = p.id === giverId
        const base = totals[p.id] ?? 0
        // Guessers tick up live as they land answers this turn; the giver's total
        // only moves once the turn is recorded, so it stays at the session base —
        // shown with a pending "+ ?" while their turn is in progress.
        const total = isGiver || !game ? base : base + guesserScore(game, p.id)
        const pending = isGiver && game !== null
        return (
          <div key={p.id} className={isGiver ? styles.giver : styles.chip}>
            <span className={styles.avatar}>{p.avatar}</span>
            <span className={styles.info}>
              <span className={styles.name}>
                {p.name}
                {isGiver && <span className={styles.badge}>Hinter</span>}
              </span>
              <span className={styles.total}>
                {total}
                {pending && <span className={styles.pending}> + ?</span>}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
