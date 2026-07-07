import {
  ANSWERS_PER_GAME,
  BANK_CAP,
  HINTER_BASE,
  type Answer,
  type GameState,
} from './types'

interface NewGame {
  players: string[]
  hinterId: string
  // Deck modes pass a shuffled deck. Host-driven modes pass nothing: the host
  // supplies each answer instead, so the game runs with an empty deck.
  deck?: Answer[]
  // Per-session settings, locked into the game; omitted callers get the defaults.
  hinterBase?: number
  answersPerGame?: number
}

export function createGame({
  players,
  hinterId,
  deck = [],
  hinterBase = HINTER_BASE,
  answersPerGame = ANSWERS_PER_GAME,
}: NewGame): GameState {
  if (!players.includes(hinterId)) {
    throw new Error('hinter must be one of the players')
  }
  // An empty deck means a host mode, where there is nothing to draw. A dealt
  // deck smaller than the requested turn clamps the turn to the pool: a
  // filtered pool of 6 deals a 6-answer turn. The caller derives the cutoff
  // from the clamped count (cutoffFor), so scoring follows the actual length.
  const dealt = deck.length
  if (dealt > 0 && dealt < answersPerGame) answersPerGame = dealt
  return {
    players,
    hinterId,
    deck,
    cursor: 0,
    rerolled: [],
    dealt,
    resolved: 0,
    bank: [],
    hintCount: 0,
    correctGuesses: {},
    overguesses: {},
    results: [],
    endedEarly: false,
    phase: 'hinting',
    status: 'playing',
    hinterBase,
    answersPerGame,
  }
}

export const isBankFull = (s: GameState): boolean => s.bank.length >= BANK_CAP

export const currentAnswer = (s: GameState): Answer | null =>
  s.status === 'playing' ? (s.deck[s.cursor] ?? null) : null

export const usableWords = (s: GameState): number[] =>
  s.bank.flatMap((entry, i) => (entry.kind === 'word' ? [i] : []))

// Adding a word and rerolling both append a bank entry, so they share one gate:
// game live, hinting phase, free slot.
const canBankEntry = (s: GameState): boolean =>
  s.status === 'playing' && s.phase === 'hinting' && !isBankFull(s)

export const canAddWord = canBankEntry

// Reroll additionally needs an answer to swap to: a fresh card, or a rerolled
// one that is not the current answer (small pools recycle; see reroll). Host
// modes have no deck and nothing to swap, so the bank gate is the whole test.
export const canReroll = (s: GameState): boolean =>
  canBankEntry(s) &&
  (s.deck.length === 0 || s.cursor + 1 < s.deck.length || s.rerolled.some((a) => a !== s.deck[s.cursor]))

export const canEndTurn = (s: GameState): boolean =>
  s.status === 'playing' && s.phase === 'hinting' && s.bank.length === BANK_CAP

export function addWord(s: GameState, word: string): GameState {
  const trimmed = word.trim()
  if (!trimmed) throw new Error('a hint word cannot be empty')
  if (!canAddWord(s)) throw new Error('cannot add a word: bank is full or a hint is awaiting resolution')
  return { ...s, bank: [...s.bank, { kind: 'word', word: trimmed }] }
}

export function giveHint(s: GameState, selection: number[]): GameState {
  if (s.status !== 'playing' || s.phase !== 'hinting') {
    throw new Error('cannot give a hint right now')
  }
  if (selection.length === 0) {
    throw new Error('a hint must use at least one word')
  }
  for (const i of new Set(selection)) {
    const entry = s.bank[i]
    if (!entry) throw new Error(`no bank slot at index ${i}`)
    if (entry.kind !== 'word') throw new Error('reroll markers cannot be used as hint words')
  }
  return { ...s, hintCount: s.hintCount + 1, phase: 'resolving' }
}

interface Resolution {
  correctGuesserId?: string
  // Extra guesses per player in this one hint (beyond their first), each -1.
  overguesses?: Record<string, number>
  // Host modes have no deck. The host types the answer that just landed; it is
  // stored on the result. Omitted in deck modes, where the answer comes from the deck.
  answer?: string
}

export function resolveHint(s: GameState, outcome: Resolution = {}): GameState {
  if (s.status !== 'playing' || s.phase !== 'resolving') {
    throw new Error('no hint is awaiting resolution')
  }

  let overguesses = s.overguesses
  if (outcome.overguesses) {
    overguesses = { ...overguesses }
    for (const [pid, extra] of Object.entries(outcome.overguesses)) {
      if (extra < 0) throw new Error('overguess count cannot be negative')
      if (extra > 0) overguesses[pid] = (overguesses[pid] ?? 0) + extra
    }
  }

  const { correctGuesserId } = outcome
  if (correctGuesserId === undefined) {
    return { ...s, overguesses, phase: 'hinting' }
  }

  if (correctGuesserId === s.hinterId) throw new Error('the hinter cannot guess')
  if (!s.players.includes(correctGuesserId)) throw new Error('unknown guesser')

  const answer = outcome.answer ?? s.deck[s.cursor]
  const resolved = s.resolved + 1
  const cursor = s.cursor + 1
  let done = resolved >= s.answersPerGame
  let deck = s.deck
  let rerolled = s.rerolled
  let endedEarly = s.endedEarly
  // Deck modes: when the fresh deck is spent, the next answer comes from the
  // rerolled pile. With nothing there either, the turn completes cleanly (like
  // an End Turn, no penalty) rather than stranding the game without an answer.
  // Clamped deals make this end unreachable in practice; it is the backstop.
  if (!done && deck.length > 0 && cursor >= deck.length) {
    if (rerolled.length > 0) {
      deck = [...deck, rerolled[0]]
      rerolled = rerolled.slice(1)
    } else {
      done = true
      endedEarly = true
    }
  }
  return {
    ...s,
    overguesses,
    correctGuesses: {
      ...s.correctGuesses,
      [correctGuesserId]: (s.correctGuesses[correctGuesserId] ?? 0) + 1,
    },
    results: [...s.results, { answer, guesserId: correctGuesserId }],
    resolved,
    cursor,
    deck,
    rerolled,
    endedEarly,
    phase: 'hinting',
    status: done ? 'complete' : 'playing',
  }
}

// Deck modes: whether the current answer came back from the rerolled pile
// rather than the dealt deck. Recycled serves sit past the dealt length, so
// the cursor position is the whole test. The UI uses this as the small tell
// that a repeat is deliberate.
export const answerIsRecycled = (s: GameState): boolean =>
  s.status === 'playing' && s.deck.length > 0 && s.cursor >= s.dealt

// Pure text fixes for typos. Both keep the array length and every score-bearing
// field identical, so bank size, scores, and rotation are untouched (the
// append-only rule still holds). They are mode-agnostic; the UI decides whether
// editing is reachable via canEditMode.
export function editWord(s: GameState, index: number, text: string): GameState {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('a hint word cannot be empty')
  const entry = s.bank[index]
  if (!entry) throw new Error(`no bank slot at index ${index}`)
  if (entry.kind !== 'word') throw new Error('only hint words can be edited, not reroll markers')
  const bank = s.bank.map((e, i) => (i === index ? { kind: 'word' as const, word: trimmed } : e))
  return { ...s, bank }
}

export function editResult(s: GameState, index: number, text: string): GameState {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('a landed answer cannot be empty')
  const result = s.results[index]
  if (!result) throw new Error(`no result at index ${index}`)
  const results = s.results.map((r, i) => (i === index ? { ...r, answer: trimmed } : r))
  return { ...s, results }
}

export function reroll(s: GameState): GameState {
  if (!canReroll(s)) {
    throw new Error('cannot reroll: bank is full, a hint is awaiting resolution, or no other answer is left')
  }
  const bank = [...s.bank, { kind: 'reroll' as const }]
  // Host modes have no deck. The hinter rerolls against their own source, so this
  // only drops the marker (still costs the slot, same -1) and leaves the cursor be.
  if (s.deck.length === 0) {
    return { ...s, bank }
  }
  const current = s.deck[s.cursor]
  if (s.cursor + 1 < s.deck.length) {
    return { ...s, bank, rerolled: [...s.rerolled, current], cursor: s.cursor + 1 }
  }
  // Fresh deck spent: recycle the oldest rerolled answer that is not the current
  // one, serving it by appending it to the deck. A rerolled answer coming back
  // is expected in small pools.
  const i = s.rerolled.findIndex((a) => a !== current)
  const rerolled = [...s.rerolled.slice(0, i), ...s.rerolled.slice(i + 1), current]
  return { ...s, bank, deck: [...s.deck, s.rerolled[i]], rerolled, cursor: s.cursor + 1 }
}

export function endTurn(s: GameState): GameState {
  if (!canEndTurn(s)) throw new Error('end turn is only available once the bank is full')
  return { ...s, endedEarly: true, status: 'complete' }
}

// Score is based on bank size. Every filled slot costs 1, words and reroll
// markers alike, so a reroll's marker is a real -1. hintCount is just a round
// counter for the UI and stays out of scoring on purpose. Ending early is not
// penalized: endedEarly is recorded but does not affect the score.
export function hinterScore(s: GameState): number {
  return s.hinterBase - s.bank.length
}

export function guesserScore(s: GameState, playerId: string): number {
  return (s.correctGuesses[playerId] ?? 0) - (s.overguesses[playerId] ?? 0)
}

export function gameScores(s: GameState): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const pid of s.players) {
    scores[pid] = pid === s.hinterId ? hinterScore(s) : guesserScore(s, pid)
  }
  return scores
}
