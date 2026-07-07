import type { CSSProperties } from 'react'
import { EDITIONS, gamePath, type Edition } from '../editions'
import EditionTileBody from '../components/EditionTileBody'
import styles from './Menu.module.css'
import tiles from '../components/EditionTiles.module.css'

const tileAccent = (e: Edition) =>
  e.look ? ({ '--tile-accent': e.look.accent } as CSSProperties) : undefined

// Live editions link to their own game page; soon editions render disabled, the
// same tile pattern the randomizer selector uses.
export default function Menu() {
  return (
    <div className={styles.menu}>
      <p className={styles.tagline}>One hinter, a bank of 40 words, and everyone else guessing.</p>
      <p className={styles.lead}>Choose an edition</p>
      <div className={tiles.grid}>
        {EDITIONS.map((e) => {
          if (e.status !== 'live') {
            return (
              <div key={e.id} className={tiles.tileSoon} style={tileAccent(e)} aria-disabled="true">
                <EditionTileBody edition={e} />
              </div>
            )
          }
          return (
            <a key={e.id} className={tiles.tile} style={tileAccent(e)} href={gamePath(e.id)}>
              <EditionTileBody edition={e} />
            </a>
          )
        })}
      </div>
    </div>
  )
}
