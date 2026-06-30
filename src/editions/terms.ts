import type { Term } from './pokemon/data/categories'

// A term is in the pool when no tag values are selected (filter off), when it
// carries a selected value, or when it has no tag values at all. The last case is
// pass-through: untagged terms stay in alongside a tagged selection. Shared by the
// game's deck builder and the randomizer so the two cannot drift apart.
export function termPasses(term: Term, tagValues: number[]): boolean {
  if (tagValues.length === 0) return true
  if (!term.gens || term.gens.length === 0) return true
  return term.gens.some((g) => tagValues.includes(g))
}
