import type { BankEntry } from '../engine'
import styles from './BankGrid.module.css'

interface Props {
  bank: BankEntry[]
  cap: number
  selected: number[]
  interactive: boolean
  onToggle: (index: number) => void
}

export default function BankGrid({ bank, cap, selected, interactive, onToggle }: Props) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: cap }, (_, i) => {
        const entry = bank[i]

        if (!entry) {
          return <span key={i} className={styles.empty} aria-hidden />
        }

        if (entry.kind === 'reroll') {
          return (
            <span key={i} className={styles.marker} title="Reroll marker — cannot be used as a hint word">
              ↻
            </span>
          )
        }

        const isOn = selected.includes(i)
        return (
          <button
            key={i}
            type="button"
            className={isOn ? styles.wordOn : styles.word}
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
