// Engine domain types. Headless game state, no React or presentation concerns.
// UI presentation types (player name, avatar) live in src/types.ts. Keep the two
// apart.

// BANK_CAP is fixed for every game and is never a setting. HINTER_BASE and
// ANSWERS_PER_GAME are only the defaults for the two per-session settings (the
// difficulty cutoff and the answers-per-turn count); the easy/hard bases and
// the answers range bound those settings. Every number the rules cite lives
// here, so the setup controls and the rules copy read one source.
export const BANK_CAP = 40
export const ANSWERS_PER_GAME = 10
export const HINTER_BASE = 25
export const HINTER_BASE_EASY = 30
export const HINTER_BASE_HARD = 20
export const MIN_ANSWERS = 5
export const MAX_ANSWERS = 10
// The designed roster: local Setup bounds its player list with these, and the
// multiplayer reducer caps player joins at the same MAX_PLAYERS.
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8

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

// Typo-editing is a trusted-context capability. Every mode today runs on a single
// trusted device, so it is allowed; online multiplayer will run across untrusted
// devices, where retroactive edits are a cheating vector, so it is not.
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
  // Answers rerolled away this turn, oldest first. Once the fresh deck is spent
  // they are served again (appended to the deck), so a small pool never strands
  // the game.
  rerolled: Answer[]
  // The dealt deck length. Recycled serves grow the deck past it, so a cursor at
  // or beyond this marks a recycled answer (answerIsRecycled, the UI's tell).
  dealt: number
  resolved: number
  bank: BankEntry[]
  hintCount: number
  correctGuesses: Record<string, number>
  overguesses: Record<string, number>
  results: GameResult[]
  endedEarly: boolean
  phase: GamePhase
  status: GameStatus
  // Copied from the session at createGame and locked for the game. Scoring and
  // completion read these, not the module-level defaults.
  hinterBase: number
  answersPerGame: number
}

export interface SessionState {
  players: string[]
  totals: Record<string, number>
  // Locked for the whole session. Set once at createSession.
  mode: GameMode
  // Also locked for the session, chosen at setup: the difficulty cutoff and the
  // per-turn answer count. Passed into each createGame.
  hinterBase: number
  answersPerGame: number
  // Index into players for the current hinter. Reaches players.length once
  // everyone has hinted this rotation.
  hinterPosition: number
  completedRotations: number
}
