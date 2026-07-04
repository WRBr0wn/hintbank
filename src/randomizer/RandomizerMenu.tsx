import { EDITIONS, randomizerPath } from '../editions'
import ThemeToggle from '../components/ThemeToggle'
import page from './Randomizer.module.css'
import tiles from '../components/EditionTiles.module.css'

// The bare /randomizer/ page: an edition selector that mirrors the main menu. Live
// editions link to their own randomizer page; soon editions render disabled, the
// same tile pattern the menu uses.
export default function RandomizerMenu() {
  return (
    <div className={page.page}>
      <ThemeToggle />
      <header className={page.header}>
        <h1>Hint Bank · Randomizer</h1>
        <p className={page.kicker}>Choose an edition</p>
      </header>

      <div className={tiles.grid}>
        {EDITIONS.map((e) => {
          if (e.status !== 'live') {
            return (
              <div key={e.id} className={tiles.tileSoon} aria-disabled="true">
                <span className={tiles.name}>
                  {e.displayName}
                  <span className={tiles.soon}>soon</span>
                </span>
                <span className={tiles.tagline}>{e.tagline}</span>
              </div>
            )
          }
          return (
            <a key={e.id} className={tiles.tile} href={randomizerPath(e.id)}>
              <span className={tiles.name}>{e.displayName}</span>
              <span className={tiles.tagline}>{e.tagline}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
