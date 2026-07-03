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
  // An empty deck means a host mode, where there is nothing to draw. A dealt deck
  // must at least cover every answer; reroll headroom is the caller's concern.
  if (deck.length > 0 && deck.length < answersPerGame) {
    throw new Error(`deck needs at least ${answersPerGame} answers`)
  }
  return {
    players,
    hinterId,
    deck,
    cursor: 0,
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
// game live, hinting phase, free slot. Exported under both names so the two
// questions still read distinctly at the call sites.
const canBankEntry = (s: GameState): boolean =>
  s.status === 'playing' && s.phase === 'hinting' && !isBankFull(s)

export const canAddWord = canBankEntry
export const canReroll = canBankEntry

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
  const done = resolved >= s.answersPerGame
  return {
    ...s,
    overguesses,
    correctGuesses: {
      ...s.correctGuesses,
      [correctGuesserId]: (s.correctGuesses[correctGuesserId] ?? 0) + 1,
    },
    results: [...s.results, { answer, guesserId: correctGuesserId }],
    resolved,
    cursor: s.cursor + 1,
    phase: 'hinting',
    status: done ? 'complete' : 'playing',
  }
}

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
  if (!canReroll(s)) throw new Error('cannot reroll: bank is full or a hint is awaiting resolution')
  const marker = { kind: 'reroll' as const }
  // Host modes have no deck. The hinter rerolls against their own source, so this
  // only drops the marker (still costs the slot, same -1) and leaves the cursor be.
  if (s.deck.length === 0) {
    return { ...s, bank: [...s.bank, marker] }
  }
  const next = s.cursor + 1
  if (next >= s.deck.length) throw new Error('deck exhausted; cannot reroll')
  return { ...s, bank: [...s.bank, marker], cursor: next }
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
