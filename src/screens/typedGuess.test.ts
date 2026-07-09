import { describe, expect, it } from 'vitest'
import type { Category } from '../editions'
import type { GuessFeedEntry, PublicGameView, RoomSettings, SeatView } from '../protocol'
import { feedRows, guessIntent, guessPool, matchTerms, GUESS_QUERY_MIN } from './typedGuess'

const cat = (id: string, terms: { name: string; tags?: string[] }[]): Category => ({
  id,
  label: id,
  ready: true,
  terms,
})

const settings = (over: Partial<RoomSettings> = {}): RoomSettings => ({
  categoryIds: ['countries'],
  difficultyBase: 25,
  answersPerGame: 10,
  tagValues: [],
  onlineMode: 'typed',
  ...over,
})

const game = (over: Partial<PublicGameView> = {}): PublicGameView => ({
  hinterId: 'h',
  bank: [],
  hintCount: 0,
  resolved: 0,
  answersPerGame: 10,
  cutoff: 25,
  correctGuesses: {},
  overguesses: {},
  results: [],
  endedEarly: false,
  phase: 'hinting',
  status: 'playing',
  feed: [],
  ...over,
})

const seat = (id: string, name: string): SeatView => ({
  id,
  name,
  avatar: 'fox',
  role: 'player',
  connection: 'connected',
  pending: false,
})

describe('guessPool', () => {
  const categories = [
    cat('countries', [
      { name: 'France', tags: ['Europe'] },
      { name: 'Japan', tags: ['Asia'] },
    ]),
    cat('capitals', [{ name: 'Paris', tags: ['Europe'] }]),
  ]

  it('is the filtered pool for the selected categories, same as the deck filter', () => {
    expect(guessPool(categories, settings({ categoryIds: ['countries'] }))).toEqual(['France', 'Japan'])
  })

  it('honors the tag-value filter', () => {
    expect(guessPool(categories, settings({ categoryIds: ['countries', 'capitals'], tagValues: ['Europe'] }))).toEqual([
      'France',
      'Paris',
    ])
  })
})

describe('matchTerms', () => {
  const pool = ['France', 'French Guiana', 'Germany', 'Greece']

  it('stays empty below the minimum query length', () => {
    expect(matchTerms(pool, 'f'.repeat(GUESS_QUERY_MIN - 1))).toEqual([])
  })

  it('matches case-insensitively once the query is long enough', () => {
    expect(matchTerms(pool, 'gr')).toEqual(['Greece'])
    expect(matchTerms(pool, 'FR')).toEqual(['France', 'French Guiana'])
  })

  it('leads with prefix matches, then other substring matches', () => {
    // Germany/Georgia start with "ge"; Algeria only contains it, so it trails
    // despite sorting earlier in the pool.
    expect(matchTerms(['Algeria', 'Germany', 'Georgia'], 'ge')).toEqual(['Germany', 'Georgia', 'Algeria'])
  })

  it('caps the number of matches', () => {
    const many = Array.from({ length: 50 }, (_, i) => `Term${i}`)
    expect(matchTerms(many, 'term', 5)).toHaveLength(5)
  })
})

describe('guessIntent', () => {
  it('builds a guess carrying the current bank count', () => {
    const intent = guessIntent('France', game({ bank: [{ kind: 'word', word: 'a' }, { kind: 'reroll' }] }))
    expect(intent).toEqual({ type: 'guess', term: 'France', bankCount: 2 })
  })

  it('reads the bank count off the live view, so a stale count cannot be sent', () => {
    expect(guessIntent('Japan', game({ bank: [] })).bankCount).toBe(0)
  })
})

describe('feedRows', () => {
  const seats = [seat('a', 'Ann'), seat('b', 'Bob')]
  const feed: GuessFeedEntry[] = [
    { guesserId: 'a', term: 'France', correct: false },
    { guesserId: 'b', term: 'Japan', correct: true },
  ]

  it('resolves guesser names and orders newest first', () => {
    const rows = feedRows(feed, seats)
    expect(rows.map((r) => [r.name, r.term, r.correct])).toEqual([
      ['Bob', 'Japan', true],
      ['Ann', 'France', false],
    ])
  })

  it('falls back to a placeholder name for a departed guesser', () => {
    expect(feedRows([{ guesserId: 'gone', term: 'Peru', correct: false }], seats)[0].name).toBe('Someone')
  })

  it('gives each row a stable key', () => {
    const rows = feedRows(feed, seats)
    expect(new Set(rows.map((r) => r.key)).size).toBe(2)
  })
})
