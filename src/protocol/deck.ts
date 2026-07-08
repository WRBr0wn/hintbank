import { BANK_CAP } from '../engine'
import { termPasses, type Category, type TagValue } from '../editions/terms'

// Worst case a turn draws answersPerGame lands plus a full bank of rerolls.
// The same derivation the local game page uses.
export const deckSizeFor = (answersPerGame: number): number => answersPerGame + BANK_CAP

// The filtered pool for a room's settings: the same termPasses predicate the
// local deck builder and the randomizer use, so multiplayer cannot drift from
// them. Names only, unshuffled: the caller shuffles and slices, keeping
// randomness out of shared code (the engine's convention).
export function filterPool(categories: Category[], categoryIds: string[], tagValues: TagValue[]): string[] {
  const pool: string[] = []
  for (const id of categoryIds) {
    const category = categories.find((c) => c.id === id)
    if (!category) continue
    for (const term of category.terms) {
      if (termPasses(term, tagValues)) pool.push(term.name)
    }
  }
  return pool
}
