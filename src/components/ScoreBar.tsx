import { guesserScore, type GameState } from '../engine'
import Avatar from './Avatar'
import type { Player } from '../types'
import styles from './ScoreBar.module.css'

interface Props {
  roster: Player[]
  totals: Record<string, number>
  hinterId: string | null
  game: GameState | null
}

export default function ScoreBar({ roster, totals, hinterId, game }: Props) {
  return (
    <div className={styles.bar} aria-label="Player scores">
      {roster.map((p) => {
        const isHinter = p.id === hinterId
        const base = totals[p.id] ?? 0
        // Guessers tick up live as they land answers this turn. The hinter's total
        // only changes once the turn is recorded, so it stays at the session base
        // and shows a pending "+ ?" while the turn is in progress.
        const total = isHinter || !game ? base : base + guesserScore(game, p.id)
        const pending = isHinter && game !== null
        return (
          <div key={p.id} className={isHinter ? styles.hinter : styles.chip}>
            <span className={styles.avatar}>
              <Avatar avatar={p.avatar} size={24} />
            </span>
            <span className={styles.info}>
              <span className={styles.name}>
                {p.name}
                {isHinter && <span className={styles.badge}>Hinter</span>}
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
