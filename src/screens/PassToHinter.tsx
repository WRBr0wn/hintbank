import Avatar from '../components/Avatar'
import type { GameMode } from '../engine'
import type { Player } from '../types'
import styles from './PassToHinter.module.css'

interface Props {
  hinter: Player
  position: number
  total: number
  mode: GameMode
  onReady: () => void
}

export default function PassToHinter({ hinter, position, total, mode, onReady }: Props) {
  // Randomizer runs on a shared screen with the host driving, so there is no
  // device to pass and nothing to hide. It gets a plain turn marker instead.
  const hosted = mode === 'online-randomizer'
  return (
    <div className={styles.screen}>
      <p className={styles.kicker}>
        Hinter {position} of {total}
      </p>
      <div className={styles.avatar}>
        <Avatar avatar={hinter.avatar} />
      </div>
      {hosted ? (
        <>
          <h2 className={styles.name}>{hinter.name} is now hinting</h2>
          <p className={styles.warn}>The whole board is public, so everyone can follow along.</p>
          <button type="button" className={styles.reveal} onClick={onReady}>
            Start {hinter.name}'s turn
          </button>
        </>
      ) : (
        <>
          <h2 className={styles.name}>Pass the device to {hinter.name}</h2>
          <p className={styles.warn}>Everyone else, look away, the answers are secret.</p>
          <button type="button" className={styles.reveal} onClick={onReady}>
            I'm {hinter.name}, begin!
          </button>
        </>
      )}
    </div>
  )
}
