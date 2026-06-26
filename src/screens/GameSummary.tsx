import {
  HINTER_BASE,
  hinterScore,
  guesserScore,
  type GameState,
} from '../engine'
import Avatar from '../components/Avatar'
import type { Player } from '../types'
import styles from './GameSummary.module.css'

interface Props {
  game: GameState
  roster: Player[]
  onContinue: () => void
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

export default function GameSummary({ game, roster, onContinue }: Props) {
  const hinter = roster.find((p) => p.id === game.hinterId)
  const guessers = roster.filter((p) => p.id !== game.hinterId)

  const entries = game.bank.length
  const entryLabel = `${entries} ${entries === 1 ? 'entry' : 'entries'}`
  const breakdown = `${HINTER_BASE} − ${entryLabel}${game.endedEarly ? ' (ended early)' : ''}`

  return (
    <div className={styles.summary}>
      <p className={styles.kicker}>Turn complete</p>

      <div className={styles.hinterCard}>
        <span className={styles.hinterName}>
          {hinter && <Avatar avatar={hinter.avatar} size={24} />} {hinter?.name}
        </span>
        <span className={styles.hinterScore}>{hinterScore(game)}</span>
        <span className={styles.breakdown}>{breakdown}</span>
      </div>

      <ul className={styles.guessers}>
        {guessers.map((p) => {
          const correct = game.correctGuesses[p.id] ?? 0
          const over = game.overguesses[p.id] ?? 0
          return (
            <li key={p.id} className={styles.guesser}>
              <span className={styles.gName}>
                <Avatar avatar={p.avatar} size={22} /> {p.name}
              </span>
              <span className={styles.gDetail}>
                {correct} correct
                {over > 0 && <span className={styles.over}> · −{over} overguess</span>}
              </span>
              <span className={styles.gScore}>{signed(guesserScore(game, p.id))}</span>
            </li>
          )
        })}
      </ul>

      <button type="button" className={styles.continue} onClick={onContinue}>
        Continue
      </button>
    </div>
  )
}
