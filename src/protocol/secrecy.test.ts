// The secrecy invariant, asserted structurally. A turn is driven to several
// states (fresh, mid-hint, after a reroll, after a landed answer) and every
// non-hinter view plus every server message bound for a non-hinter is
// serialized and searched: the unresolved answers, the deck, the rerolled
// pile, and the deck-internal keys must never appear. The hinter's own view
// carries the current answer but never the rest of the deck.
import { describe, expect, it } from 'vitest'
import {
  createRoom,
  defaultRoomSettings,
  hinterAddWord,
  hinterGiveHint,
  hinterReroll,
  hinterResolve,
  join,
  start,
  startTurn,
  submitGuess,
  typedGiveHint,
  type IntentDeps,
} from './room'
import { viewFor } from './views'
import { PROTOCOL_VERSION, type RoomSettings, type RoomState, type ServerMessage } from './types'

// Distinctive, greppable answer tokens so a leak is unmistakable in the
// serialized output. The deck is larger than the turn so several answers stay
// unresolved (and secret) throughout.
const SECRET_DECK = [
  'SECRET_ANSWER_ALPHA',
  'SECRET_ANSWER_BRAVO',
  'SECRET_ANSWER_CHARLIE',
  'SECRET_ANSWER_DELTA',
  'SECRET_ANSWER_ECHO',
  'SECRET_ANSWER_FOXTROT',
  'SECRET_ANSWER_GOLF',
  'SECRET_ANSWER_HOTEL',
]
// A wrong pick a guesser can submit in typed mode: in the pool, but not an
// answer, so its appearance in the feed is safe.
const WRONG_PICK = 'WRONG_PICK_ZULU'
const pool = () => [...SECRET_DECK, WRONG_PICK]
const deps: IntentDeps = { dealDeck: () => [...SECRET_DECK], poolFor: pool }

function roomInTurn(): RoomState {
  let room = createRoom({
    code: 'ABC234',
    editionId: 'geography',
    host: { seatId: 'hinter', name: 'Ann', avatar: 'fox' },
    settings: defaultRoomSettings(['countries']),
  })
  room = join(room, { seatId: 'guesser', name: 'Bob', avatar: 'turtle' })
  room = join(room, { seatId: 'watcher', name: 'Sam', avatar: 'ghost', spectator: true })
  room = start(room, 'hinter')
  return startTurn(room, 'hinter', deps.dealDeck(room.settings))
}

// The answers that have NOT yet resolved in this state: still secret. A
// resolved answer legitimately appears in the public results, so it is
// excluded from the leak search.
function unresolvedAnswers(room: RoomState): string[] {
  const landed = new Set((room.game?.results ?? []).map((r) => r.answer))
  return SECRET_DECK.filter((a) => !landed.has(a))
}

// Deck-internal keys that must never ride any view, hinter included.
const FORBIDDEN_KEYS = ['deck', 'rerolled', 'cursor', 'dealt']

function assertNoSecrets(payload: unknown, room: RoomState) {
  const serialized = JSON.stringify(payload)
  for (const answer of unresolvedAnswers(room)) {
    expect(serialized).not.toContain(answer)
  }
  for (const key of FORBIDDEN_KEYS) {
    expect(serialized).not.toContain(`"${key}"`)
  }
}

// The states a turn passes through, each exercising a different code path in
// the view derivation.
function turnStates(): Array<{ label: string; room: RoomState }> {
  const states: Array<{ label: string; room: RoomState }> = []
  let room = roomInTurn()
  states.push({ label: 'fresh turn', room })
  room = hinterAddWord(room, 'hinter', 'clue')
  states.push({ label: 'one word banked', room })
  room = hinterReroll(room, 'hinter')
  states.push({ label: 'after a reroll', room })
  room = hinterGiveHint(room, 'hinter', [0])
  states.push({ label: 'hint awaiting resolution', room })
  room = hinterResolve(room, 'hinter', { correctGuesserId: 'guesser' })
  states.push({ label: 'one answer landed', room })
  return states
}

describe('guesser and spectator views carry no secrets', () => {
  for (const seatId of ['guesser', 'watcher']) {
    it(`never leaks an unresolved answer or the deck to ${seatId}`, () => {
      for (const { label, room } of turnStates()) {
        const view = viewFor(room, seatId)
        expect(view.hinter, label).toBeNull()
        assertNoSecrets(view, room)
      }
    })
  }

  it('shows the voice-mode hint as bank indices to every seat, never the answer', () => {
    let room = roomInTurn()
    room = hinterAddWord(room, 'hinter', 'clue')
    room = hinterGiveHint(room, 'hinter', [0])
    for (const seatId of ['guesser', 'watcher']) {
      const view = viewFor(room, seatId)
      // The hint is bank word indices in order, safe on every board.
      expect(view.game?.currentHint).toEqual([0])
      expect(view.hinter).toBeNull()
      assertNoSecrets(view, room)
    }
    // Resolution closes the hint, so it leaves every later view.
    room = hinterResolve(room, 'hinter', { correctGuesserId: 'guesser' })
    expect(viewFor(room, 'guesser').game?.currentHint).toBeNull()
  })
})

describe('the hinter view carries the current answer but not the whole deck', () => {
  it('exposes the current answer to the hinter only', () => {
    const room = roomInTurn()
    const hinterView = viewFor(room, 'hinter')
    expect(hinterView.hinter?.currentAnswer).toBe('SECRET_ANSWER_ALPHA')
    // The guesser sees no current answer at all.
    expect(viewFor(room, 'guesser').hinter).toBeNull()
  })

  it('never carries the rest of the deck to the hinter', () => {
    const room = roomInTurn()
    const serialized = JSON.stringify(viewFor(room, 'hinter'))
    // The current answer is allowed; every later, unseen answer is not.
    for (const answer of SECRET_DECK.slice(1)) {
      expect(serialized).not.toContain(answer)
    }
    for (const key of FORBIDDEN_KEYS) {
      expect(serialized).not.toContain(`"${key}"`)
    }
  })
})

describe('server messages bound for a non-hinter carry no secrets', () => {
  it('holds for snapshot and welcome payloads', () => {
    for (const { room } of turnStates()) {
      for (const seatId of ['guesser', 'watcher']) {
        const view = viewFor(room, seatId)
        const snapshot: ServerMessage = { v: PROTOCOL_VERSION, type: 'snapshot', view }
        const welcome: ServerMessage = { v: PROTOCOL_VERSION, type: 'welcome', seatId, token: 'tok', view }
        assertNoSecrets(snapshot, room)
        assertNoSecrets(welcome, room)
      }
    }
  })

  it('landed answers reach guessers only through public results', () => {
    let room = roomInTurn()
    room = hinterAddWord(room, 'hinter', 'clue')
    room = hinterGiveHint(room, 'hinter', [0])
    room = hinterResolve(room, 'hinter', { correctGuesserId: 'guesser' })
    const view = viewFor(room, 'guesser')
    // The one resolved answer is public; the rest stay secret.
    expect(view.game?.results.map((r) => r.answer)).toEqual(['SECRET_ANSWER_ALPHA'])
    assertNoSecrets(view, room)
  })
})

// Typed mode adds the guess feed to every view. It carries submitted picks, so
// the secrecy contract is that the current unresolved answer never appears in it
// before it lands: a wrong pick is not the answer, and a correct pick enters the
// feed only as it resolves (public through results too).
describe('typed mode: the guess feed carries no secrets', () => {
  const typedSettings = (): RoomSettings => ({ ...defaultRoomSettings(['countries']), onlineMode: 'typed' })

  function typedRoomInTurn(): RoomState {
    let room = createRoom({
      code: 'ABC234',
      editionId: 'geography',
      host: { seatId: 'hinter', name: 'Ann', avatar: 'fox' },
      settings: typedSettings(),
    })
    room = join(room, { seatId: 'guesser', name: 'Bob', avatar: 'turtle' })
    room = join(room, { seatId: 'watcher', name: 'Sam', avatar: 'ghost', spectator: true })
    room = start(room, 'hinter')
    room = startTurn(room, 'hinter', deps.dealDeck(room.settings))
    room = hinterAddWord(room, 'hinter', 'clue')
    return typedGiveHint(room, 'hinter', [0])
  }

  it('never leaks an unresolved answer through the feed to a guesser or spectator', () => {
    let room = typedRoomInTurn()
    room = submitGuess(room, 'guesser', WRONG_PICK, 1, pool) // a wrong pick, safe to show
    room = submitGuess(room, 'guesser', 'SECRET_ANSWER_ALPHA', 1, pool) // lands, now public
    for (const seatId of ['guesser', 'watcher']) {
      const view = viewFor(room, seatId)
      expect(view.hinter).toBeNull()
      // The feed is present and shows both picks; the current unresolved answer
      // never appears in it.
      expect(view.game?.feed).toHaveLength(2)
      const current = room.game?.deck[room.game.cursor]
      expect(JSON.stringify(view.game?.feed)).not.toContain(current)
      assertNoSecrets(view, room)
    }
  })

  it('shows a wrong pick without exposing the current answer', () => {
    let room = typedRoomInTurn()
    room = submitGuess(room, 'guesser', WRONG_PICK, 1, pool)
    const view = viewFor(room, 'guesser')
    expect(view.game?.feed).toEqual([{ guesserId: 'guesser', term: WRONG_PICK, correct: false }])
    assertNoSecrets(view, room)
  })

  it('shows the current hint as bank indices to every seat, never the answer', () => {
    const room = typedRoomInTurn()
    for (const seatId of ['guesser', 'watcher']) {
      const view = viewFor(room, seatId)
      // The hint is bank word indices in order, safe on every board.
      expect(view.game?.currentHint).toEqual([0])
      expect(view.hinter).toBeNull()
      assertNoSecrets(view, room)
    }
  })
})
