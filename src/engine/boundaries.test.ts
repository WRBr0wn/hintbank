// End-to-end walk of the loop through the spots most likely to break: a full
// rotation, and the reroll / 40-cap / end-turn boundaries.
import { describe, expect, it } from 'vitest'
import {
  ANSWERS_PER_GAME,
  BANK_CAP,
  addWord,
  canAddWord,
  canEndTurn,
  canReroll,
  continueSession,
  createGame,
  createSession,
  currentAnswer,
  endTurn,
  gameScores,
  giveHint,
  giverScore,
  isBankFull,
  isRotationComplete,
  recordGame,
  reroll,
  resolveHint,
  usableWords,
  type GameState,
} from './index'

const deck = (n: number) => Array.from({ length: n }, (_, i) => `mon-${i}`)

// Land every answer with a single banked word, crediting guessers round-robin.
function playAllLanded(giverId: string, guessers: string[], players: string[]): GameState {
  let g = createGame({ players, giverId, deck: deck(60) })
  g = addWord(g, 'spark')
  let k = 0
  while (g.status === 'playing') {
    g = giveHint(g, usableWords(g).slice(0, 1))
    g = resolveHint(g, { correctGuesserId: guessers[k % guessers.length] })
    k++
  }
  return g
}

describe('4-player rotation', () => {
  it('advances giver to giver and carries totals across rotations', () => {
    const players = ['a', 'b', 'c', 'd']
    let session = createSession(players)

    let safety = 0
    while (!isRotationComplete(session)) {
      const giverId = players[session.giverPosition]
      const guessers = players.filter((p) => p !== giverId)
      const game = playAllLanded(giverId, guessers, players)
      expect(giverScore(game)).toBe(24) // 25 - 1 bank entry (one word, no rerolls)
      expect(game.resolved).toBe(ANSWERS_PER_GAME)
      session = recordGame(session, gameScores(game))
      if (++safety > 10) throw new Error('rotation did not terminate')
    }

    expect(session.completedRotations).toBe(1)
    // 4 givers * 24 + 4 games * 10 guesser points = 136, books balanced.
    expect(Object.values(session.totals).reduce((s, n) => s + n, 0)).toBe(136)

    const next = continueSession(session)
    expect(next.giverPosition).toBe(0)
    expect(next.totals).toEqual(session.totals)
  })
})

describe('40-cap boundary (words + rerolls)', () => {
  it('locks add/reroll at 40, offers end turn, scores 25 - bank - 5', () => {
    let g = createGame({ players: ['g', 'x'], giverId: 'g', deck: deck(60) })
    for (let i = 0; i < 20; i++) g = addWord(g, `w${i}`)
    for (let i = 0; i < 20; i++) {
      expect(canReroll(g)).toBe(true)
      g = reroll(g)
    }
    expect(g.bank).toHaveLength(BANK_CAP) // 20 words + 20 markers
    expect(isBankFull(g)).toBe(true)
    expect(canReroll(g)).toBe(false)
    expect(canAddWord(g)).toBe(false)
    expect(canEndTurn(g)).toBe(true)

    for (let i = 0; i < 3; i++) {
      g = giveHint(g, usableWords(g).slice(0, 1))
      g = resolveHint(g)
    }
    g = endTurn(g)
    expect(g.status).toBe('complete')
    expect(giverScore(g)).toBe(25 - BANK_CAP - 5) // 25 - 40 - 5 = -20
  })
})

describe('40 rerolls, zero words', () => {
  it('reaches an all-marker bank where only end turn is possible — not a dead end', () => {
    let g = createGame({ players: ['g', 'x'], giverId: 'g', deck: deck(60) })
    for (let i = 0; i < BANK_CAP; i++) g = reroll(g)
    expect(g.bank).toHaveLength(BANK_CAP)
    expect(usableWords(g)).toEqual([])
    expect(canReroll(g)).toBe(false)
    expect(canAddWord(g)).toBe(false)
    expect(canEndTurn(g)).toBe(true)
    expect(currentAnswer(g)).not.toBeNull()
    g = endTurn(g)
    expect(giverScore(g)).toBe(25 - BANK_CAP - 5) // 40 markers each cost -1: 25 - 40 - 5 = -20
  })
})

describe('deck headroom under heavy rerolling', () => {
  it('survives 39 rerolls then 10 lands on a 60-card deck', () => {
    let g = createGame({ players: ['g', 'x'], giverId: 'g', deck: deck(60) })
    g = addWord(g, 'one')
    for (let i = 0; i < BANK_CAP - 1; i++) g = reroll(g)
    expect(g.bank).toHaveLength(BANK_CAP)
    while (g.status === 'playing') {
      g = giveHint(g, [0])
      g = resolveHint(g, { correctGuesserId: 'x' })
    }
    expect(g.resolved).toBe(ANSWERS_PER_GAME)
    expect(g.cursor).toBeLessThan(60)
  })
})
