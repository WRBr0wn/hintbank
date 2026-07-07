import type { Category, Term } from '../../../terms'
import pokemon from '../pokemon.json'
import leaders from './leaders.json'
import towns from './towns.json'
import games from './games.json'
import items from './items.json'
import itemsDeep from './items-deep.json'
import badges from './badges.json'
import professors from './professors.json'

// Source entries may carry extra fields (type, city, ...); only the dealt fields
// come through, and tags/sprite only when the entry has them. This edition's
// source JSONs store the tag values as gens (numbers), mapped to the neutral
// tags field here at extraction.
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
  // Disjoint from Items by construction: the curated set holds the recognizable
  // picks, this holds everything else, so selecting both never duplicates a term.
  { id: 'items-deep', label: 'Items: Deep Cuts', ready: true, terms: terms(itemsDeep) },
  { id: 'badges', label: 'Badges', ready: true, terms: terms(badges) },
  { id: 'professors', label: 'Professors', ready: true, terms: terms(professors) },
]
