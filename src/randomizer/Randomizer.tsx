import { useMemo, useState } from 'react'
import pokemon from '../data/pokemon.json'
import { CATEGORIES } from '../data/categories'
import ThemeToggle from '../components/ThemeToggle'
import styles from './Randomizer.module.css'

// Shares only read-only data with the game: the category manifest (which terms
// exist) and pokemon.json (sprites). No session or game state is shared, so this
// stays a standalone page with its own category picker.
type Entry = { name: string; sprite?: string }

const base = import.meta.env.BASE_URL
const spriteUrl = (e: Entry) => (e.sprite ? `${base}${e.sprite}` : undefined)

// Pokemon is the only category with sprites. The manifest exposes terms as plain
// names, so map a Pokemon name back to its sprite here, keyed by display name.
const POKEMON_SPRITE = new Map(pokemon.map((p) => [p.displayName, p.sprite] as const))

const entriesFor = (id: string, terms: string[]): Entry[] =>
  id === 'pokemon'
    ? terms.map((name) => ({ name, sprite: POKEMON_SPRITE.get(name) ?? undefined }))
    : terms.map((name) => ({ name }))

const TURN_SIZE = 10

export default function Randomizer() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(['pokemon']))
  const [list, setList] = useState<Entry[]>([])
  const full = list.length >= TURN_SIZE
  const current = list[list.length - 1] ?? null

  // Combined pool of the selected categories, the same mix the game's buildDeck
  // makes. Rebuilt only when the selection changes.
  const pool = useMemo(() => {
    const out: Entry[] = []
    for (const cat of CATEGORIES) {
      if (selected.has(cat.id)) out.push(...entriesFor(cat.id, cat.terms))
    }
    return out
  }, [selected])

  // Pick a term not already in the list. Dedup keys on name so it works across
  // categories, where only Pokemon have a dexNumber.
  function pickUndrawn(): Entry | null {
    const drawn = new Set(list.map((e) => e.name))
    const options = pool.filter((e) => !drawn.has(e.name))
    if (options.length === 0) return null
    return options[Math.floor(Math.random() * options.length)]
  }

  function toggleCategory(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) {
        if (next.size > 1) next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function draw() {
    if (full) return
    const pick = pickUndrawn()
    if (pick) setList((l) => [...l, pick])
  }

  function reroll() {
    if (list.length === 0) return
    // Swap the latest draw for a different one, like the game's reroll.
    const pick = pickUndrawn()
    if (pick) setList((l) => [...l.slice(0, -1), pick])
  }

  function reset() {
    setList([])
  }

  return (
    <div className={styles.page}>
      <ThemeToggle />
      <header className={styles.header}>
        <h1>Hint Bank</h1>
        <p className={styles.kicker}>Randomizer</p>
      </header>

      <p className={styles.note}>
        Private to the hinter. Pick categories, draw an answer, read it, and type it into the
        game board when guessed. Nothing here is linked directly to the game.
      </p>

      <div className={styles.categories}>
        {CATEGORIES.map((c) => {
          const on = selected.has(c.id)
          const cls = !c.ready ? styles.catSoon : on ? styles.catOn : styles.cat
          return (
            <button
              key={c.id}
              type="button"
              className={cls}
              disabled={!c.ready}
              aria-pressed={on}
              onClick={() => c.ready && toggleCategory(c.id)}
            >
              {c.label}
              {!c.ready && <span className={styles.soon}>soon</span>}
            </button>
          )
        })}
      </div>

      <div className={styles.current}>
        {current ? (
          <>
            {spriteUrl(current) && (
              <img className={styles.currentSprite} src={spriteUrl(current)} alt="" draggable={false} />
            )}
            <span className={styles.currentName}>{current.name}</span>
          </>
        ) : (
          <span className={styles.placeholder}>Press Draw for your first answer</span>
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
          <li key={e.name} className={styles.row}>
            <span className={styles.index}>{i + 1}</span>
            {spriteUrl(e) && <img className={styles.rowSprite} src={spriteUrl(e)} alt="" draggable={false} />}
            <span className={styles.rowName}>{e.name}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
