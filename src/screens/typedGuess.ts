import type { Intent } from '../net'
import { filterPool, type GuessFeedEntry, type PublicGameView, type RoomSettings, type SeatView } from '../protocol'
import type { Category } from '../editions'

// The selection list appears only after this many typed characters, softening
// the recognition aid (the pool is public data anyway) per MULTIPLAYER.md.
export const GUESS_QUERY_MIN = 2

// How many matches the scroll box shows, so it stays light on a big pool.
export const GUESS_MATCH_LIMIT = 30

// The room's guessable pool: canonical term names filtered to the settings with
// the same termPasses/pool filter the deck uses (via filterPool), built from
// edition data already in the bundle, so the list costs no requests. A guess is
// always one of these, so selection-only play needs no content filtering.
export function guessPool(categories: Category[], settings: RoomSettings): string[] {
  return filterPool(categories, settings.categoryIds, settings.tagValues)
}

// Matches for a typed query, case-insensitive, only past the minimum character
// count. Terms whose name starts with the query lead, then the rest that contain
// it, capped so the box stays short.
export function matchTerms(pool: string[], query: string, limit = GUESS_MATCH_LIMIT): string[] {
  const q = query.trim().toLowerCase()
  if (q.length < GUESS_QUERY_MIN) return []
  const prefix: string[] = []
  const contains: string[] = []
  for (const term of pool) {
    const lower = term.toLowerCase()
    if (lower.startsWith(q)) prefix.push(term)
    else if (lower.includes(q)) contains.push(term)
  }
  return [...prefix, ...contains].slice(0, limit)
}

// The guess intent for a selected term: the canonical pool term plus the hint it
// answers (the engine's hintCount it was made against), which the server scores
// it against, not whatever is current on arrival. The hint index is read off the
// current view, so the caller cannot get it wrong.
export function guessIntent(term: string, game: PublicGameView): Extract<Intent, { type: 'guess' }> {
  return { type: 'guess', term, hintIndex: game.hintCount }
}

// A guess-feed row ready to render: the guesser's display name resolved from the
// seats, newest first. Pure, so it is unit-tested; the component adds avatars.
export interface FeedRow {
  key: string
  guesserId: string
  name: string
  term: string
  correct: boolean
}

export function feedRows(feed: GuessFeedEntry[], seats: SeatView[]): FeedRow[] {
  const nameById = new Map(seats.map((s) => [s.id, s.name]))
  const rows = feed.map((entry, i) => ({
    key: `${i}-${entry.guesserId}`,
    guesserId: entry.guesserId,
    name: nameById.get(entry.guesserId) ?? 'Someone',
    term: entry.term,
    correct: entry.correct,
  }))
  rows.reverse() // newest pick first
  return rows
}
