import type { TagValue } from '../../../terms'
import pokemon from '../pokemon.json'
import leaders from './leaders.json'
import towns from './towns.json'
import games from './games.json'
import items from './items.json'
import routes from './routes.json'
import badges from './badges.json'

// tags and sprite are optional so a category drops in tagged or untagged, with or
// without sprites, with no config; the presence of the data is the only switch.
// tags is the neutral secondary-tag field; this edition's source JSONs store it
// as gens (numbers), mapped here at extraction.
// box is the sprite artwork's measured bounding box, [x, y, w, h] in pixels on
// the 96x96 canvas (see scripts/measure-sprites.mjs); renderers use it to show
// sprites at a consistent visual size. Absent means render the file as-is.
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

// Source entries may carry extra fields (type, city, ...); only the dealt fields
// come through, and tags/sprite only when the entry has them.
const terms = (entries: { name: string; gens?: number[]; sprite?: string }[]): Term[] =>
  entries.map((e) => {
    const t: Term = { name: e.name }
    if (e.gens) t.tags = e.gens
    if (e.sprite) t.sprite = e.sprite
    return t
  })

export const CATEGORIES: Category[] = [
  { id: 'pokemon', label: 'Pokémon', ready: true, terms: pokemon.map((p) => ({ name: p.displayName, tags: p.gens, sprite: p.sprite, box: p.box })) },
  { id: 'leaders', label: 'Gym Leaders', ready: true, terms: terms(leaders) },
  { id: 'towns', label: 'Towns & Cities', ready: true, terms: terms(towns) },
  { id: 'games', label: 'Games', ready: true, terms: terms(games) },
  { id: 'items', label: 'Items', ready: true, terms: terms(items) },
  { id: 'routes', label: 'Routes & Areas', ready: true, terms: terms(routes) },
  { id: 'badges', label: 'Badges', ready: true, terms: terms(badges) },
  { id: 'professors', label: 'Professors', ready: false, terms: [] },
]
