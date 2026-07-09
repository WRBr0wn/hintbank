import { leaders, type SessionState } from '../engine'
import Avatar from '../components/Avatar'
import type { Player } from '../types'
import styles from './Leaderboard.module.css'

interface Props {
  session: SessionState
  roster: Player[]
  onContinue: () => void
  onPlayAgain: () => void
  onChangeSettings: () => void
}

export default function Leaderboard({ session, roster, onContinue, onPlayAgain, onChangeSettings }: Props) {
  const crowned = new Set(leaders(session))
  const ranked = [...roster].sort(
    (a, b) => (session.totals[b.id] ?? 0) - (session.totals[a.id] ?? 0),
  )
  const rotations = session.completedRotations

  return (
    <div className={styles.board}>
      <p className={styles.kicker}>
        {rotations} {rotations === 1 ? 'rotation' : 'rotations'} played
      </p>
      <h2 className={styles.title}>Leaderboard</h2>

      <ol className={styles.list}>
        {ranked.map((p) => {
          const total = session.totals[p.id] ?? 0
          const isLeader = crowned.has(p.id)
          return (
            <li key={p.id} className={isLeader ? styles.leader : styles.row}>
              <span className={styles.crown}>{isLeader ? '👑' : ''}</span>
              <span className={styles.avatar}>
                <Avatar avatar={p.avatar} size={26} />
              </span>
              <span className={styles.name}>{p.name}</span>
              <span className={styles.total}>{total}</span>
            </li>
          )
        })}
      </ol>

      <div className={styles.actions}>
        <div className={styles.action}>
          <button type="button" className={styles.continue} onClick={onContinue}>
            Continue
          </button>
          <p className={styles.actionDesc}>Keep the scores and play another rotation.</p>
        </div>
        <div className={styles.action}>
          <button type="button" className={styles.playAgain} onClick={onPlayAgain}>
            Play Again
          </button>
          <p className={styles.actionDesc}>New game now, same players and settings, scores back to 0.</p>
        </div>
        <div className={styles.action}>
          <button type="button" className={styles.startOver} onClick={onChangeSettings}>
            Change Settings
          </button>
          <p className={styles.actionDesc}>Back to setup to change players or settings, scores back to 0.</p>
        </div>
      </div>
    </div>
  )
}
