import type { BankEntry } from '../engine'
import styles from './BankGrid.module.css'

interface Props {
  bank: BankEntry[]
  cap: number
  selected: number[]
  interactive: boolean
  onToggle: (index: number) => void
}

// Colour is the hinter's fuel gauge. Each filled slot is -1, so the bands track
// 25 minus bank.length: green while healthy, then yellow, orange, and red as the
// score nears 0 at slot 25, then grey for the negative-score slots past it.
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
              title="Reroll marker, cannot be used as a hint word"
            >
              ↻
            </span>
          )
        }

        const pos = selected.indexOf(i)
        const isOn = pos !== -1
        // Number the words by pick order, but only when order is meaningful (2+
        // selected). selected is already in click order, so pos + 1 is the rank.
        const order = isOn && selected.length >= 2 ? pos + 1 : null
        return (
          <button
            key={i}
            type="button"
            className={`${isOn ? styles.wordOn : styles.word} ${band}`}
            disabled={!interactive}
            aria-pressed={isOn}
            onClick={() => onToggle(i)}
          >
            {order !== null && (
              <span className={styles.order} aria-hidden>
                {order}
              </span>
            )}
            {entry.word}
          </button>
        )
      })}
    </div>
  )
}
