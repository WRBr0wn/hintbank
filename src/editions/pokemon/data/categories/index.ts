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

// A dealt term: the display name, its secondary-tag values (gens), and a sprite
// path when the source entry carries them. The board only ever renders name; gens
// drive the optional generation filter, and sprite is read by the randomizer when
// present. Each is optional, so a category drops in tagged or untagged, with or
// without sprites, with no config; the presence of the data is the only switch.
export interface Term {
  name: string
  gens?: number[]
  sprite?: string
}

export interface Category {
  id: string
  label: string
  ready: boolean
  terms: Term[]
}

// Pull each source entry down to a dealt term: its name, plus gens and sprite only
// when the entry has them. Entries may carry extra fields (type, city, ...); they
// are ignored here.
const terms = (entries: { name: string; gens?: number[]; sprite?: string }[]): Term[] =>
  entries.map((e) => {
    const t: Term = { name: e.name }
    if (e.gens) t.gens = e.gens
    if (e.sprite) t.sprite = e.sprite
    return t
  })

export const CATEGORIES: Category[] = [
  { id: 'pokemon', label: 'Pokémon', ready: true, terms: pokemon.map((p) => ({ name: p.displayName, gens: p.gens, sprite: p.sprite })) },
  { id: 'leaders', label: 'Gym Leaders', ready: true, terms: terms(leaders) },
  { id: 'towns', label: 'Towns & Cities', ready: true, terms: terms(towns) },
  { id: 'games', label: 'Games', ready: true, terms: terms(games) },
  { id: 'items', label: 'Items', ready: true, terms: terms(items) },
  { id: 'routes', label: 'Routes & Areas', ready: true, terms: terms(routes) },
  { id: 'badges', label: 'Badges', ready: true, terms: terms(badges) },
  { id: 'professors', label: 'Professors', ready: false, terms: [] },
]
