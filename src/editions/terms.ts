import type { Category, Term } from './pokemon/data/categories'

// A term is in the pool when no tag values are selected (filter off), when it
// carries a selected value, or when it has no tag values at all. The last case is
// pass-through: untagged terms stay in alongside a tagged selection. Shared by the
// game's deck builder and the randomizer so the two cannot drift apart.
export function termPasses(term: Term, tagValues: number[]): boolean {
  if (tagValues.length === 0) return true
  if (!term.gens || term.gens.length === 0) return true
  return term.gens.some((g) => tagValues.includes(g))
}

// The tag values on offer: the union across the selected categories' terms,
// sorted. Data-driven, so the selector only shows values actually present.
// Shared by Setup and the randomizer, like termPasses.
export function tagValueOptions(categories: Category[], selectedIds: ReadonlySet<string>): number[] {
  const values = new Set<number>()
  for (const c of categories) {
    if (!selectedIds.has(c.id)) continue
    for (const t of c.terms) {
      if (t.gens) for (const g of t.gens) values.add(g)
    }
  }
  return [...values].sort((a, b) => a - b)
}

// What is both picked and still on offer, so deselecting a category drops its
// values without silently filtering on one the player can no longer see.
export function activeTagValues(options: number[], picks: ReadonlySet<number>): number[] {
  return options.filter((v) => picks.has(v))
}
