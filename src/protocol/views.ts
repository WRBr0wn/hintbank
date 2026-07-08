// Role-filtered view derivation: the anti-cheat spine. Every seat's view is
// built here from the full RoomState, and by construction a non-hinter's view
// carries no secret. The guarantee is structural, not a convention: the public
// game view is assembled field by field from a known-safe set (no deck, no
// rerolled pile, no current answer), and only the current hinter's own view
// gets the private extras appended. Secrecy is asserted across every view in
// the tests.

import {
  answerIsRecycled,
  canAddWord,
  canEndTurn,
  canReroll,
  currentAnswer,
  type GameState,
} from '../engine'
import type {
  HinterView,
  PublicGameView,
  RoomState,
  RoomView,
  SeatId,
  SeatView,
  SessionView,
} from './types'

const toSeatView = (s: RoomState['seats'][number]): SeatView => ({
  id: s.id,
  name: s.name,
  avatar: s.avatar,
  role: s.role,
  connection: s.connection,
  pending: s.pending,
})

// The public slice of a turn: safe for every seat, which is what makes the
// guesser board streamable. The deck, the cursor, the rerolled pile, and the
// current answer never appear; landed answers (results) are public because an
// answer only reaches guessers after it resolves.
function publicGame(game: GameState): PublicGameView {
  return {
    hinterId: game.hinterId,
    bank: game.bank,
    hintCount: game.hintCount,
    resolved: game.resolved,
    answersPerGame: game.answersPerGame,
    cutoff: game.hinterBase,
    correctGuesses: game.correctGuesses,
    overguesses: game.overguesses,
    results: game.results,
    endedEarly: game.endedEarly,
    phase: game.phase,
    status: game.status,
  }
}

// The hinter's private extras, added only to the current hinter's own view.
// The capability flags live here, not on the public view, because they read
// deck internals no client is ever sent.
function hinterExtras(game: GameState): HinterView {
  return {
    currentAnswer: currentAnswer(game),
    answerIsRecycled: answerIsRecycled(game),
    canAddWord: canAddWord(game),
    canReroll: canReroll(game),
    canEndTurn: canEndTurn(game),
  }
}

function sessionView(room: RoomState): SessionView | null {
  if (!room.session) return null
  return {
    upNext: room.session.queue[0] ?? null,
    queue: room.session.queue,
    completedRotations: room.session.completedRotations,
  }
}

// The view a given seat receives. The hinter extras are attached only when
// this seat IS the current hinter; guessers and spectators get the public
// view and nothing more.
export function viewFor(room: RoomState, seatId: SeatId): RoomView {
  const game = room.game ? publicGame(room.game) : null
  const isHinter = room.game?.hinterId === seatId && room.phase === 'turn'
  return {
    editionId: room.editionId,
    code: room.code,
    phase: room.phase,
    locked: room.locked,
    hostId: room.hostId,
    settings: room.settings,
    seats: room.seats.map(toSeatView),
    totals: room.totals,
    you: seatId,
    session: sessionView(room),
    game,
    hinter: isHinter && room.game ? hinterExtras(room.game) : null,
  }
}
