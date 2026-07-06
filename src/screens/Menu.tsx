import type { CSSProperties } from 'react'
import { EDITIONS, type Edition } from '../editions'
import EditionTileBody from '../components/EditionTileBody'
import styles from './Menu.module.css'
import tiles from '../components/EditionTiles.module.css'

const tileAccent = (e: Edition) =>
  e.look ? ({ '--tile-accent': e.look.accent } as CSSProperties) : undefined

// Selecting hands back the edition id, never an index or the object, so the
// active edition is always looked up by id.
export default function Menu({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className={styles.menu}>
      <p className={styles.tagline}>One hinter, a bank of 40 words, and everyone else guessing.</p>
      <p className={styles.lead}>Choose an edition</p>
      <div className={tiles.grid}>
        {EDITIONS.map((e) => {
          const live = e.status === 'live'
          return (
            <button
              key={e.id}
              type="button"
              className={live ? tiles.tile : tiles.tileSoon}
              style={tileAccent(e)}
              disabled={!live}
              onClick={() => onSelect(e.id)}
            >
              <EditionTileBody edition={e} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
