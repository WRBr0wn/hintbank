import type { CreditLine, EditionCredits } from '../editions'
import styles from './Footer.module.css'

// All wording comes from the edition, so the footer carries no edition-specific
// text of its own.
function Line({ line, className }: { line: CreditLine; className: string }) {
  return (
    <p className={className}>
      {line.lead}
      {line.link && (
        <a className={styles.link} href={line.link.href} target="_blank" rel="noopener noreferrer">
          {line.link.label}
        </a>
      )}
      {line.trail}
    </p>
  )
}

export default function Footer({ credits }: { credits: EditionCredits }) {
  return (
    <footer className={styles.footer}>
      {credits.disclaimer && <p className={styles.disclaimer}>{credits.disclaimer}</p>}
      {credits.attribution.map((line, i) => (
        <Line key={i} line={line} className={styles.line} />
      ))}
      {credits.production && <Line line={credits.production} className={styles.credit} />}
    </footer>
  )
}
