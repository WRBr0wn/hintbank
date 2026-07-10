// The shared multiplayer protocol: room state machine types, wire message
// types, and the role-filtered views each seat receives. One source of truth
// imported by both the client and the future Cloudflare worker, so the two
// cannot disagree about shapes. No React, no DOM, no Node, no network. The
// room layer wraps the engine; it never modifies it.

import type { BankEntry, GamePhase, GameResult, GameState, GameStatus } from '../engine'
import type { TagValue } from '../editions/terms'

// Carried on every message crossing the wire, both directions. The server
// rejects mismatched clients, so a worker deploy can precede the Pages deploy
// safely.
export const PROTOCOL_VERSION = 1

// Server-enforced caps. Client controls may mirror them, but the guards in
// messages.ts are the enforcement.
export const MAX_NAME_LENGTH = 12
export const MAX_WORD_LENGTH = 40
export const MAX_GUESS_LENGTH = 80

// Room codes use an unambiguous alphabet: no 0/O/1/I. The worker generates
// codes; the validator is shared so the join form and the server agree on
// what a code is.
export const ROOM_CODE_LENGTH = 6
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type SeatId = string
export type SeatRole = 'player' | 'spectator'
export type SeatConnection = 'connected' | 'reconnecting'

// Voice mode ships first; typed-guess mode is reserved in the protocol from
// day one so it lands later as an addition, not a rework.
export type OnlineMode = 'voice' | 'typed'

export interface Seat {
  id: SeatId
  name: string
  // The avatar key the joiner picked (an emoji value or an image path).
  // Opaque here; the client resolves it against the edition's picker set.
  avatar: string
  role: SeatRole
  connection: SeatConnection
  // Joined mid-turn: watches the public board and enters the rotation at the
  // next turn boundary.
  pending: boolean
}

// Host-edited room state, broadcast live so nobody starts under settings they
// never saw. Mirrors the local GameSettings minus roster and mode: the roster
// is the seats, and the mode is online multiplayer by construction.
export interface RoomSettings {
  categoryIds: string[]
  difficultyBase: number
  answersPerGame: number
  tagValues: TagValue[]
  onlineMode: OnlineMode
}

// lobby -> interstitial (the incoming hinter confirms readiness) -> turn,
// looping until the rotation queue empties into the leaderboard. End of
// session keeps the room: the leaderboard leads back to the interstitial or
// the lobby, never out.
export type RoomPhase = 'lobby' | 'interstitial' | 'turn' | 'leaderboard'

export interface RoomSession {
  // Seats still to hint this rotation, current or next hinter first. The room
  // owns rotation (not the engine session) because a multiplayer roster
  // changes mid-session: late joiners append at turn boundaries, leavers
  // drop out.
  queue: SeatId[]
  completedRotations: number
}

// A guess in the public feed: who picked what and whether it landed the current
// answer. Safe for every seat and for streaming by the same construction as the
// guesser board: a wrong pick is not the answer, and a correct pick only enters
// the feed as it lands (public through results too), so the current unresolved
// answer never appears here.
export interface GuessFeedEntry {
  guesserId: SeatId
  term: string
  correct: boolean
}

// The room's record of a guess: the public entry plus the hint it was made
// against, keyed by the engine's hintCount (which ticks once per hint, no matter
// how many words were added). hintIndex stays server-side; it attributes an
// overguess to the hint it answered (per MULTIPLAYER.md) and is dropped from the
// view. Bank size cannot be the key: a hinter adds zero or several words per
// hint, so bank size does not map one-to-one to hints.
export interface RecordedGuess extends GuessFeedEntry {
  hintIndex: number
}

export interface RoomState {
  editionId: string
  code: string
  // Join order. Host migration hands the room to the first remaining player.
  seats: Seat[]
  hostId: SeatId | null
  locked: boolean
  settings: RoomSettings
  // The cross-session scoreboard, room-owned so Continue keeps totals across a
  // fresh rotation while Play Again and Change Settings both zero them. Players
  // only; spectators never appear.
  totals: Record<SeatId, number>
  phase: RoomPhase
  session: RoomSession | null
  game: GameState | null
  // Typed-guess mode's public guess feed for the current turn, reset each turn.
  // Empty in voice mode. The reducer scans it to tell a guesser's first pick on
  // a hint from a repeat; the view exposes it without hintIndex.
  guessFeed: RecordedGuess[]
  // Typed-guess mode: the current hint the hinter gave, as bank word indices in
  // the order selected. Null when no hint is open (voice mode, or between hints).
  // Bank indices only, never the answer, so it is safe on every seat's board.
  currentHint: number[] | null
}

// ---- Role-filtered views ----
// The anti-cheat spine. Guesser- and spectator-bound data never contains the
// current answer, the deck, or the rerolled pile; the hinter's own view adds
// the current answer and the recycled tell, never the full deck.

export interface SeatView {
  id: SeatId
  name: string
  avatar: string
  role: SeatRole
  connection: SeatConnection
  pending: boolean
}

// The public slice of a turn, safe for every seat, which is what makes the
// guesser board streamable. Landed answers (results) are public: answers
// reach guessers only after resolution.
export interface PublicGameView {
  hinterId: SeatId
  bank: BankEntry[]
  hintCount: number
  resolved: number
  answersPerGame: number
  cutoff: number
  correctGuesses: Record<SeatId, number>
  overguesses: Record<SeatId, number>
  results: GameResult[]
  endedEarly: boolean
  phase: GamePhase
  status: GameStatus
  // Typed-guess mode's public guess feed for this turn: who picked what and how
  // it resolved. Empty in voice mode. Streamable by construction (see
  // GuessFeedEntry).
  feed: GuessFeedEntry[]
  // Typed-guess mode: the current hint, as bank word indices in the order the
  // hinter selected them, shown on every board so guessers see what they name.
  // Bank indices only, never the answer. Null when no hint is open.
  currentHint: number[] | null
}

// The hinter's private extras. The capability flags ride here because they
// depend on deck internals no client is ever sent.
export interface HinterView {
  currentAnswer: string | null
  answerIsRecycled: boolean
  canAddWord: boolean
  canReroll: boolean
  canEndTurn: boolean
}

export interface SessionView {
  upNext: SeatId | null
  queue: SeatId[]
  completedRotations: number
}

export interface RoomView {
  editionId: string
  code: string
  phase: RoomPhase
  locked: boolean
  hostId: SeatId | null
  settings: RoomSettings
  seats: SeatView[]
  totals: Record<SeatId, number>
  you: SeatId
  session: SessionView | null
  game: PublicGameView | null
  // Present only on the current hinter's own view.
  hinter: HinterView | null
}

// ---- Wire messages ----
// JSON over one WebSocket per player. Server state is the only state: any
// client can request a snapshot and re-render from scratch, so reconnect and
// missed-message recovery share one code path.

// Mirrors the engine's Resolution minus the typed answer, which only host
// modes use; in multiplayer the server's deck is the only answer source.
export interface ResolveOutcome {
  correctGuesserId?: SeatId
  overguesses?: Record<SeatId, number>
}

export type ClientMessage =
  | { v: number; type: 'join'; name: string; avatar: string; spectator?: boolean; token?: string }
  | { v: number; type: 'leave' }
  | { v: number; type: 'requestSnapshot' }
  | { v: number; type: 'updateSettings'; settings: Partial<RoomSettings> }
  | { v: number; type: 'setLocked'; locked: boolean }
  | { v: number; type: 'kick'; seatId: SeatId }
  | { v: number; type: 'start' }
  // The incoming hinter confirms readiness at the interstitial; the server
  // deals on receipt.
  | { v: number; type: 'ready' }
  | { v: number; type: 'skipHinter' }
  | { v: number; type: 'addWord'; word: string }
  | { v: number; type: 'giveHint'; selection: number[] }
  | { v: number; type: 'resolve'; outcome: ResolveOutcome }
  | { v: number; type: 'reroll' }
  | { v: number; type: 'endTurn' }
  | { v: number; type: 'finishTurn' }
  | { v: number; type: 'forceEndTurn' }
  // Typed-guess mode. hintIndex is the hint the guess answers, the engine's
  // hintCount the guess was made against: a guess can be in flight while the
  // hinter gives the next hint, and the server scores it against the hint it
  // answered, not whatever is current on arrival.
  | { v: number; type: 'guess'; term: string; hintIndex: number }
  | { v: number; type: 'continueSession' }
  | { v: number; type: 'playAgain' }
  | { v: number; type: 'resetSession' }
  | { v: number; type: 'closeRoom' }

export type RoomErrorCode =
  | 'bad-version'
  | 'bad-message'
  | 'unknown-seat'
  | 'seat-taken'
  | 'room-locked'
  | 'name-taken'
  | 'bad-name'
  | 'bad-settings'
  | 'not-host'
  | 'not-hinter'
  | 'not-allowed'
  | 'not-up-next'
  | 'wrong-phase'
  | 'need-more-players'
  | 'no-categories'
  | 'empty-deck'
  | 'unsupported'
  | 'illegal-action'

export type ServerMessage =
  | { v: number; type: 'welcome'; seatId: SeatId; token: string; view: RoomView }
  | { v: number; type: 'snapshot'; view: RoomView }
  | { v: number; type: 'error'; code: RoomErrorCode; message: string }
  | { v: number; type: 'kicked' }
  | { v: number; type: 'roomClosed'; reason: 'expired' | 'closed' }

// Thrown by the reducer and the message guards; the worker maps it onto an
// error message for the offending client.
export class RoomError extends Error {
  code: RoomErrorCode
  constructor(code: RoomErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

// Throw helper with a never return, so guards read as straight-line code and
// narrow what follows them (a function declaration, so control-flow analysis
// recognizes the never and narrows past the call).
export function fail(code: RoomErrorCode, message: string): never {
  throw new RoomError(code, message)
}
