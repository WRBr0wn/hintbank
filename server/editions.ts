import { CATEGORIES as POKEMON } from '../src/editions/pokemon/data/categories'
import { CATEGORIES as GEOGRAPHY } from '../src/editions/geography/data/categories'
import type { Category } from '../src/editions/terms'

// The worker deals decks server-side, so it needs each live edition's category
// data. Only names and tags are kept: the deal is names-only and filters on
// tags, so sprites and boxes never enter the worker's runtime data. "Editions
// are data" holds, adding an edition to multiplayer is one import line plus one
// row below.
function namesAndTags(categories: Category[]): Category[] {
  return categories.map((c) => ({
    id: c.id,
    label: c.label,
    ready: c.ready,
    terms: c.terms.map((t) => (t.tags ? { name: t.name, tags: t.tags } : { name: t.name })),
  }))
}

const MANIFEST: Record<string, Category[]> = {
  pokemon: namesAndTags(POKEMON),
  geography: namesAndTags(GEOGRAPHY),
}

// The categories a room's edition deals from, fed to filterPool. Empty for an
// unknown edition, so a stray deal simply yields no deck (startTurn refuses it).
export function categoriesFor(editionId: string): Category[] {
  return MANIFEST[editionId] ?? []
}
