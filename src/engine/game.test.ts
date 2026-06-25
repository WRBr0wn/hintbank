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
  hinterScore,
  guesserScore,
  isBankFull,
  reroll,
  resolveHint,
  usableWords,
} from './game'
import { BANK_CAP } from './types'

const deck = (n = 60) => Array.from({ length: n }, (_, i) => `a${i}`)

const start = (players = ['g', 'b', 'c'], hinterId = 'g', size = 60) =>
  createGame({ players, hinterId, deck: deck(size) })

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
  it('swaps the answer, drops a marker, is not a hint, but costs a bank slot', () => {
    const s0 = start()
    expect(hinterScore(s0)).toBe(25) // empty bank
    const before = currentAnswer(s0)
    const s1 = reroll(s0)
    expect(currentAnswer(s1)).not.toBe(before)
    expect(s1.bank).toEqual([{ kind: 'reroll' }])
    expect(s1.hintCount).toBe(0) // not a hint
    expect(s1.resolved).toBe(0) // still have to land it
    expect(hinterScore(s1)).toBe(24) // the marker is one bank entry: -1
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

  it('applies a flat -5 and ends the turn: hinter = 25 - bank - 5', () => {
    let s = fillWords(start(), BANK_CAP) // 40 entries
    for (let i = 0; i < 3; i++) {
      s = giveHint(s, [0])
      s = resolveHint(s) // no one correct; hints do not score
    }
    s = endTurn(s)
    expect(s.status).toBe('complete')
    expect(s.endedEarly).toBe(true)
    expect(hinterScore(s)).toBe(25 - BANK_CAP - 5) // 25 - 40 - 5 = -20
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
  it('drives the hinter below zero as the bank grows, regardless of hints', () => {
    let s = fillWords(start(), 30) // 30 bank entries
    for (let i = 0; i < 5; i++) {
      s = giveHint(s, [0])
      s = resolveHint(s) // hints must not move the score
    }
    expect(s.hintCount).toBe(5)
    expect(hinterScore(s)).toBe(25 - 30) // -5, bank size only
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
    expect(scores.g).toBe(hinterScore(s)) // 25 - 1 bank entry = 24
    expect(scores.b).toBe(1)
    expect(scores.c).toBe(0)
  })
})

describe('overguess with a correct guess in one call', () => {
  it('nets the guesser and updates both tallies (the path HinterPlay takes)', () => {
    let s = addWord(start(), 'volt')
    s = giveHint(s, [0])
    // b guessed three times on this hint (two extra) and landed it on the third.
    s = resolveHint(s, { correctGuesserId: 'b', overguesses: { b: 2 } })
    expect(s.correctGuesses.b).toBe(1)
    expect(s.overguesses.b).toBe(2)
    expect(guesserScore(s, 'b')).toBe(-1) // +1 correct, -2 overguess
    expect(s.resolved).toBe(1) // the answer still landed
  })
})

describe('deck headroom', () => {
  it('survives the worst-case draw on the default deck: 39 rerolls then 10 lands', () => {
    // The most cards a turn can ever draw: keep one word to land with, reroll the
    // other 39 slots (the max while a usable word remains), then land all 10.
    // 39 + 10 = 49 draws must fit the default deck. If DECK_SIZE drops below that,
    // currentAnswer goes null mid-turn and this test goes red.
    let s = addWord(start(), 'spark')
    for (let i = 0; i < BANK_CAP - 1; i++) s = reroll(s)
    expect(s.bank).toHaveLength(BANK_CAP) // 1 word + 39 reroll markers
    expect(canReroll(s)).toBe(false) // bank full: max rerolls reached

    for (let i = 0; i < 10; i++) {
      expect(currentAnswer(s)).not.toBeNull() // deck still has an answer to land
      s = giveHint(s, [0])
      s = resolveHint(s, { correctGuesserId: 'b' })
    }
    expect(s.status).toBe('complete')
    expect(s.resolved).toBe(10)
    expect(s.results.every((r) => r.answer !== undefined)).toBe(true)
  })
})
