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
  // Both online modes run on a shared screen, so the answer is protected by the
  // play screen (hold-to-reveal or host-typed), not by passing the device away.
  // They get a neutral turn marker; only in-person keeps the secrecy framing.
  const hosted = mode === 'online-randomizer' || mode === 'online-one-device'
  const hostedNote =
    mode === 'online-one-device'
      ? 'Hold the answer to reveal it, so the screen stays safe to share.'
      : 'The whole board is public, so everyone can follow along.'
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
          <p className={styles.warn}>{hostedNote}</p>
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
