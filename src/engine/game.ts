import {
  ANSWERS_PER_GAME,
  BANK_CAP,
  END_TURN_PENALTY,
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
}

export function createGame({ players, hinterId, deck = [] }: NewGame): GameState {
  if (!players.includes(hinterId)) {
    throw new Error('hinter must be one of the players')
  }
  // A dealt deck needs enough cards to land 10 answers even after a bank's worth
  // of rerolls. An empty deck means a host mode, where there is nothing to draw.
  if (deck.length > 0 && deck.length < ANSWERS_PER_GAME) {
    throw new Error(`deck needs at least ${ANSWERS_PER_GAME} answers`)
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
  }
}

export const isBankFull = (s: GameState): boolean => s.bank.length >= BANK_CAP

export const currentAnswer = (s: GameState): Answer | null =>
  s.status === 'playing' ? (s.deck[s.cursor] ?? null) : null

export const usableWords = (s: GameState): number[] =>
  s.bank.flatMap((entry, i) => (entry.kind === 'word' ? [i] : []))

export const canAddWord = (s: GameState): boolean =>
  s.status === 'playing' && s.phase === 'hinting' && !isBankFull(s)

export const canReroll = (s: GameState): boolean =>
  s.status === 'playing' && s.phase === 'hinting' && !isBankFull(s)

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
  const done = resolved >= ANSWERS_PER_GAME
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
// counter for the UI and stays out of scoring on purpose.
export function hinterScore(s: GameState): number {
  return HINTER_BASE - s.bank.length - (s.endedEarly ? END_TURN_PENALTY : 0)
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
