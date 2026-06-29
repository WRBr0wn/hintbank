import { describe, expect, it } from 'vitest'
import {
  addWord,
  canAddWord,
  canEndTurn,
  canReroll,
  createGame,
  currentAnswer,
  editResult,
  editWord,
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

  it('ends the turn early with no point penalty: hinter = 25 - bank', () => {
    let s = fillWords(start(), BANK_CAP) // 40 entries
    for (let i = 0; i < 3; i++) {
      s = giveHint(s, [0])
      s = resolveHint(s) // no one correct; hints do not score
    }
    s = endTurn(s)
    expect(s.status).toBe('complete')
    expect(s.endedEarly).toBe(true) // still recorded, just not scored
    expect(hinterScore(s)).toBe(25 - BANK_CAP) // 25 - 40 = -15, no end-turn penalty
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

describe('host-supplied answers', () => {
  it('stores the host-typed answer on the result when one is given', () => {
    let s = createGame({ players: ['g', 'b'], hinterId: 'g', deck: [] })
    s = addWord(s, 'shadow')
    s = giveHint(s, [0])
    s = resolveHint(s, { correctGuesserId: 'b', answer: 'gengar' })
    expect(s.results).toEqual([{ answer: 'gengar', guesserId: 'b' }])
    expect(s.resolved).toBe(1)
    expect(s.correctGuesses.b).toBe(1)
  })

  it('falls back to the deck answer when none is supplied', () => {
    let s = addWord(start(), 'fire')
    const landed = currentAnswer(s)
    s = giveHint(s, [0])
    s = resolveHint(s, { correctGuesserId: 'b' })
    expect(s.results).toEqual([{ answer: landed, guesserId: 'b' }])
  })
})

describe('reroll without a deck', () => {
  it('drops a marker and costs a slot with no deck to draw from', () => {
    let s = createGame({ players: ['g', 'b'], hinterId: 'g', deck: [] })
    expect(hinterScore(s)).toBe(25) // empty bank
    s = reroll(s)
    expect(s.bank).toEqual([{ kind: 'reroll' }])
    expect(s.cursor).toBe(0) // no deck draw, cursor stays put
    expect(hinterScore(s)).toBe(24) // the marker still costs one slot
  })
})

describe('editWord (typo fix)', () => {
  it('replaces the word text, leaving bank size and scores identical', () => {
    let s = fillWords(start(), 3)
    s = addWord(s, 'thunderbot') // typo at index 3
    const before = gameScores(s)
    const size = s.bank.length
    s = editWord(s, 3, '  thunderbolt  ') // trims surrounding space
    expect(s.bank[3]).toEqual({ kind: 'word', word: 'thunderbolt' })
    expect(s.bank).toHaveLength(size)
    expect(gameScores(s)).toEqual(before)
    expect(hinterScore(s)).toBe(25 - size)
  })

  it('rejects empty text, out-of-range, and a reroll-marker index', () => {
    let s = addWord(start(), 'fire')
    s = reroll(s) // marker lands at index 1
    expect(() => editWord(s, 0, '   ')).toThrow() // empty after trim
    expect(() => editWord(s, 9, 'nope')).toThrow() // out of range
    expect(() => editWord(s, 1, 'spark')).toThrow(/marker/) // markers are not editable
    expect(s.bank[0]).toEqual({ kind: 'word', word: 'fire' }) // unchanged
  })
})

describe('editResult (typo fix)', () => {
  it('replaces the answer text, same guesser, scores and result count unchanged', () => {
    let s = createGame({ players: ['g', 'b'], hinterId: 'g', deck: [] })
    s = addWord(s, 'shadow')
    s = giveHint(s, [0])
    s = resolveHint(s, { correctGuesserId: 'b', answer: 'gengr' }) // host typo
    const before = gameScores(s)
    s = editResult(s, 0, '  Gengar  ')
    expect(s.results[0]).toEqual({ answer: 'Gengar', guesserId: 'b' })
    expect(s.results).toHaveLength(1)
    expect(gameScores(s)).toEqual(before)
  })

  it('rejects empty text and out-of-range', () => {
    let s = addWord(start(), 'w')
    s = giveHint(s, [0])
    s = resolveHint(s, { correctGuesserId: 'b' })
    expect(() => editResult(s, 0, '   ')).toThrow() // empty after trim
    expect(() => editResult(s, 5, 'nope')).toThrow() // out of range
  })
})
