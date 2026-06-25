import type { BankEntry } from '../engine'
import styles from './BankGrid.module.css'

interface Props {
  bank: BankEntry[]
  cap: number
  selected: number[]
  interactive: boolean
  onToggle: (index: number) => void
}

// Colour is the giver's fuel gauge: each filled slot is -1, so the bands track
// 25 − bank.length. Green while healthy, escalating yellow → orange → red as the
// score nears 0 at slot 25, then neutral grey for the negative-score slots beyond.
function bandFor(i: number): string {
  if (i < 10) return styles.bandGreen
  if (i < 15) return styles.bandYellow
  if (i < 20) return styles.bandOrange
  if (i < 25) return styles.bandRed
  return styles.bandGrey
}

export default function BankGrid({ bank, cap, selected, interactive, onToggle }: Props) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: cap }, (_, i) => {
        const entry = bank[i]
        const band = bandFor(i)

        if (!entry) {
          return <span key={i} className={`${styles.empty} ${band}`} aria-hidden />
        }

        if (entry.kind === 'reroll') {
          return (
            <span
              key={i}
              className={`${styles.marker} ${band}`}
              title="Reroll marker — cannot be used as a hint word"
            >
              ↻
            </span>
          )
        }

        const isOn = selected.includes(i)
        return (
          <button
            key={i}
            type="button"
            className={`${isOn ? styles.wordOn : styles.word} ${band}`}
            disabled={!interactive}
            aria-pressed={isOn}
            onClick={() => onToggle(i)}
          >
            {entry.word}
          </button>
        )
      })}
    </div>
  )
}
