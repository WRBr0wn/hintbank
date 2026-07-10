import { describe, expect, it } from 'vitest'
import type { PublicGameView, RoomView } from '../protocol'
import { seatScore } from './roomScreen'

const view = (totals: Record<string, number>): RoomView => ({
  editionId: 'geography',
  code: 'ABC234',
  phase: 'turn',
  locked: false,
  hostId: 'h',
  settings: { categoryIds: ['countries'], difficultyBase: 25, answersPerGame: 10, tagValues: [], onlineMode: 'voice' },
  seats: [],
  totals,
  you: 'h',
  session: null,
  game: null,
  hinter: null,
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
  currentHint: null,
  ...over,
})

describe('seatScore', () => {
  it('ticks a guesser up live by lands minus overguesses on top of their total', () => {
    const g = game({ correctGuesses: { a: 2 }, overguesses: { a: 1 } })
    const s = seatScore(view({ a: 5 }), g, 'a')
    expect(s.total).toBe(6) // 5 + (2 - 1)
    expect(s.isHinter).toBe(false)
    expect(s.pending).toBe(false)
    expect(s.delta).toBeNull()
  })

  it("holds the hinter's total and marks it pending while playing", () => {
    const s = seatScore(view({ h: 12 }), game({ status: 'playing' }), 'h')
    expect(s.total).toBe(12)
    expect(s.isHinter).toBe(true)
    expect(s.pending).toBe(true)
    expect(s.delta).toBeNull()
  })

  it("resolves the hinter's delta as cutoff minus bank on a completed turn", () => {
    const g = game({ status: 'complete', cutoff: 13, bank: [{ kind: 'word', word: 'x' }] })
    const s = seatScore(view({ h: 4 }), g, 'h')
    expect(s.pending).toBe(false)
    expect(s.delta).toBe(12) // 13 - 1
  })

  it('falls back to the session total with no game', () => {
    const s = seatScore(view({ a: 7 }), null, 'a')
    expect(s).toEqual({ total: 7, isHinter: false, pending: false, delta: null })
  })
})
