import { useState } from 'react'
import pokemon from '../data/pokemon.json'
import styles from './Randomizer.module.css'

// The only thing shared with the game is this read-only Pokedex. Everything else
// here is self-contained so the tool can run in its own tab or on another device.
type Entry = { name: string; dexNumber: number; sprite: string | null }
const DEX = pokemon as Entry[]

const base = import.meta.env.BASE_URL
const spriteUrl = (e: Entry) => (e.sprite ? `${base}${e.sprite}` : undefined)

// Copied from HinterPlay instead of imported, to keep this page decoupled from
// the game app. PokeAPI identifiers are lowercase and hyphenated.
function pretty(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// One turn is 10 answers, same as the game, so the hinter draws up to 10.
const TURN_SIZE = 10

export default function Randomizer() {
  const [list, setList] = useState<Entry[]>([])
  const full = list.length >= TURN_SIZE
  const current = list[list.length - 1] ?? null

  function draw() {
    if (full) return
    // No repeats: pick only from entries not already drawn this turn.
    const drawn = new Set(list.map((e) => e.dexNumber))
    const pool = DEX.filter((e) => !drawn.has(e.dexNumber))
    if (pool.length === 0) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setList((l) => [...l, pick])
  }

  function reroll() {
    if (list.length === 0) return
    // Swap the current draw for a different one, like the game's reroll. The
    // count stays the same; only the latest Pokemon changes. Excluding every
    // drawn entry keeps it off the new pick, so it never repeats the old one.
    const drawn = new Set(list.map((e) => e.dexNumber))
    const pool = DEX.filter((e) => !drawn.has(e.dexNumber))
    if (pool.length === 0) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setList((l) => [...l.slice(0, -1), pick])
  }

  function reset() {
    setList([])
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Hint Bank</h1>
        <p className={styles.kicker}>Randomizer</p>
      </header>

      <p className={styles.note}>
        Private to the hinter. Draw a Pokemon, read it, and type it into the game board when
        guessed. Nothing here is linked directly to the game.
      </p>

      <div className={styles.current}>
        {current ? (
          <>
            {spriteUrl(current) && (
              <img className={styles.currentSprite} src={spriteUrl(current)} alt="" draggable={false} />
            )}
            <span className={styles.currentName}>{pretty(current.name)}</span>
          </>
        ) : (
          <span className={styles.placeholder}>Press Draw for your first Pokemon</span>
        )}
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.draw} onClick={draw} disabled={full}>
          Draw
        </button>
        <button type="button" className={styles.reroll} onClick={reroll} disabled={list.length === 0}>
          Reroll
        </button>
        <button type="button" className={styles.reset} onClick={reset} disabled={list.length === 0}>
          Reset
        </button>
        <span className={styles.count}>
          {list.length} / {TURN_SIZE}
        </span>
      </div>

      {full && <p className={styles.fullNote}>Turn full. Reset for the next hinter.</p>}

      <ol className={styles.list}>
        {list.map((e, i) => (
          <li key={e.dexNumber} className={styles.row}>
            <span className={styles.index}>{i + 1}</span>
            {spriteUrl(e) && <img className={styles.rowSprite} src={spriteUrl(e)} alt="" draggable={false} />}
            <span className={styles.rowName}>{pretty(e.name)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
