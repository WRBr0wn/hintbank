// The edition manifest. Access is always by id (editionById), never by index, so
// per-edition URLs can be added later without reworking callers.
import type { Category } from './terms'
import type { PlayerAvatar } from '../types'
import { CATEGORIES as POKEMON_CATEGORIES } from './pokemon/data/categories'
import { CATEGORIES as GEOGRAPHY_CATEGORIES } from './geography/data/categories'
import { AVATARS as POKEMON_AVATARS } from './pokemon/avatars'
import { AVATARS as GEOGRAPHY_AVATARS } from './geography/avatars'

// Re-exported so the platform refers to the term types and helpers through the
// edition module.
export { activeTagValues, tagValueOptions, termPasses, type Category, type TagValue, type Term } from './terms'

// Kept as an object rather than a bare string: the object's presence is what
// signals the edition has a secondary axis (Boolean(secondaryTag) gates the
// selectors).
export interface SecondaryTag {
  label: string
}

// Per-tile visual identity, read by the menu tiles. The accent must read on
// both themes; it colors the tile's edges, wash, and monogram. icon is a
// public path like the sprites ("editions/<id>/..."), owned by the edition;
// omitted, the tile shows a monogram of the display name's first letter.
export interface EditionLook {
  accent: string
  icon?: string
}

export interface CreditLink {
  label: string
  href: string
}

// One footer paragraph. The wording lives here so the footer component holds no
// edition text of its own.
export interface CreditLine {
  lead: string
  link: CreditLink | null
  trail: string
}

// Soon editions leave these empty; a soon edition is never entered, so its
// credits never render.
export interface EditionCredits {
  disclaimer: string | null
  attribution: CreditLine[]
  production: CreditLine | null
}

export interface Edition {
  id: string
  displayName: string
  // Menu tile subtitle.
  tagline: string
  status: 'live' | 'soon'
  // Whether the content is someone else's IP. Declarative; nothing reads it yet.
  // It marks which editions can take the IP-free path later.
  hasIP: boolean
  // Audience marker. Declarative; no gating logic consumes it yet.
  contentRating: string
  // The platform reads these off the active edition, so each edition owns its
  // own content.
  categories: Category[]
  // The edition supplies only the label; the values live in the term data as
  // tags. Omitted means the edition has no secondary filter.
  secondaryTag?: SecondaryTag
  // The edition's avatar picker set. Omitted falls back to the platform's
  // neutral emoji set; either way avatarsFor (src/avatars.ts) appends the
  // platform-level ZenVolka avatar.
  avatars?: PlayerAvatar[]
  // Omitted means the tile falls back to the platform accent.
  look?: EditionLook
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
    categories: POKEMON_CATEGORIES,
    secondaryTag: { label: 'Generation' },
    avatars: POKEMON_AVATARS,
    look: { accent: '#ef5350' },
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
    tagline: 'Countries, capitals, landmarks, and more from around the world.',
    status: 'live',
    hasIP: false,
    contentRating: 'everyone',
    categories: GEOGRAPHY_CATEGORIES,
    secondaryTag: { label: 'Continent' },
    avatars: GEOGRAPHY_AVATARS,
    look: { accent: '#42a5f5' },
    credits: {
      disclaimer: null,
      attribution: [],
      production: {
        lead: 'Hint Bank · Geography Edition · A ',
        link: { label: 'ZenVolka', href: 'https://discord.gg/DtzNtgwqjf' },
        trail: ' production',
      },
    },
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

// The game page path for an edition, e.g. /hintbank/pokemon-edition/. The menu
// tiles link through it.
export function gamePath(editionId: string): string {
  return `${import.meta.env.BASE_URL}${editionId}-edition/`
}

// The randomizer page path for an edition, e.g. /hintbank/pokemon-edition/randomizer/.
// One convention, shared by the selector tiles and the in-game launch links.
export function randomizerPath(editionId: string): string {
  return `${import.meta.env.BASE_URL}${editionId}-edition/randomizer/`
}
