import type { Player } from '../types'
import styles from './PassToHinter.module.css'

interface Props {
  hinter: Player
  position: number
  total: number
  onReady: () => void
}

export default function PassToHinter({ hinter, position, total, onReady }: Props) {
  return (
    <div className={styles.screen}>
      <p className={styles.kicker}>
        Hinter {position} of {total}
      </p>
      <div className={styles.avatar}>{hinter.avatar}</div>
      <h2 className={styles.name}>Pass the device to {hinter.name}</h2>
      <p className={styles.warn}>Everyone else, look away, the answers are secret.</p>
      <button type="button" className={styles.reveal} onClick={onReady}>
        I'm {hinter.name}, begin!
      </button>
    </div>
  )
}
