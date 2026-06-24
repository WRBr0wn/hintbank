import type { Player } from '../types'
import styles from './PassToGiver.module.css'

interface Props {
  giver: Player
  position: number
  total: number
  onReady: () => void
}

export default function PassToGiver({ giver, position, total, onReady }: Props) {
  return (
    <div className={styles.screen}>
      <p className={styles.kicker}>
        Giver {position} of {total}
      </p>
      <div className={styles.avatar}>{giver.avatar}</div>
      <h2 className={styles.name}>Pass the device to {giver.name}</h2>
      <p className={styles.warn}>Everyone else, look away — the answers are secret.</p>
      <button type="button" className={styles.reveal} onClick={onReady}>
        I'm {giver.name} — show my answers
      </button>
    </div>
  )
}
