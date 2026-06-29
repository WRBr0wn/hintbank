import { useLayoutEffect, useRef } from 'react'
import type { BankEntry } from '../engine'
import styles from './BankGrid.module.css'

interface Props {
  bank: BankEntry[]
  cap: number
  // The clue cutoff (the hinter's starting score, game.hinterBase). The colour
  // bands scale to it so the gauge reads true at any difficulty/answer-count.
  cutoff: number
  selected: number[]
  interactive: boolean
  onToggle: (index: number) => void
}

// A long word shrinks its own font down to this floor before wrapping to two
// lines, so short words stay big and only long ones scale down.
const MIN_FONT_REM = 0.6
// The selected weight (.wordOn). Words are measured at this weight, the widest
// case, so a word's fitted size is the same selected or not (no reflow on click).
const BOLD_WEIGHT = 600
// Tiny guard against sub-pixel rounding only. The bold-weight allowance now comes
// from measuring at BOLD_WEIGHT, so this stays close to 1.
const FIT_SAFETY = 0.98

// Sizes one bank word to its cell: keeps the CSS base size when the word fits,
// shrinks the font when it does not, and only wraps to two lines once it hits the
// floor (rather than clipping with an ellipsis). A ResizeObserver re-fits when the
// cell width changes, so it tracks window resizes and the wider cells at the
// desktop breakpoints. Re-measuring on mount and text change means a word added
// mid-turn is fitted right away.
function FitText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const cell = el?.parentElement
    if (!el || !cell) return

    const fit = () => {
      // Start from the CSS base size (responsive) on a single line. Measure at the
      // selected (bold) weight, the widest case, so the fit is stable across
      // selection; then restore the cell's own weight for display.
      el.style.fontSize = ''
      el.style.whiteSpace = 'nowrap'
      el.style.fontWeight = String(BOLD_WEIGHT)
      const cs = getComputedStyle(cell)
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      const avail = (cell.clientWidth - padX) * FIT_SAFETY
      const natural = el.scrollWidth
      const base = parseFloat(getComputedStyle(el).fontSize)
      el.style.fontWeight = ''
      if (avail <= 0 || natural <= avail) return // fits at the base size

      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const floor = MIN_FONT_REM * rootPx
      // Word width scales about linearly with font size, so this is the size that
      // fits the word on one line at the bold weight.
      const oneLine = base * (avail / natural)
      if (oneLine >= floor) {
        // Shrink to a single line. Sized for bold, so the line count does not change
        // when the word gains or loses the selected weight.
        el.style.fontSize = `${oneLine}px`
      } else {
        // Too long to read on one line. Wrap to two lines, sized so the bold word
        // fills two lines; the narrower normal weight then also wraps to two lines,
        // so selecting the word never reflows it from one line to two.
        const twoLine = Math.min(base, base * ((2 * avail) / natural))
        el.style.fontSize = `${Math.max(floor, twoLine)}px`
        el.style.whiteSpace = 'normal'
      }
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(cell)
    return () => observer.disconnect()
  }, [text])

  return (
    <span ref={ref} className={styles.fit}>
      {text}
    </span>
  )
}

// Colour is the hinter's fuel gauge. Every filled slot is -1, so the score reaches
// zero at the cutoff (the hinter's starting score). The four colour bands span
// slots 0 -> cutoff, with red landing on the last slots right at the cutoff; slots
// past it are negative-score territory and go grey. The breakpoints scale with the
// cutoff (40/60/80/100%), so a cutoff of 25 reproduces the original 10/15/20/25
// bands exactly and any other cutoff rescales the ramp to match.
function bandFor(i: number, cutoff: number): string {
  if (i >= cutoff) return styles.bandGrey
  if (i < Math.round(cutoff * 0.4)) return styles.bandGreen
  if (i < Math.round(cutoff * 0.6)) return styles.bandYellow
  if (i < Math.round(cutoff * 0.8)) return styles.bandOrange
  return styles.bandRed
}

export default function BankGrid({ bank, cap, cutoff, selected, interactive, onToggle }: Props) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: cap }, (_, i) => {
        const entry = bank[i]
        const band = bandFor(i, cutoff)

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
            <FitText text={entry.word} />
          </button>
        )
      })}
    </div>
  )
}
