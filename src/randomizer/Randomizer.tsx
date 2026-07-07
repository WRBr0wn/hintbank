import { useMemo, useState } from 'react'
import { activeTagValues, editionById, tagValueOptions, termPasses, type Category, type TagValue } from '../editions'
import { toggled, toggledKeepOne } from '../sets'
import { spriteZoom } from '../sprites'
import ThemeToggle from '../components/ThemeToggle'
import styles from './Randomizer.module.css'

// A standalone draw tool with no link to the game's session state.
type Entry = { name: string; sprite?: string; box?: number[] }

const base = import.meta.env.BASE_URL
const spriteUrl = (e: Entry) => (e.sprite ? `${base}${e.sprite}` : undefined)

// The answer target is a soft hint, matching the game's 5 to 10 range. The board
// enforces the real limit; here it only drives the count and the full state.
const MIN_TARGET = 5
const MAX_TARGET = 10
// Truncate toward zero first so the target is a whole count, then clamp the range.
const clampTarget = (n: number) => Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.trunc(n)))

// Stable fallback so a missing edition does not make categories a fresh array
// every render (it is a dependency of the memos below).
const NO_CATEGORIES: Category[] = []

// The edition is supplied by the page entry, so the component is reusable across
// editions; everything edition-specific is read off the one it is given.
export default function Randomizer({ editionId }: { editionId: string }) {
  const edition = editionById(editionId)
  const categories = edition?.categories ?? NO_CATEGORIES
  const secondaryTag = edition?.secondaryTag

  const [selected, setSelected] = useState<Set<string>>(() => {
    const first = categories.find((c) => c.ready)?.id
    return new Set(first ? [first] : [])
  })
  const [tagPicks, setTagPicks] = useState<Set<TagValue>>(() => new Set())
  // The committed target drives full and the count; the raw input string is what
  // the field edits, so typing and backspacing are not clamped mid-entry.
  const [target, setTarget] = useState(MAX_TARGET)
  const [targetInput, setTargetInput] = useState(String(MAX_TARGET))
  const [list, setList] = useState<Entry[]>([])
  const full = list.length >= target
  const current = list[list.length - 1] ?? null

  const secondaryOptions = useMemo(() => tagValueOptions(categories, selected), [categories, selected])
  const secondaryValues = useMemo(() => activeTagValues(secondaryOptions, tagPicks), [secondaryOptions, tagPicks])
  const showSecondary = Boolean(secondaryTag) && secondaryOptions.length > 0

  const pool = useMemo(() => {
    const out: Entry[] = []
    for (const cat of categories) {
      if (!selected.has(cat.id)) continue
      for (const t of cat.terms) {
        if (!termPasses(t, secondaryValues)) continue
        // Sprite comes straight off the term, so an edition without sprite data
        // just yields a name and the draw panel shows no image.
        out.push({ name: t.name, sprite: t.sprite, box: t.box })
      }
    }
    return out
  }, [categories, selected, secondaryValues])

  // Pick a term not already in the list. Dedup keys on name so it works across
  // categories, where only Pokemon have a dexNumber.
  function pickUndrawn(): Entry | null {
    const drawn = new Set(list.map((e) => e.name))
    const options = pool.filter((e) => !drawn.has(e.name))
    if (options.length === 0) return null
    return options[Math.floor(Math.random() * options.length)]
  }

  function toggleCategory(id: string) {
    setSelected((s) => toggledKeepOne(s, id))
  }

  function toggleTag(value: TagValue) {
    setTagPicks((s) => toggled(s, value))
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
        <h1>
          Hint <span className={styles.brandAccent}>Bank</span>
          {edition ? ` · ${edition.displayName} Edition` : ''}
        </h1>
        <p className={styles.kicker}>Randomizer</p>
      </header>

      <p className={styles.note}>Private to the hinter. Draw answers to hint from.</p>

      <div className={styles.categories}>
        {categories.map((c) => {
          const on = selected.has(c.id)
          const cls = !c.ready ? styles.catSoon : on ? styles.catOn : styles.cat
          return (
            <button
              key={c.id}
              type="button"
              className={cls}
              disabled={!c.ready}
              aria-pressed={on}
              onClick={() => toggleCategory(c.id)}
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
              const on = tagPicks.has(v)
              return (
                <button
                  key={v}
                  type="button"
                  className={on ? styles.catOn : styles.cat}
                  aria-pressed={on}
                  onClick={() => toggleTag(v)}
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
            {/* The img is keyed so each draw mounts a fresh element: mutating
                src in place leaves the old sprite painted under the new draw's
                zoom until the new file decodes. */}
            <div className={styles.spriteSlot}>
              {spriteUrl(current) && (
                <img
                  key={current.name}
                  className={styles.currentSprite}
                  style={spriteZoom(current.box)}
                  src={spriteUrl(current)}
                  alt=""
                  draggable={false}
                />
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
            {spriteUrl(e) && (
              <img className={styles.rowSprite} style={spriteZoom(e.box)} src={spriteUrl(e)} alt="" draggable={false} />
            )}
            <span className={styles.rowName}>{e.name}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
