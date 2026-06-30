// Single source of truth for the answer categories. Each entry pairs an id with
// its display label, a ready flag, and the term names that feed the deck. Adding
// a category is a drop-in: add <id>.json here and one entry to the list below.
import pokemon from '../pokemon.json'
import leaders from './leaders.json'
import towns from './towns.json'
import games from './games.json'
import items from './items.json'
import routes from './routes.json'
import badges from './badges.json'

// Uniform term shape. Only name is read today; term extraction (the names helper
// below) reads name and ignores everything else, so a category whose entries carry
// extra fields drops in unchanged. sprite, gen, and gens are reserved so a future
// per-term sprite or generation filter is pure data, no structural change. gen/gens
// are arrays because a term can span multiple generations.
export interface Term {
  name: string
  sprite?: string
  gen?: number[]
  gens?: number[]
}

export interface Category {
  id: string
  label: string
  ready: boolean
  terms: string[]
}

const names = (terms: Term[]) => terms.map((t) => t.name)

export const CATEGORIES: Category[] = [
  { id: 'pokemon', label: 'Pokémon', ready: true, terms: pokemon.map((p) => p.displayName) },
  { id: 'leaders', label: 'Gym Leaders', ready: true, terms: names(leaders) },
  { id: 'towns', label: 'Towns & Cities', ready: true, terms: names(towns) },
  { id: 'games', label: 'Games', ready: true, terms: names(games) },
  { id: 'items', label: 'Items', ready: true, terms: names(items) },
  { id: 'routes', label: 'Routes & Areas', ready: true, terms: names(routes) },
  { id: 'badges', label: 'Badges', ready: true, terms: names(badges) },
  { id: 'professors', label: 'Professors', ready: false, terms: [] },
]
