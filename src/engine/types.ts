// Engine domain types. Headless game state, no React or presentation concerns.
// UI presentation types (player name, avatar) live in src/types.ts. Keep the two
// apart.

// BANK_CAP is fixed for every game and is never a setting. HINTER_BASE and
// ANSWERS_PER_GAME are the defaults for the two per-session settings (the
// difficulty cutoff and the answers-per-turn count); callers that omit them, and
// the existing tests, fall back to these values.
export const BANK_CAP = 40
export const ANSWERS_PER_GAME = 10
export const HINTER_BASE = 25

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

// Editing hint words and landed answers is a trusted-context capability: it lets
// the operator fix a typo without ever changing bank size, score, or rotation.
// Every mode today runs on a single trusted device, so editing is safe and this
// returns true. Online multiplayer will run across untrusted devices, where
// retroactively editing a hint or answer is a cheating vector, so it returns false
// there. This single seam gates every edit affordance in the UI; a future setup
// "Allow edits" toggle can be folded in here (e.g. an override argument) without
// rearchitecting the screens.
export function canEditMode(mode: GameMode): boolean {
  return mode !== 'online-multiplayer'
}

export interface GameResult {
  answer: Answer
  guesserId: string
}

export interface GameState {
  players: string[]
  hinterId: string
  // Caller shuffles this; engine draws from the front. cursor marks the current
  // answer, which keeps randomness out of the pure engine.
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
  // Copied from the session at createGame and locked for the game. Every score and
  // completion check reads these instead of the module-level defaults. hinterBase
  // is the clue cutoff (the hinter's starting score); answersPerGame is how many
  // answers land before the turn ends.
  hinterBase: number
  answersPerGame: number
}

export interface SessionState {
  players: string[]
  totals: Record<string, number>
  // Locked for the whole session. Set once at createSession.
  mode: GameMode
  // Also locked for the session, chosen at setup. hinterBase is the difficulty
  // cutoff (Easy 30 / Regular 25 / Hard 20); answersPerGame is the per-turn answer
  // count (5 to 15). Passed into each createGame.
  hinterBase: number
  answersPerGame: number
  // Index into players for the current hinter. Reaches players.length once
  // everyone has hinted this rotation.
  hinterPosition: number
  completedRotations: number
}
