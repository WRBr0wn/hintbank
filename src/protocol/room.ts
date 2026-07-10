// The room state machine: a pure reducer over RoomState. No network, no
// timers, no randomness; the worker feeds it validated intents and connection
// events, tests feed it directly. Illegal actions throw RoomError, and engine
// rule violations are rethrown as RoomError('illegal-action'), so callers
// handle one error shape. Time-based policy (disconnect grace, room expiry)
// lives in the worker, which decides WHEN to call leave; the reducer only
// records state.

import {
  ANSWERS_PER_GAME,
  HINTER_BASE,
  HINTER_BASE_EASY,
  HINTER_BASE_HARD,
  MAX_ANSWERS,
  MIN_ANSWERS,
  addWord,
  createGame,
  currentAnswer,
  cutoffFor,
  endTurn,
  gameScores,
  giveHint,
  recordOverguess,
  reroll,
  resolveHint,
  type GameState,
} from '../engine'
import {
  MAX_NAME_LENGTH,
  fail,
  RoomError,
  type ClientMessage,
  type RecordedGuess,
  type ResolveOutcome,
  type RoomPhase,
  type RoomSettings,
  type RoomState,
  type Seat,
  type SeatId,
} from './types'

// Engine rule violations surface as protocol errors: one error shape for the
// worker to map onto the wire.
function throughEngine<T>(run: () => T): T {
  try {
    return run()
  } catch (e) {
    throw new RoomError('illegal-action', e instanceof Error ? e.message : String(e))
  }
}

const seatById = (room: RoomState, id: SeatId): Seat | undefined => room.seats.find((s) => s.id === id)

function requireSeat(room: RoomState, id: SeatId): Seat {
  const seat = seatById(room, id)
  if (!seat) fail('unknown-seat', 'no such seat in this room')
  return seat
}

function requireHost(room: RoomState, seatId: SeatId): void {
  if (room.hostId !== seatId) fail('not-host', 'only the host can do that')
}

function requirePhase(room: RoomState, phase: RoomPhase, message: string): void {
  if (room.phase !== phase) fail('wrong-phase', message)
}

const playerSeats = (room: RoomState): Seat[] => room.seats.filter((s) => s.role === 'player')

// Players in the rotation's reach: seated, not spectating, not waiting on a
// turn boundary.
const activePlayers = (room: RoomState): Seat[] => playerSeats(room).filter((s) => !s.pending)

export const upNext = (room: RoomState): SeatId | null => room.session?.queue[0] ?? null

function cleanName(raw: string): string {
  const name = raw.trim()
  if (!name || name.length > MAX_NAME_LENGTH) {
    fail('bad-name', `a name is 1 to ${MAX_NAME_LENGTH} characters`)
  }
  return name
}

export function defaultRoomSettings(categoryIds: string[]): RoomSettings {
  return {
    categoryIds,
    difficultyBase: HINTER_BASE,
    answersPerGame: ANSWERS_PER_GAME,
    tagValues: [],
    onlineMode: 'voice',
  }
}

function validateSettings(s: RoomSettings): void {
  if (![HINTER_BASE_EASY, HINTER_BASE, HINTER_BASE_HARD].includes(s.difficultyBase)) {
    fail('bad-settings', 'difficulty must be one of the three presets')
  }
  if (!Number.isInteger(s.answersPerGame) || s.answersPerGame < MIN_ANSWERS || s.answersPerGame > MAX_ANSWERS) {
    fail('bad-settings', `answers per game is ${MIN_ANSWERS} to ${MAX_ANSWERS}`)
  }
  if (s.onlineMode !== 'voice' && s.onlineMode !== 'typed') {
    fail('bad-settings', 'unknown online mode')
  }
}

export interface NewRoom {
  code: string
  editionId: string
  host: { seatId: SeatId; name: string; avatar: string }
  settings: RoomSettings
}

// The creator is the host. The worker owns code and seat id generation; the
// reducer just seats them.
export function createRoom({ code, editionId, host, settings }: NewRoom): RoomState {
  validateSettings(settings)
  const seat: Seat = {
    id: host.seatId,
    name: cleanName(host.name),
    avatar: host.avatar,
    role: 'player',
    connection: 'connected',
    pending: false,
  }
  return {
    editionId,
    code,
    seats: [seat],
    hostId: seat.id,
    locked: false,
    settings,
    totals: { [seat.id]: 0 },
    phase: 'lobby',
    session: null,
    game: null,
    guessFeed: [],
    currentHint: null,
  }
}

export interface JoinRequest {
  seatId: SeatId
  name: string
  avatar: string
  spectator?: boolean
}

export function join(room: RoomState, req: JoinRequest): RoomState {
  if (room.locked) fail('room-locked', 'this room is locked')
  if (seatById(room, req.seatId)) fail('seat-taken', 'that seat already exists')
  const name = cleanName(req.name)
  if (room.seats.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    fail('name-taken', 'that name is taken, pick another')
  }
  const role = req.spectator ? 'spectator' : 'player'
  // Mid-turn joiners wait on the public board and enter at the next boundary.
  // The interstitial IS a boundary, so a join there slots straight into the
  // rotation queue below.
  const pending = role === 'player' && room.phase === 'turn'
  const seat: Seat = { id: req.seatId, name, avatar: req.avatar, role, connection: 'connected', pending }
  let session = room.session
  if (session && room.phase === 'interstitial' && role === 'player') {
    session = { ...session, queue: [...session.queue, seat.id] }
  }
  const totals = role === 'player' ? { ...room.totals, [seat.id]: 0 } : room.totals
  return { ...room, seats: [...room.seats, seat], totals, session }
}

export function disconnected(room: RoomState, seatId: SeatId): RoomState {
  if (!seatById(room, seatId)) return room
  return {
    ...room,
    seats: room.seats.map((s) => (s.id === seatId ? { ...s, connection: 'reconnecting' as const } : s)),
  }
}

export function reconnected(room: RoomState, seatId: SeatId): RoomState {
  if (!seatById(room, seatId)) return room
  return {
    ...room,
    seats: room.seats.map((s) => (s.id === seatId ? { ...s, connection: 'connected' as const } : s)),
  }
}

// Ends the current turn: banks the game's scores into the room totals, clears
// the hinter's rotation slot, seats mid-turn joiners into the rotation, and
// moves to the next interstitial or the leaderboard. Scores are taken as they
// stand, which is also the forfeit path (End Turn semantics, no extra
// penalty).
function settleTurn(room: RoomState): RoomState {
  const { game, session } = room
  if (!game || !session) return room
  const totals = { ...room.totals }
  for (const [id, delta] of Object.entries(gameScores(game))) {
    // A seat that left keeps nothing; everyone still here keeps what they
    // earned this turn.
    if (id in totals) totals[id] += delta
  }
  const joiners = room.seats.filter((s) => s.pending).map((s) => s.id)
  const seats = room.seats.map((s) => (s.pending ? { ...s, pending: false } : s))
  const queue = [...session.queue.filter((id) => id !== game.hinterId), ...joiners]
  const done = queue.length === 0
  return {
    ...room,
    seats,
    totals,
    game: null,
    currentHint: null,
    session: { queue, completedRotations: session.completedRotations + (done ? 1 : 0) },
    phase: done ? 'leaderboard' : 'interstitial',
  }
}

// Shared by leave and kick. Handles host migration, the rotation queue, a
// departing hinter (their turn settles as a forfeit), and a session that can
// no longer field two players (it ends to the leaderboard; the room
// survives).
function removeSeat(room: RoomState, seatId: SeatId): RoomState {
  const seats = room.seats.filter((s) => s.id !== seatId)
  const totals = { ...room.totals }
  delete totals[seatId]
  let hostId = room.hostId
  if (hostId === seatId) {
    // The longest-present player inherits; a spectator only if no player is
    // left.
    hostId = (seats.find((s) => s.role === 'player') ?? seats[0])?.id ?? null
  }
  let next: RoomState = { ...room, seats, totals, hostId }
  if (next.session) {
    next = { ...next, session: { ...next.session, queue: next.session.queue.filter((id) => id !== seatId) } }
  }
  if (next.phase === 'turn' && next.game?.hinterId === seatId) {
    next = settleTurn(next)
  }
  const midSession = next.phase === 'interstitial' || next.phase === 'turn'
  if (midSession && playerSeats(next).length < 2) {
    if (next.phase === 'turn') next = settleTurn(next)
    next = { ...next, phase: 'leaderboard', game: null }
  }
  return next
}

// Idempotent: a socket can close twice, a grace expiry can race an explicit
// leave.
export function leave(room: RoomState, seatId: SeatId): RoomState {
  if (!seatById(room, seatId)) return room
  return removeSeat(room, seatId)
}

export function kick(room: RoomState, hostId: SeatId, targetId: SeatId): RoomState {
  requireHost(room, hostId)
  if (targetId === hostId) fail('not-allowed', 'the host cannot kick themselves')
  if (!seatById(room, targetId)) fail('unknown-seat', 'no such seat to kick')
  return removeSeat(room, targetId)
}

export function setLocked(room: RoomState, seatId: SeatId, locked: boolean): RoomState {
  requireHost(room, seatId)
  return { ...room, locked }
}

// Settings live in the lobby only, so they have one home and cannot change
// under a running session.
export function updateSettings(room: RoomState, seatId: SeatId, patch: Partial<RoomSettings>): RoomState {
  requireHost(room, seatId)
  requirePhase(room, 'lobby', 'settings can only change in the lobby')
  const settings: RoomSettings = { ...room.settings, ...patch }
  validateSettings(settings)
  return { ...room, settings }
}

export function start(room: RoomState, seatId: SeatId): RoomState {
  requireHost(room, seatId)
  requirePhase(room, 'lobby', 'the game can only start from the lobby')
  if (playerSeats(room).length < 2) fail('need-more-players', 'need one more player')
  if (room.settings.categoryIds.length === 0) fail('no-categories', 'pick at least one category')
  return {
    ...room,
    phase: 'interstitial',
    session: { queue: playerSeats(room).map((s) => s.id), completedRotations: 0 },
    game: null,
  }
}

// The worker deals the deck (filterPool plus its own shuffle) when the
// incoming hinter confirms readiness; injecting the dealt deck keeps the
// reducer deterministic. Small pools clamp the turn and its cutoff, same as
// local play.
export function startTurn(room: RoomState, seatId: SeatId, deck: string[]): RoomState {
  requirePhase(room, 'interstitial', 'a turn starts from the interstitial')
  if (upNext(room) !== seatId) fail('not-up-next', 'it is not your turn to hint')
  if (deck.length === 0) fail('empty-deck', 'the filtered pool has no terms')
  const answers = Math.min(room.settings.answersPerGame, deck.length)
  const game = createGame({
    players: activePlayers(room).map((s) => s.id),
    hinterId: seatId,
    deck,
    hinterBase: cutoffFor(room.settings.difficultyBase, answers),
    answersPerGame: answers,
  })
  // A fresh turn starts with an empty guess feed and no hint. Both modes fill
  // currentHint as hints are given; only typed mode fills the feed.
  return { ...room, phase: 'turn', game, guessFeed: [], currentHint: null }
}

function requireHinterGame(room: RoomState, seatId: SeatId): GameState {
  if (room.phase !== 'turn' || !room.game) fail('wrong-phase', 'no turn is in progress')
  if (room.game.hinterId !== seatId) fail('not-hinter', 'only the hinter can do that')
  return room.game
}

// Typed mode: if a hint is open (the engine is resolving), close it back to
// hinting so the hinter can build the bank or give a new hint, the same way
// voice mode's "keep hinting" returns from resolving. Closing loses no scoring:
// overguesses were already applied as each wrong pick arrived (submitGuess). A
// no-op in voice mode and when no hint is open.
function closeTypedHint(room: RoomState): RoomState {
  if (room.settings.onlineMode !== 'typed') return room
  if (!room.game || room.game.phase !== 'resolving') return room
  return { ...room, game: throughEngine(() => resolveHint(room.game!, {})), currentHint: null }
}

export function hinterAddWord(room: RoomState, seatId: SeatId, word: string): RoomState {
  room = closeTypedHint(room)
  const game = requireHinterGame(room, seatId)
  return { ...room, game: throughEngine(() => addWord(game, word)) }
}

// Give-hint in either mode: runs the engine's giveHint (which ticks hintCount
// and moves to resolving) and stores the selection as the live hint, so every
// board can show which bank words the hint used.
export function hinterGiveHint(room: RoomState, seatId: SeatId, selection: number[]): RoomState {
  const game = requireHinterGame(room, seatId)
  return { ...room, game: throughEngine(() => giveHint(game, selection)), currentHint: [...selection] }
}

// Typed mode's give-hint: the same as voice, except it closes any open hint
// first (a new hint on the same answer, so a fresh free guess per hint). Voice
// never has an open hint here; the engine refuses giveHint while resolving.
export function typedGiveHint(room: RoomState, seatId: SeatId, selection: number[]): RoomState {
  return hinterGiveHint(closeTypedHint(room), seatId, selection)
}

export function hinterResolve(room: RoomState, seatId: SeatId, outcome: ResolveOutcome): RoomState {
  const game = requireHinterGame(room, seatId)
  // Never a typed answer here: the server's deck is the only answer source.
  // Either outcome (landed or keep hinting) closes the hint, so the live hint
  // clears with it.
  return {
    ...room,
    game: throughEngine(() =>
      resolveHint(game, { correctGuesserId: outcome.correctGuesserId, overguesses: outcome.overguesses }),
    ),
    currentHint: null,
  }
}

export function hinterReroll(room: RoomState, seatId: SeatId): RoomState {
  room = closeTypedHint(room)
  const game = requireHinterGame(room, seatId)
  // Typed mode: overguesses already applied stay applied; rerolling the answer
  // away forgives nothing.
  return { ...room, game: throughEngine(() => reroll(game)) }
}

export function hinterEndTurn(room: RoomState, seatId: SeatId): RoomState {
  room = closeTypedHint(room)
  const game = requireHinterGame(room, seatId)
  return { ...room, game: throughEngine(() => endTurn(game)) }
}

// The board stays up as the turn recap once the game completes; the hinter
// (or the host, if the hinter has wandered off) moves the room on.
export function finishTurn(room: RoomState, seatId: SeatId): RoomState {
  if (room.phase !== 'turn' || !room.game) fail('wrong-phase', 'no turn is in progress')
  if (seatId !== room.game.hinterId && seatId !== room.hostId) {
    fail('not-allowed', 'only the hinter or the host can finish the turn')
  }
  if (room.game.status !== 'complete') fail('illegal-action', 'the turn is not over yet')
  return settleTurn(room)
}

// The stalled-hinter escape: once the grace period has passed (the worker's
// clock, not ours), the host ends the turn with End Turn semantics, no
// penalty beyond the forfeit. Refused while the hinter is present and
// connected.
export function forceEndTurn(room: RoomState, seatId: SeatId): RoomState {
  requireHost(room, seatId)
  if (room.phase !== 'turn' || !room.game) fail('wrong-phase', 'no turn is in progress')
  const hinter = seatById(room, room.game.hinterId)
  if (hinter && hinter.connection === 'connected') fail('not-allowed', 'the hinter is still here')
  return settleTurn(room)
}

// Skips an AFK incoming hinter at the interstitial: passes their rotation
// slot, no penalty. An absent guesser costs nothing; an absent hinter stalls
// everyone.
export function skipHinter(room: RoomState, seatId: SeatId): RoomState {
  requireHost(room, seatId)
  requirePhase(room, 'interstitial', 'skipping only happens between turns')
  const session = room.session
  if (!session || session.queue.length === 0) fail('illegal-action', 'nobody is up to hint')
  const queue = session.queue.slice(1)
  const done = queue.length === 0
  return {
    ...room,
    session: { queue, completedRotations: session.completedRotations + (done ? 1 : 0) },
    phase: done ? 'leaderboard' : 'interstitial',
  }
}

export function continueRotation(room: RoomState, seatId: SeatId): RoomState {
  requireHost(room, seatId)
  requirePhase(room, 'leaderboard', 'continue is a leaderboard action')
  const players = playerSeats(room)
  if (players.length < 2) fail('need-more-players', 'need one more player')
  return {
    ...room,
    phase: 'interstitial',
    session: {
      queue: players.map((s) => s.id),
      completedRotations: room.session?.completedRotations ?? 0,
    },
  }
}

// Play Again: an instant rematch. A fresh rotation on the same roster and
// settings, the scoreboard zeroed, straight into the first turn's interstitial
// with no stop at the lobby. The worker deals when the first hinter readies,
// same as any turn start.
export function playAgain(room: RoomState, seatId: SeatId): RoomState {
  requireHost(room, seatId)
  requirePhase(room, 'leaderboard', 'play again is a leaderboard action')
  const players = playerSeats(room)
  if (players.length < 2) fail('need-more-players', 'need one more player')
  const totals: Record<SeatId, number> = {}
  for (const id of Object.keys(room.totals)) totals[id] = 0
  return {
    ...room,
    phase: 'interstitial',
    totals,
    session: { queue: players.map((s) => s.id), completedRotations: 0 },
    game: null,
  }
}

// Change Settings: back to the lobby to adjust the roster or settings, the
// scoreboard zeroed. Same zeroed reset as Play Again, but it stops at the lobby
// to change things first instead of dealing straight in. The wire type stays
// `resetSession` (this is the button now labeled "Change Settings").
export function resetSession(room: RoomState, seatId: SeatId): RoomState {
  requireHost(room, seatId)
  requirePhase(room, 'leaderboard', 'change settings is a leaderboard action')
  const totals: Record<SeatId, number> = {}
  for (const id of Object.keys(room.totals)) totals[id] = 0
  return { ...room, phase: 'lobby', session: null, game: null, totals }
}

// Typed-guess resolution: guessers pick terms and the server adjudicates the
// hint the hinter gave, with no "who guessed it" step. A pick is answered only
// while a hint is open (the engine is resolving). The first correct arrival
// lands the current answer and credits that guesser through resolveHint. A
// guesser's first pick on a given hint (by hintIndex, the engine's hintCount)
// is free; each further wrong pick on that same hint is an overguess applied
// the moment it happens and it sticks, unaffected by a reroll, the turn
// ending, or whether the answer ever lands. That matches voice mode, where a
// hint's overguesses settle when the hint resolves, not when an answer lands.
// All scoring stays in the engine. Active only in typed mode.
export function submitGuess(
  room: RoomState,
  seatId: SeatId,
  term: string,
  hintIndex: number,
  poolFor: (settings: RoomSettings) => string[],
): RoomState {
  if (room.settings.onlineMode !== 'typed') fail('unsupported', 'typed guessing is off in this room')
  const seat = requireSeat(room, seatId)
  // A seated, active guesser only: not a spectator, not a late joiner still
  // waiting on the turn boundary.
  if (seat.role !== 'player' || seat.pending) fail('not-allowed', 'only a seated guesser can guess')
  // Out of window: a pick lands only while a hint is open. With no live turn, or
  // between hints (the hinter is still building the bank), there is nothing to
  // answer, so the pick is dropped, not an error.
  if (room.phase !== 'turn' || !room.game || room.game.status !== 'playing') return room
  const game = room.game
  if (game.phase !== 'resolving') return room
  if (seatId === game.hinterId) fail('not-allowed', 'the hinter does not guess')

  const guess = term.trim()
  // Selection-only play needs no content filtering: a guess must be a term in the
  // room's filtered pool (the same termPasses filter as the deal, via poolFor) or
  // it is rejected.
  if (!poolFor(room.settings).includes(guess)) fail('not-allowed', 'that is not a term in this room')

  // A pick for an answer that already landed (a late arrival after someone beat
  // them to it) is dropped, not scored against the current answer.
  if (game.results.some((r) => r.answer === guess)) return room

  // The hint the pick answers, never claimed beyond the hints that exist (a hint
  // is open, so hintCount >= 1) and never older than the newest hint this guesser
  // has already claimed this turn. Honest guesses arrive in connection order, so
  // a claim below that mark can only be a client minting a fresh free pick on a
  // past hint; it is scored against the newest one instead.
  const newestClaimed = room.guessFeed.reduce(
    (n, g) => (g.guesserId === seatId && g.hintIndex > n ? g.hintIndex : n),
    1,
  )
  const answeredHint = Math.min(Math.max(newestClaimed, Math.trunc(hintIndex)), game.hintCount)
  const entry: RecordedGuess = {
    guesserId: seatId,
    term: guess,
    correct: guess === currentAnswer(game),
    hintIndex: answeredHint,
  }
  const guessFeed = [...room.guessFeed, entry]

  if (!entry.correct) {
    // Any earlier pick of theirs on this hint (hintCount is monotonic across
    // the turn, so the whole feed is scannable) means this one costs a point,
    // applied now and permanently.
    const repeat = room.guessFeed.some((g) => g.guesserId === seatId && g.hintIndex === answeredHint)
    const next = repeat ? throughEngine(() => recordOverguess(game, seatId)) : game
    return { ...room, game: next, guessFeed }
  }

  // First correct arrival: land the answer and credit this guesser through the
  // engine. Overguesses were already applied as the wrong picks arrived.
  const resolved = throughEngine(() => resolveHint(game, { correctGuesserId: seatId }))
  return { ...room, game: resolved, guessFeed, currentHint: null }
}

export interface IntentDeps {
  // Deals a turn's deck from the room settings: filtered pool, shuffled,
  // sized. Injected so the reducer stays deterministic; the worker supplies
  // filterPool plus a real shuffle, tests supply fixed decks.
  dealDeck: (settings: RoomSettings) => string[]
  // The room's full filtered pool (unshuffled, complete), the same termPasses
  // filter as the deal. A typed-mode guess must be a term in this pool;
  // membership is the only validation selection-based guessing needs.
  poolFor: (settings: RoomSettings) => string[]
}

// The wire-facing spine: one validated client message in, the next room state
// out. Sender role, room phase, and engine legality are all checked here or
// downstream; a client disabling a button is convenience, never enforcement.
export function applyIntent(room: RoomState, seatId: SeatId, msg: ClientMessage, deps: IntentDeps): RoomState {
  if (msg.type === 'join') fail('bad-message', 'join is handled at connection time, not as a room intent')
  if (msg.type === 'leave') return leave(room, seatId)
  requireSeat(room, seatId)
  switch (msg.type) {
    case 'requestSnapshot':
      // No state change; the worker answers with a fresh view.
      return room
    case 'updateSettings':
      return updateSettings(room, seatId, msg.settings)
    case 'setLocked':
      return setLocked(room, seatId, msg.locked)
    case 'kick':
      return kick(room, seatId, msg.seatId)
    case 'start':
      return start(room, seatId)
    case 'ready':
      return startTurn(room, seatId, deps.dealDeck(room.settings))
    case 'skipHinter':
      return skipHinter(room, seatId)
    case 'addWord':
      return hinterAddWord(room, seatId, msg.word)
    case 'giveHint':
      // Both modes give hints; typed stores the selection and defers scoring to
      // the server's guess resolution instead of a hinter adjudication.
      return room.settings.onlineMode === 'typed'
        ? typedGiveHint(room, seatId, msg.selection)
        : hinterGiveHint(room, seatId, msg.selection)
    case 'resolve':
      // The "who guessed it" step; typed mode has none (the server resolves).
      if (room.settings.onlineMode === 'typed') fail('not-allowed', 'the hinter does not adjudicate in typed mode')
      return hinterResolve(room, seatId, msg.outcome)
    case 'reroll':
      return hinterReroll(room, seatId)
    case 'endTurn':
      return hinterEndTurn(room, seatId)
    case 'finishTurn':
      return finishTurn(room, seatId)
    case 'forceEndTurn':
      return forceEndTurn(room, seatId)
    case 'guess':
      return submitGuess(room, seatId, msg.term, msg.hintIndex, deps.poolFor)
    case 'continueSession':
      return continueRotation(room, seatId)
    case 'playAgain':
      return playAgain(room, seatId)
    case 'resetSession':
      return resetSession(room, seatId)
    case 'closeRoom':
      // Tearing the room down is the worker's job; the reducer only checks the
      // right to ask for it.
      requireHost(room, seatId)
      return room
  }
}
