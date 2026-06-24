import { describe, expect, it } from 'vitest'
import {
  addWord,
  canAddWord,
  canEndTurn,
  canReroll,
  createGame,
  currentAnswer,
  endTurn,
  gameScores,
  giveHint,
  giverScore,
  guesserScore,
  isBankFull,
  reroll,
  resolveHint,
  usableWords,
} from './game'
import { BANK_CAP } from './types'

const deck = (n = 60) => Array.from({ length: n }, (_, i) => `a${i}`)

const start = (players = ['g', 'b', 'c'], giverId = 'g', size = 60) =>
  createGame({ players, giverId, deck: deck(size) })

// Add count words, returning the new state. Words must be unique-ish for clarity.
const fillWords = (s: ReturnType<typeof start>, count: number) => {
  let next = s
  for (let i = 0; i < count; i++) next = addWord(next, `w${i}`)
  return next
}

describe('hint bank cap', () => {
  it('blocks adding a word once the bank holds 40', () => {
    const s = fillWords(start(), BANK_CAP)
    expect(s.bank).toHaveLength(BANK_CAP)
    expect(isBankFull(s)).toBe(true)
    expect(canAddWord(s)).toBe(false)
    expect(() => addWord(s, 'one-too-many')).toThrow()
  })

  it('blocks reroll once the bank is full', () => {
    const s = fillWords(start(), BANK_CAP)
    expect(canReroll(s)).toBe(false)
    expect(() => reroll(s)).toThrow()
  })
})

describe('hints', () => {
  it('rejects a zero-word hint', () => {
    const s = addWord(start(), 'pikachu')
    expect(() => giveHint(s, [])).toThrow(/at least one word/)
  })

  it('accepts any non-empty subset of banked words and counts one hint per round', () => {
    let s = fillWords(start(), 3)
    s = giveHint(s, [0, 2])
    expect(s.hintCount).toBe(1)
    expect(s.phase).toBe('resolving')
  })

  it('will not let a reroll marker be selected as a hint word', () => {
    let s = reroll(start()) // marker lands in slot 0
    expect(s.bank[0]).toEqual({ kind: 'reroll' })
    expect(usableWords(s)).toEqual([])
    expect(() => giveHint(s, [0])).toThrow(/markers cannot be used/)

    s = addWord(s, 'thunderbolt') // word now in slot 1
    expect(usableWords(s)).toEqual([1])
    expect(() => giveHint(s, [1])).not.toThrow()
  })
})

describe('reroll', () => {
  it('swaps the answer, drops a marker, costs no points, and is not a hint', () => {
    const s0 = start()
    const before = currentAnswer(s0)
    const s1 = reroll(s0)
    expect(currentAnswer(s1)).not.toBe(before)
    expect(s1.bank).toEqual([{ kind: 'reroll' }])
    expect(s1.hintCount).toBe(0)
    expect(s1.resolved).toBe(0) // still have to land it
  })
})

describe('end turn', () => {
  it('is only available when the bank is full', () => {
    let s = fillWords(start(), BANK_CAP - 1)
    expect(canEndTurn(s)).toBe(false)
    expect(() => endTurn(s)).toThrow()

    s = addWord(s, 'last')
    expect(s.bank).toHaveLength(BANK_CAP)
    expect(canEndTurn(s)).toBe(true)
  })

  it('applies a flat -5 and ends the turn: giver = 25 - hints - 5', () => {
    let s = fillWords(start(), BANK_CAP)
    for (let i = 0; i < 3; i++) {
      s = giveHint(s, [0])
      s = resolveHint(s) // no one correct
    }
    s = endTurn(s)
    expect(s.status).toBe('complete')
    expect(s.endedEarly).toBe(true)
    expect(giverScore(s)).toBe(25 - 3 - 5)
  })
})

describe('guess resolution', () => {
  it('credits the guesser, logs the result, and reveals the next answer', () => {
    let s = addWord(start(), 'fire')
    const landed = currentAnswer(s)
    s = giveHint(s, [0])
    s = resolveHint(s, { correctGuesserId: 'b' })
    expect(s.resolved).toBe(1)
    expect(s.correctGuesses.b).toBe(1)
    expect(s.results).toEqual([{ answer: landed, guesserId: 'b' }])
    expect(currentAnswer(s)).not.toBe(landed)
    expect(s.phase).toBe('hinting')
  })

  it('completes the game after 10 answers are landed', () => {
    let s = addWord(start(), 'go')
    for (let i = 0; i < 10; i++) {
      s = giveHint(s, [0])
      s = resolveHint(s, { correctGuesserId: 'b' })
    }
    expect(s.status).toBe('complete')
    expect(s.resolved).toBe(10)
    expect(s.correctGuesses.b).toBe(10)
  })
})

describe('scoring goes negative', () => {
  it('drives the giver below zero with enough hints', () => {
    let s = addWord(start(), 'only')
    for (let i = 0; i < 30; i++) {
      s = giveHint(s, [0])
      s = resolveHint(s) // never landed
    }
    expect(s.hintCount).toBe(30)
    expect(giverScore(s)).toBe(-5)
  })

  it('drives a guesser below zero when overguesses outweigh corrects', () => {
    let s = addWord(start(), 'w')
    s = giveHint(s, [0])
    s = resolveHint(s, { overguesses: { b: 2 } }) // 2 extra guesses, none right
    s = giveHint(s, [0])
    s = resolveHint(s, { correctGuesserId: 'b' }) // +1
    expect(guesserScore(s, 'b')).toBe(-1)
  })

  it('reports a delta for every player, including non-guessers', () => {
    let s = addWord(start(['g', 'b', 'c']), 'w')
    s = giveHint(s, [0])
    s = resolveHint(s, { correctGuesserId: 'b' })
    const scores = gameScores(s)
    expect(scores.g).toBe(giverScore(s)) // 25 - 1
    expect(scores.b).toBe(1)
    expect(scores.c).toBe(0)
  })
})
