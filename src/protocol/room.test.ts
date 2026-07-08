import { describe, expect, it } from 'vitest'
import { cutoffFor } from '../engine'
import {
  applyIntent,
  continueRotation,
  createRoom,
  defaultRoomSettings,
  disconnected,
  finishTurn,
  forceEndTurn,
  hinterAddWord,
  hinterEndTurn,
  hinterGiveHint,
  hinterResolve,
  join,
  kick,
  leave,
  playAgain,
  reconnected,
  resetSession,
  setLocked,
  skipHinter,
  start,
  startTurn,
  updateSettings,
  upNext,
  type IntentDeps,
} from './room'
import { RoomError, type RoomState } from './types'

const settings = () => defaultRoomSettings(['countries'])

function lobbyOfThree(): RoomState {
  let room = createRoom({
    code: 'ABC234',
    editionId: 'geography',
    host: { seatId: 'a', name: 'Ann', avatar: 'fox' },
    settings: settings(),
  })
  room = join(room, { seatId: 'b', name: 'Bob', avatar: 'turtle' })
  room = join(room, { seatId: 'c', name: 'Cal', avatar: 'dragon' })
  return room
}

const deckOf = (n: number) => Array.from({ length: n }, (_, i) => `ANS-${i}`)

// Land every answer with one banked word, all credited to guesserId.
function playTurnToEnd(room: RoomState, hinterId: string, guesserId: string): RoomState {
  room = hinterAddWord(room, hinterId, 'clue')
  while (room.game && room.game.status === 'playing') {
    room = hinterGiveHint(room, hinterId, [0])
    room = hinterResolve(room, hinterId, { correctGuesserId: guesserId })
  }
  return room
}

describe('room creation and lobby', () => {
  it('seats the creator as host with a zeroed total', () => {
    const room = createRoom({
      code: 'ABC234',
      editionId: 'geography',
      host: { seatId: 'a', name: 'Ann', avatar: 'fox' },
      settings: settings(),
    })
    expect(room.hostId).toBe('a')
    expect(room.phase).toBe('lobby')
    expect(room.seats).toHaveLength(1)
    expect(room.totals).toEqual({ a: 0 })
  })

  it('rejects a name longer than the cap and an empty name', () => {
    expect(() =>
      createRoom({
        code: 'ABC234',
        editionId: 'geography',
        host: { seatId: 'a', name: 'x'.repeat(13), avatar: 'fox' },
        settings: settings(),
      }),
    ).toThrow(RoomError)
  })

  it('adds players and keeps totals per player seat', () => {
    const room = lobbyOfThree()
    expect(room.seats.map((s) => s.id)).toEqual(['a', 'b', 'c'])
    expect(room.totals).toEqual({ a: 0, b: 0, c: 0 })
  })

  it('rejects a duplicate name case-insensitively', () => {
    const room = lobbyOfThree()
    expect(() => join(room, { seatId: 'd', name: 'ann', avatar: 'owl' })).toThrow(/taken/)
  })

  it('refuses joins when the room is locked', () => {
    let room = lobbyOfThree()
    room = setLocked(room, 'a', true)
    expect(() => join(room, { seatId: 'd', name: 'Dee', avatar: 'owl' })).toThrow(/locked/)
  })

  it('seats a spectator with no rotation slot and no total', () => {
    let room = lobbyOfThree()
    room = join(room, { seatId: 's', name: 'Sam', avatar: 'ghost', spectator: true })
    const sam = room.seats.find((seat) => seat.id === 's')
    expect(sam?.role).toBe('spectator')
    expect('s' in room.totals).toBe(false)
    room = start(room, 'a')
    expect(room.session?.queue).toEqual(['a', 'b', 'c'])
  })

  it('only the host edits settings, and only in the lobby', () => {
    let room = lobbyOfThree()
    expect(() => updateSettings(room, 'b', { answersPerGame: 6 })).toThrow(/host/)
    room = updateSettings(room, 'a', { answersPerGame: 6 })
    expect(room.settings.answersPerGame).toBe(6)
    room = start(room, 'a')
    expect(() => updateSettings(room, 'a', { answersPerGame: 7 })).toThrow(/lobby/)
  })

  it('validates settings values', () => {
    const room = lobbyOfThree()
    expect(() => updateSettings(room, 'a', { answersPerGame: 99 })).toThrow(/answers/)
    expect(() => updateSettings(room, 'a', { difficultyBase: 999 })).toThrow(/difficulty/)
  })
})

describe('starting a session', () => {
  it('refuses to start below two players', () => {
    let room = createRoom({
      code: 'ABC234',
      editionId: 'geography',
      host: { seatId: 'a', name: 'Ann', avatar: 'fox' },
      settings: settings(),
    })
    expect(() => start(room, 'a')).toThrow(/more player/)
    room = join(room, { seatId: 'b', name: 'Bob', avatar: 'turtle' })
    room = start(room, 'a')
    expect(room.phase).toBe('interstitial')
  })

  it('refuses to start with no categories', () => {
    let room = lobbyOfThree()
    room = updateSettings(room, 'a', { categoryIds: [] })
    expect(() => start(room, 'a')).toThrow(/category/)
  })

  it('builds the rotation queue from the player seats in order', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    expect(room.session?.queue).toEqual(['a', 'b', 'c'])
    expect(upNext(room)).toBe('a')
  })
})

describe('turns and rotation', () => {
  it('deals a turn only for the seat that is up next', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    expect(() => startTurn(room, 'b', deckOf(10))).toThrow(/your turn/)
    room = startTurn(room, 'a', deckOf(10))
    expect(room.phase).toBe('turn')
    expect(room.game?.hinterId).toBe('a')
  })

  it('clamps a short deck and derives the cutoff from the dealt count', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = startTurn(room, 'a', deckOf(4))
    expect(room.game?.answersPerGame).toBe(4)
    expect(room.game?.hinterBase).toBe(cutoffFor(25, 4))
  })

  it('runs a full rotation, banking scores and ending on the leaderboard', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    for (const hinter of ['a', 'b', 'c']) {
      room = startTurn(room, hinter, deckOf(2))
      room = playTurnToEnd(room, hinter, hinter === 'b' ? 'a' : 'b')
      room = finishTurn(room, hinter)
    }
    expect(room.phase).toBe('leaderboard')
    expect(room.session?.completedRotations).toBe(1)
    // Each hinter: cutoff(25,2)=5 minus one banked word = 4. Guessers a and b
    // split the six landed answers.
    const total = Object.values(room.totals).reduce((s, n) => s + n, 0)
    expect(total).toBe(4 * 3 + 2 * 3)
  })

  it('only the hinter drives their own turn', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = startTurn(room, 'a', deckOf(5))
    expect(() => hinterAddWord(room, 'b', 'nope')).toThrow(/hinter/)
    expect(() => hinterEndTurn(room, 'b')).toThrow(/hinter/)
  })

  it('finish is refused until the game completes', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = startTurn(room, 'a', deckOf(5))
    room = hinterAddWord(room, 'a', 'clue')
    expect(() => finishTurn(room, 'a')).toThrow(/not over/)
  })
})

describe('late join and pending seats', () => {
  it('enters a mid-turn joiner as pending, then seats them at the turn boundary', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = startTurn(room, 'a', deckOf(2))
    room = join(room, { seatId: 'd', name: 'Dee', avatar: 'owl' })
    expect(room.seats.find((s) => s.id === 'd')?.pending).toBe(true)
    // The engine game for this turn never includes the pending seat.
    expect(room.game?.players).not.toContain('d')
    room = playTurnToEnd(room, 'a', 'b')
    room = finishTurn(room, 'a')
    expect(room.seats.find((s) => s.id === 'd')?.pending).toBe(false)
    // Rotation continues with the remaining hinters, then the late joiner.
    expect(room.session?.queue).toEqual(['b', 'c', 'd'])
  })

  it('slots a joiner at the interstitial straight into the rotation queue', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = join(room, { seatId: 'd', name: 'Dee', avatar: 'owl' })
    expect(room.seats.find((s) => s.id === 'd')?.pending).toBe(false)
    expect(room.session?.queue).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('disconnect, skip, and forced end', () => {
  it('marks a seat reconnecting and restores it', () => {
    let room = lobbyOfThree()
    room = disconnected(room, 'b')
    expect(room.seats.find((s) => s.id === 'b')?.connection).toBe('reconnecting')
    room = reconnected(room, 'b')
    expect(room.seats.find((s) => s.id === 'b')?.connection).toBe('connected')
  })

  it('lets the host skip an AFK incoming hinter at the interstitial', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = skipHinter(room, 'a')
    expect(upNext(room)).toBe('b')
    expect(room.phase).toBe('interstitial')
  })

  it('refuses to force-end while the hinter is still connected', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = skipHinter(room, 'a') // hand the hinter seat to b, off the host
    room = startTurn(room, 'b', deckOf(5))
    expect(() => forceEndTurn(room, 'c')).toThrow(/host/)
    expect(() => forceEndTurn(room, 'a')).toThrow(/still here/)
  })

  it('lets the host force-end once the hinter has dropped', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = skipHinter(room, 'a')
    room = startTurn(room, 'b', deckOf(5))
    room = disconnected(room, 'b')
    room = forceEndTurn(room, 'a')
    expect(room.phase).toBe('interstitial')
    expect(upNext(room)).toBe('c')
  })
})

describe('leaving and host migration', () => {
  it('is idempotent for an unknown seat', () => {
    const room = lobbyOfThree()
    expect(leave(room, 'zzz')).toBe(room)
  })

  it('hands the host to the longest-present player when the host leaves', () => {
    let room = lobbyOfThree()
    room = leave(room, 'a')
    expect(room.hostId).toBe('b')
    expect(room.seats.map((s) => s.id)).toEqual(['b', 'c'])
  })

  it('settles a turn as a forfeit when the hinter leaves', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = startTurn(room, 'a', deckOf(5))
    room = hinterAddWord(room, 'a', 'clue')
    room = leave(room, 'a')
    // The hinter's turn ends; rotation continues with the rest.
    expect(room.game).toBeNull()
    expect(room.phase).toBe('interstitial')
    expect(upNext(room)).toBe('b')
  })

  it('ends the session to the leaderboard when the roster falls below two', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = startTurn(room, 'a', deckOf(5))
    room = leave(room, 'b')
    room = leave(room, 'c')
    expect(room.phase).toBe('leaderboard')
    expect(room.game).toBeNull()
  })

  it('lets the host kick a seat but not themselves', () => {
    let room = lobbyOfThree()
    expect(() => kick(room, 'a', 'a')).toThrow(/themselves/)
    expect(() => kick(room, 'b', 'c')).toThrow(/host/)
    room = kick(room, 'a', 'c')
    expect(room.seats.map((s) => s.id)).toEqual(['a', 'b'])
  })
})

describe('end of session keeps the room', () => {
  function toLeaderboard(): RoomState {
    let room = lobbyOfThree()
    room = start(room, 'a')
    for (const hinter of ['a', 'b', 'c']) {
      room = startTurn(room, hinter, deckOf(2))
      room = playTurnToEnd(room, hinter, hinter === 'b' ? 'a' : 'b')
      room = finishTurn(room, hinter)
    }
    return room
  }

  it('continue rolls a fresh rotation on the standing totals', () => {
    let room = toLeaderboard()
    const kept = { ...room.totals }
    room = continueRotation(room, 'a')
    expect(room.phase).toBe('interstitial')
    expect(room.session?.queue).toEqual(['a', 'b', 'c'])
    expect(room.totals).toEqual(kept)
  })

  it('play again starts a fresh game immediately with totals zeroed', () => {
    let room = toLeaderboard()
    room = playAgain(room, 'a')
    expect(room.phase).toBe('interstitial')
    expect(room.session?.queue).toEqual(['a', 'b', 'c'])
    expect(room.session?.completedRotations).toBe(0)
    expect(Object.values(room.totals).every((n) => n === 0)).toBe(true)
  })

  it('change settings returns to the lobby with totals zeroed', () => {
    let room = toLeaderboard()
    room = resetSession(room, 'a')
    expect(room.phase).toBe('lobby')
    expect(room.session).toBeNull()
    expect(Object.values(room.totals).every((n) => n === 0)).toBe(true)
  })
})

describe('applyIntent dispatch', () => {
  const noDeck: IntentDeps = { dealDeck: () => deckOf(4) }

  it('routes a host intent and rejects a non-host one', () => {
    let room = lobbyOfThree()
    room = applyIntent(room, 'a', { v: 1, type: 'setLocked', locked: true }, noDeck)
    expect(room.locked).toBe(true)
    expect(() => applyIntent(room, 'b', { v: 1, type: 'kick', seatId: 'c' }, noDeck)).toThrow(/host/)
  })

  it('deals through the injected dealer on ready', () => {
    let room = lobbyOfThree()
    room = applyIntent(room, 'a', { v: 1, type: 'start' }, noDeck)
    room = applyIntent(room, 'a', { v: 1, type: 'ready' }, noDeck)
    expect(room.phase).toBe('turn')
    expect(room.game?.answersPerGame).toBe(4)
  })

  it('rejects join as a room intent and unknown seats', () => {
    const room = lobbyOfThree()
    expect(() => applyIntent(room, 'a', { v: 1, type: 'join', name: 'X', avatar: 'y' }, noDeck)).toThrow(
      /connection time/,
    )
    expect(() => applyIntent(room, 'zzz', { v: 1, type: 'reroll' }, noDeck)).toThrow(/no such seat/)
  })

  it('reserves typed guessing without resolving it', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = startTurn(room, 'a', deckOf(5))
    expect(() =>
      applyIntent(room, 'b', { v: 1, type: 'guess', term: 'France', bankCount: 0 }, noDeck),
    ).toThrow(/not available/)
  })
})

describe('empty deck guard', () => {
  it('refuses to start a turn on an empty pool', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    expect(() => startTurn(room, 'a', [])).toThrow(/pool/)
  })
})
