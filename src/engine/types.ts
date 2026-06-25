// Engine domain types. Headless game state, no React or presentation concerns.
// UI presentation types (player name, avatar) live in src/types.ts. Keep the two
// apart.

export const BANK_CAP = 40
export const ANSWERS_PER_GAME = 10
export const HINTER_BASE = 25
export const END_TURN_PENALTY = 5

// An answer is an opaque token. The engine never inspects it. The UI maps it to
// whatever the edition bundles (a Pokemon name, an item, a town). That's what
// keeps the engine category-agnostic.
export type Answer = string

// The bank holds words the hinter added plus reroll markers. A marker takes up a
// slot against the cap but can never be used as a hint word.
export type BankEntry =
  | { kind: 'word'; word: string }
  | { kind: 'reroll' }

export type GamePhase = 'hinting' | 'resolving'
export type GameStatus = 'playing' | 'complete'

// The play mode, picked at setup and locked for the session. The engine never
// branches on it. It only records how answers are sourced (a dealt deck versus a
// host typing them) so the screens know what to show.
export type GameMode =
  | 'in-person'
  | 'online-one-device'
  | 'online-randomizer'
  | 'online-multiplayer'

export interface GameResult {
  answer: Answer
  guesserId: string
}

export interface GameState {
  players: string[]
  hinterId: string
  // The caller shuffles this; the engine just draws from the front. cursor marks
  // the current answer, which keeps randomness out of the pure core.
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
  // Locked for the whole session. Set once at createSession.
  mode: GameMode
  // Index into players for the current hinter. Reaches players.length once
  // everyone has hinted this rotation.
  hinterPosition: number
  completedRotations: number
}
