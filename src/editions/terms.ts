// A secondary-tag value is whatever an edition groups by: Pokemon generations
// are numbers, Geography continents are strings. Everything downstream
// (predicate, derivation, both pickers) handles either.
export type TagValue = string | number

// One drawable item. Everything past name is optional so a category drops in
// tagged or untagged, with or without sprites; the presence of the data is the
// only switch. sprite is a public path owned by the edition; box is the sprite
// artwork's measured bounding box, [x, y, w, h] in pixels on its canvas (see
// scripts/measure-sprites.mjs), used to render sprites at a consistent visual
// size. Absent means render the file as-is.
export interface Term {
  name: string
  tags?: TagValue[]
  sprite?: string
  box?: number[]
}

export interface Category {
  id: string
  label: string
  ready: boolean
  terms: Term[]
}

// Numbers order numerically (10 after 2, not after 1), strings alphabetically,
// numbers before strings when an edition mixes them.
function compareTagValues(a: TagValue, b: TagValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'number') return -1
  if (typeof b === 'number') return 1
  return a < b ? -1 : a > b ? 1 : 0
}

// A term is in the pool when no tag values are selected (filter off), when it
// carries a selected value, or when it has no tag values at all. The last case is
// pass-through: untagged terms stay in alongside a tagged selection. Shared by the
// game's deck builder and the randomizer so the two cannot drift apart.
export function termPasses(term: Term, tagValues: TagValue[]): boolean {
  if (tagValues.length === 0) return true
  if (!term.tags || term.tags.length === 0) return true
  return term.tags.some((t) => tagValues.includes(t))
}

// The tag values on offer: the union across the selected categories' terms,
// sorted. Data-driven, so the selector only shows values actually present.
// Shared by Setup and the randomizer, like termPasses.
export function tagValueOptions(categories: Category[], selectedIds: ReadonlySet<string>): TagValue[] {
  const values = new Set<TagValue>()
  for (const c of categories) {
    if (!selectedIds.has(c.id)) continue
    for (const t of c.terms) {
      if (t.tags) for (const v of t.tags) values.add(v)
    }
  }
  return [...values].sort(compareTagValues)
}

// What is both picked and still on offer, so deselecting a category drops its
// values without silently filtering on one the player can no longer see.
export function activeTagValues(options: TagValue[], picks: ReadonlySet<TagValue>): TagValue[] {
  return options.filter((v) => picks.has(v))
}
