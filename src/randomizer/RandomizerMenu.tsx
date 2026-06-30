import { EDITIONS, randomizerPath } from '../editions'
import ThemeToggle from '../components/ThemeToggle'
import page from './Randomizer.module.css'
import menu from '../screens/Menu.module.css'

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

      <div className={menu.grid}>
        {EDITIONS.map((e) => {
          if (e.status !== 'live') {
            return (
              <div key={e.id} className={menu.tileSoon} aria-disabled="true">
                <span className={menu.name}>
                  {e.displayName}
                  <span className={menu.soon}>soon</span>
                </span>
                <span className={menu.tagline}>{e.tagline}</span>
              </div>
            )
          }
          return (
            <a key={e.id} className={menu.tile} href={randomizerPath(e.id)}>
              <span className={menu.name}>{e.displayName}</span>
              <span className={menu.tagline}>{e.tagline}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
