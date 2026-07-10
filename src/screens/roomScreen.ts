import { avatarByKey } from '../avatars'
import { gamePath, type Edition } from '../editions'
import type { Intent, NetStatus } from '../net'
import type { PublicGameView, RoomView, SeatView } from '../protocol'
import type { PlayerAvatar } from '../types'

// The props every in-room play screen takes: the latest server view, who you
// are, the connection status (for presence), and the two ways to act (send an
// intent, or leave). Each screen is a pure projection of the view.
export interface ScreenProps {
  view: RoomView
  seatId: string
  connection: NetStatus
  avatars: PlayerAvatar[]
  edition: Edition
  onSend: (intent: Intent) => void
  onLeave: () => void
}

export const playerSeats = (view: RoomView): SeatView[] => view.seats.filter((s) => s.role === 'player')

export const seatById = (view: RoomView, id: string | null): SeatView | null =>
  view.seats.find((s) => s.id === id) ?? null

export const avatarOf = (avatars: PlayerAvatar[], seat: SeatView): PlayerAvatar =>
  avatarByKey(avatars, seat.avatar)

// Opens the room's board view in a new tab: the share link with the watch
// flag, which auto-joins as a spectator (the neutral, secret-free board for a
// stream capture or a shared TV). The code rides the URL, never the screen, so
// the masking rules hold.
export function openBoardView(editionId: string, code: string): void {
  window.open(`${location.origin}${gamePath(editionId)}?room=${code}&watch=1`, '_blank', 'noopener')
}

// The Change Settings meaning, worded once: the leaderboard button and the
// room menu's host option describe the same resetSession, so the two surfaces
// cannot drift.
export const CHANGE_SETTINGS_DESC = 'Back to the lobby to change players or settings, scores back to 0.'

export interface RoomMenuOptions {
  // becomeSpectator: a non-host player in a live session steps out of play,
  // forfeiting their points this game.
  switchToWatching: boolean
  // becomePlayer: a spectator (board views included) takes a player seat.
  joinGame: boolean
  // resetSession: the host pulls everyone back to the lobby, any in-session
  // phase.
  backToLobby: boolean
}

// Which room-menu options a seat's view yields; Stay and Leave room are
// unconditional and not listed. Options appear only when they mean something,
// so the reducer's refusals (already that role, lobby reset) are unreachable
// from an honest menu. Pure, so the matrix is unit-tested.
export function roomMenuOptions(view: RoomView, seatId: string): RoomMenuOptions {
  const role = seatById(view, seatId)?.role
  const isHost = view.hostId === seatId
  const inSession = view.phase !== 'lobby'
  return {
    switchToWatching: role === 'player' && !isHost && inSession,
    joinGame: role === 'spectator',
    backToLobby: isHost && inSession,
  }
}

export interface SeatScore {
  // The seat's total to display now: session total plus any live guesser
  // points this turn.
  total: number
  isHinter: boolean
  // The hinter's turn delta is unknown while playing (shown as "+ ?").
  pending: boolean
  // Once the turn completes, the hinter's resolved delta (cutoff minus bank
  // entries, can be negative); null otherwise.
  delta: number | null
}

// A seat's score as the boards display it, mirroring the local ScoreBar but from
// the view. Guessers tick up live as they land answers; the hinter's session
// total holds until the turn is recorded. Pure, so it is unit-tested.
export function seatScore(view: RoomView, game: PublicGameView | null, seatId: string): SeatScore {
  const base = view.totals[seatId] ?? 0
  const isHinter = game != null && seatId === game.hinterId
  if (!game || isHinter) {
    return {
      total: base,
      isHinter,
      pending: isHinter && game != null && game.status === 'playing',
      delta: isHinter && game != null && game.status === 'complete' ? game.cutoff - game.bank.length : null,
    }
  }
  const live = (game.correctGuesses[seatId] ?? 0) - (game.overguesses[seatId] ?? 0)
  return { total: base + live, isHinter: false, pending: false, delta: null }
}
