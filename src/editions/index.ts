// Single source of truth for the editions. Each entry is keyed by a stable id and
// drops in the same way the category manifest does: add the object here and it
// shows up in the menu. Access is always by id (editionById), never by index, so
// per-edition URLs can be added later without reworking callers.
import { CATEGORIES, type Category } from './pokemon/data/categories'

// Re-exported so the platform refers to category types through the edition module
// rather than reaching into an edition's data folder.
export type { Category, Term } from './pokemon/data/categories'
export { termPasses } from './terms'

export interface CreditLink {
  label: string
  href: string
}

// One footer paragraph, written as lead text, an optional link, then trail text.
// Any part may be empty. The wording lives here so the footer holds no edition
// text of its own: a link's visible label is its own string, and the words around
// it travel with the edition.
export interface CreditLine {
  lead: string
  link: CreditLink | null
  trail: string
}

// The footer block for an edition. Only live editions need real values; soon
// editions leave these empty, and since a soon edition is never entered its credits
// never render.
export interface EditionCredits {
  disclaimer: string | null
  attribution: CreditLine[]
  production: CreditLine | null
}

export interface Edition {
  id: string
  displayName: string
  // Menu tile subtitle. For a soon edition this is the teaser line.
  tagline: string
  status: 'live' | 'soon'
  // Whether the edition's content is someone else's IP. Declarative this release;
  // nothing reads it yet. It marks which editions can take the IP-free path later.
  hasIP: boolean
  // Audience marker, e.g. 'everyone'. Declarative; no gating logic consumes it yet.
  contentRating: string
  // The edition's answer categories. The platform reads these off the active
  // edition, so each edition owns its own content. Soon editions have none yet.
  categories: Category[]
  // Optional secondary tag that subsets categories at setup. The edition supplies
  // only the label (Pokémon: Generation, geography later: Region); the values live
  // in the term data as gens. Omitted means the edition has no secondary filter.
  secondaryTag?: { label: string }
  credits: EditionCredits
}

const EMPTY_CREDITS: EditionCredits = {
  disclaimer: null,
  attribution: [],
  production: null,
}

export const EDITIONS: Edition[] = [
  {
    id: 'pokemon',
    displayName: 'Pokémon',
    tagline: 'Names, towns, leaders, and more from across the regions.',
    status: 'live',
    hasIP: true,
    contentRating: 'everyone',
    categories: CATEGORIES,
    secondaryTag: { label: 'Generation' },
    credits: {
      disclaimer:
        'Hint Bank: Pokémon Edition is an unofficial fan project, not affiliated with Nintendo, Game Freak, or The Pokémon Company. Pokémon names and sprites are property of their respective owners.',
      attribution: [
        { lead: 'Pokémon sprites and data via ', link: { label: 'PokéAPI', href: 'https://pokeapi.co' }, trail: '.' },
      ],
      production: {
        lead: 'Hint Bank · Pokémon Edition · A ',
        link: { label: 'ZenVolka', href: 'https://discord.gg/DtzNtgwqjf' },
        trail: ' production',
      },
    },
  },
  {
    id: 'geography',
    displayName: 'Geography',
    tagline: 'Countries, capitals, and landmarks of the real world.',
    status: 'soon',
    hasIP: false,
    contentRating: 'everyone',
    categories: [],
    credits: EMPTY_CREDITS,
  },
  {
    id: 'books',
    displayName: 'Books',
    tagline: 'Authors, titles, and characters from the page.',
    status: 'soon',
    hasIP: false,
    contentRating: 'everyone',
    categories: [],
    credits: EMPTY_CREDITS,
  },
  {
    id: 'marvel',
    displayName: 'Marvel',
    tagline: 'Heroes, villains, and teams from across the universe.',
    status: 'soon',
    hasIP: true,
    contentRating: 'everyone',
    categories: [],
    credits: EMPTY_CREDITS,
  },
]

export function editionById(id: string): Edition | undefined {
  return EDITIONS.find((e) => e.id === id)
}

// The randomizer page path for an edition, e.g. /hintbank/pokemon-edition/randomizer/.
// One convention, shared by the selector and the in-game launch links, so adding an
// edition's randomizer is just its HTML entry plus a tile that lands here.
export function randomizerPath(editionId: string): string {
  return `${import.meta.env.BASE_URL}${editionId}-edition/randomizer/`
}
