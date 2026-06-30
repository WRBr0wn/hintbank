import { useMemo, useState } from 'react'
import pokemon from '../editions/pokemon/data/pokemon.json'
import { CATEGORIES } from '../editions/pokemon/data/categories'
import { editionById, termPasses } from '../editions'
import ThemeToggle from '../components/ThemeToggle'
import styles from './Randomizer.module.css'

// Shares only read-only data with the game: the category manifest (which terms
// exist) and pokemon.json (sprites). No session or game state is shared, so this
// stays a standalone page with its own category and generation pickers.
type Entry = { name: string; sprite?: string }

const base = import.meta.env.BASE_URL
const spriteUrl = (e: Entry) => (e.sprite ? `${base}${e.sprite}` : undefined)

// Pokemon is the only category with sprites. The manifest exposes terms as plain
// names, so map a Pokemon name back to its sprite here, keyed by display name.
const POKEMON_SPRITE = new Map(pokemon.map((p) => [p.displayName, p.sprite] as const))

// The randomizer only ever plays the Pokemon edition, so read its secondary tag
// (Generation) straight off the manifest.
const secondaryTag = editionById('pokemon')?.secondaryTag

// The answer target is a soft hint, matching the game's 5 to 10 range. The board
// enforces the real limit; here it only drives the count and the full note.
const MIN_TARGET = 5
const MAX_TARGET = 10
const clampTarget = (n: number) => Math.max(MIN_TARGET, Math.min(MAX_TARGET, n))

export default function Randomizer() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(['pokemon']))
  const [gens, setGens] = useState<Set<number>>(() => new Set())
  // The committed target drives full and the count; the raw input string is what
  // the field edits, so typing and backspacing are not clamped mid-entry.
  const [target, setTarget] = useState(MAX_TARGET)
  const [targetInput, setTargetInput] = useState(String(MAX_TARGET))
  const [list, setList] = useState<Entry[]>([])
  const full = list.length >= target
  const current = list[list.length - 1] ?? null

  // Generation options offered by the chosen categories: the union of gens across
  // their terms. Data-driven, so the selector only shows what is actually present.
  const secondaryOptions = useMemo(() => {
    const values = new Set<number>()
    for (const cat of CATEGORIES) {
      if (!selected.has(cat.id)) continue
      for (const t of cat.terms) {
        if (t.gens) for (const g of t.gens) values.add(g)
      }
    }
    return [...values].sort((a, b) => a - b)
  }, [selected])

  // What is both picked and still on offer, so deselecting a category drops its
  // generations without filtering on a value the hinter can no longer see.
  const secondaryValues = useMemo(
    () => secondaryOptions.filter((v) => gens.has(v)),
    [secondaryOptions, gens],
  )
  const showSecondary = Boolean(secondaryTag) && secondaryOptions.length > 0

  // Combined, generation-filtered pool of the selected categories. Rebuilt when the
  // category or generation selection changes.
  const pool = useMemo(() => {
    const out: Entry[] = []
    for (const cat of CATEGORIES) {
      if (!selected.has(cat.id)) continue
      for (const t of cat.terms) {
        if (!termPasses(t, secondaryValues)) continue
        out.push(
          cat.id === 'pokemon'
            ? { name: t.name, sprite: POKEMON_SPRITE.get(t.name) ?? undefined }
            : { name: t.name },
        )
      }
    }
    return out
  }, [selected, secondaryValues])

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

  function toggleGen(value: number) {
    setGens((s) => {
      const next = new Set(s)
      if (next.has(value)) next.delete(value)
      else next.add(value)
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

  // Clamp only when editing finishes. Empty or non-numeric falls back to the
  // default, then the field shows the committed value.
  function commitTarget() {
    const n = Number(targetInput)
    const next = targetInput.trim() !== '' && Number.isFinite(n) ? clampTarget(n) : MAX_TARGET
    setTarget(next)
    setTargetInput(String(next))
  }

  return (
    <div className={styles.page}>
      <ThemeToggle />
      <header className={styles.header}>
        <h1>Hint Bank · Pokémon Edition</h1>
        <p className={styles.kicker}>Randomizer</p>
      </header>

      <p className={styles.note}>Private to the hinter. Draw answers to hint from.</p>

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

      {showSecondary && secondaryTag && (
        <div className={styles.secondary}>
          <div className={styles.subLabel}>{secondaryTag.label}</div>
          <div className={styles.categories}>
            {secondaryOptions.map((v) => {
              const on = gens.has(v)
              return (
                <button
                  key={v}
                  type="button"
                  className={on ? styles.catOn : styles.cat}
                  aria-pressed={on}
                  onClick={() => toggleGen(v)}
                >
                  {v}
                </button>
              )
            })}
          </div>
          <p className={styles.note}>Pick one or more, or none for all.</p>
        </div>
      )}

      <div className={styles.current}>
        {current ? (
          <>
            <div className={styles.spriteSlot}>
              {spriteUrl(current) && (
                <img className={styles.currentSprite} src={spriteUrl(current)} alt="" draggable={false} />
              )}
            </div>
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
          {list.length} /{' '}
          <input
            className={styles.target}
            type="number"
            min={MIN_TARGET}
            max={MAX_TARGET}
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            onBlur={commitTarget}
            onKeyDown={(e) => e.key === 'Enter' && commitTarget()}
            aria-label="Answer target"
          />
        </span>
      </div>

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
