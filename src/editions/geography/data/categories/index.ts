import type { Category, Term } from '../../../terms'
import countries from './countries.json'
import capitals from './capitals.json'
import landmarks from './landmarks.json'
import rivers from './rivers.json'
import mountains from './mountains.json'

// Source entries already carry the neutral tags field (continent names), so
// extraction is a straight copy of the dealt fields; no sprites in this edition.
const terms = (entries: { name: string; tags?: string[] }[]): Term[] =>
  entries.map((e) => {
    const t: Term = { name: e.name }
    if (e.tags) t.tags = e.tags
    return t
  })

export const CATEGORIES: Category[] = [
  { id: 'countries', label: 'Countries', ready: true, terms: terms(countries) },
  { id: 'capitals', label: 'Capitals', ready: true, terms: terms(capitals) },
  { id: 'landmarks', label: 'Landmarks', ready: true, terms: terms(landmarks) },
  { id: 'rivers', label: 'Rivers & Lakes', ready: true, terms: terms(rivers) },
  { id: 'mountains', label: 'Mountains & Ranges', ready: true, terms: terms(mountains) },
]
