// Engine domain types: headless game state, no React or presentation concerns.
// UI presentation types (e.g. Player name/avatar) live in src/types.ts — don't
// mix the two.

export const BANK_CAP = 40
export const ANSWERS_PER_GAME = 10
export const GIVER_BASE = 25
export const END_TURN_PENALTY = 5

// An answer is an opaque token. The engine never inspects it; the UI maps it to
// whatever the edition bundles (a Pokemon name, an item, a town). This is what
// keeps the engine category-agnostic.
export type Answer = string

// The bank holds words the giver added plus reroll markers. Markers occupy a
// slot toward the cap but can never be used as a hint word.
export type BankEntry =
  | { kind: 'word'; word: string }
  | { kind: 'reroll' }

export type GamePhase = 'hinting' | 'resolving'
export type GameStatus = 'playing' | 'complete'

export interface GameResult {
  answer: Answer
  guesserId: string
}

export interface GameState {
  players: string[]
  giverId: string
  // Pre-shuffled by the caller; the engine draws from the front. cursor points
  // at the current answer, so randomness stays out of the pure core.
  deck: Answer[]
  cursor: number
  resolved: number
  bank: BankEntry[]
  hintCount: number
  correctGuesses: Record<string, number>
  overguesses: Record<string, number>
  results: GameResult[]
  endedEarly: boolean
  phase: GamePhase
  status: GameStatus
}

export interface SessionState {
  players: string[]
  totals: Record<string, number>
  // Index into players for the current hint giver. Equal to players.length once
  // every player has given in this rotation.
  giverPosition: number
  completedRotations: number
}
