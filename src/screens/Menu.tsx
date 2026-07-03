import { EDITIONS } from '../editions'
import styles from './Menu.module.css'
import tiles from '../components/EditionTiles.module.css'

// The top of the flow: one tile per edition. Live tiles launch into the existing
// Setup -> game flow; soon tiles render disabled with a "soon" marker, the same
// pattern the category picker uses. Selecting hands back the edition id, never an
// index or the object, so the active edition is always looked up by id.
export default function Menu({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className={styles.menu}>
      <p className={styles.lead}>Pick an edition to play.</p>
      <div className={tiles.grid}>
        {EDITIONS.map((e) => {
          const live = e.status === 'live'
          return (
            <button
              key={e.id}
              type="button"
              className={live ? tiles.tile : tiles.tileSoon}
              disabled={!live}
              onClick={() => onSelect(e.id)}
            >
              <span className={tiles.name}>
                {e.displayName}
                {!live && <span className={tiles.soon}>soon</span>}
              </span>
              <span className={tiles.tagline}>{e.tagline}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
