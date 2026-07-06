import type { CSSProperties } from 'react'
import { EDITIONS, randomizerPath, type Edition } from '../editions'
import ThemeToggle from '../components/ThemeToggle'
import EditionTileBody from '../components/EditionTileBody'
import page from './Randomizer.module.css'
import tiles from '../components/EditionTiles.module.css'

const tileAccent = (e: Edition) =>
  e.look ? ({ '--tile-accent': e.look.accent } as CSSProperties) : undefined

// The bare /randomizer/ page: an edition selector that mirrors the main menu. Live
// editions link to their own randomizer page; soon editions render disabled, the
// same tile pattern the menu uses.
export default function RandomizerMenu() {
  return (
    <div className={`${page.page} ${page.selector}`}>
      <ThemeToggle />
      <header className={page.header}>
        <h1 className={page.brand}>
          Hint <span className={page.brandAccent}>Bank</span>
        </h1>
        <p className={page.complete}>Complete</p>
        <p className={page.kicker}>Randomizer · Choose an edition</p>
      </header>

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
            <a key={e.id} className={tiles.tile} style={tileAccent(e)} href={randomizerPath(e.id)}>
              <EditionTileBody edition={e} />
            </a>
          )
        })}
      </div>
    </div>
  )
}
