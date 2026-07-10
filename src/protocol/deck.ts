import { BANK_CAP } from '../engine'
import { termPasses, type Category, type TagValue } from '../editions/terms'

// Worst case a turn draws answersPerGame lands plus a full bank of rerolls.
// The same derivation the local game page uses.
export const deckSizeFor = (answersPerGame: number): number => answersPerGame + BANK_CAP

// The filtered pool for a room's settings: the same termPasses predicate the
// local deck builder and the randomizer use, so multiplayer cannot drift from
// them. Names only, unshuffled: the caller shuffles and slices, keeping
// randomness out of shared code (the engine's convention). Each name appears
// once, first occurrence winning: real categories collide (Blue, Pearl, Ruby,
// Sapphire each sit in two Pokemon categories), and a doubled name would deal
// an unlandable second copy in typed mode and duplicate the typeahead.
export function filterPool(categories: Category[], categoryIds: string[], tagValues: TagValue[]): string[] {
  const pool: string[] = []
  const seen = new Set<string>()
  for (const id of categoryIds) {
    const category = categories.find((c) => c.id === id)
    if (!category) continue
    for (const term of category.terms) {
      if (!termPasses(term, tagValues) || seen.has(term.name)) continue
      seen.add(term.name)
      pool.push(term.name)
    }
  }
  return pool
}
