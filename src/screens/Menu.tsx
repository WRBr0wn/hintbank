import { EDITIONS } from '../editions'
import styles from './Menu.module.css'

// The top of the flow: one tile per edition. Live tiles launch into the existing
// Setup -> game flow; soon tiles render disabled with a "soon" marker, the same
// pattern the category picker uses. Selecting hands back the edition id, never an
// index or the object, so the active edition is always looked up by id.
export default function Menu({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className={styles.menu}>
      <p className={styles.lead}>Pick an edition to play.</p>
      <div className={styles.grid}>
        {EDITIONS.map((e) => {
          const live = e.status === 'live'
          return (
            <button
              key={e.id}
              type="button"
              className={live ? styles.tile : styles.tileSoon}
              disabled={!live}
              onClick={() => live && onSelect(e.id)}
            >
              <span className={styles.name}>
                {e.displayName}
                {!live && <span className={styles.soon}>soon</span>}
              </span>
              <span className={styles.tagline}>{e.tagline}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
