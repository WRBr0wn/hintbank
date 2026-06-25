import {
  END_TURN_PENALTY,
  GIVER_BASE,
  giverScore,
  guesserScore,
  type GameState,
} from '../engine'
import type { Player } from '../types'
import styles from './GameSummary.module.css'

interface Props {
  game: GameState
  roster: Player[]
  onContinue: () => void
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

export default function GameSummary({ game, roster, onContinue }: Props) {
  const giver = roster.find((p) => p.id === game.giverId)
  const guessers = roster.filter((p) => p.id !== game.giverId)

  const hintLabel = `${game.hintCount} ${game.hintCount === 1 ? 'hint' : 'hints'}`
  const breakdown = `${GIVER_BASE} − ${hintLabel}${game.endedEarly ? ` − ${END_TURN_PENALTY} (ended early)` : ''}`

  return (
    <div className={styles.summary}>
      <p className={styles.kicker}>Turn complete</p>

      <div className={styles.giverCard}>
        <span className={styles.giverName}>
          {giver?.avatar} {giver?.name}
        </span>
        <span className={styles.giverScore}>{giverScore(game)}</span>
        <span className={styles.breakdown}>{breakdown}</span>
      </div>

      <ul className={styles.guessers}>
        {guessers.map((p) => {
          const correct = game.correctGuesses[p.id] ?? 0
          const over = game.overguesses[p.id] ?? 0
          return (
            <li key={p.id} className={styles.guesser}>
              <span className={styles.gName}>
                {p.avatar} {p.name}
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
