import { describe, expect, it } from 'vitest'
import { cutoffFor, guesserScore } from '../engine'
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
  hinterReroll,
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
  submitGuess,
  typedGiveHint,
  updateSettings,
  upNext,
  type IntentDeps,
} from './room'
import { RoomError, type RoomSettings, type RoomState } from './types'

const settings = () => defaultRoomSettings(['countries'])
const typedSettings = (): RoomSettings => ({ ...defaultRoomSettings(['countries']), onlineMode: 'typed' })

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

// A typed-mode pool: every answer that could be dealt plus a few wrong picks to
// guess. Guess validation is pool membership, so both must live here.
const POOL = [...deckOf(10), 'WRONG-A', 'WRONG-B', 'WRONG-C']
const poolFor = () => POOL
const typedDeps = (n: number): IntentDeps => ({ dealDeck: () => deckOf(n), poolFor })

// A typed-mode room in a live turn, seat 'a' hinting, with one banked word and a
// hint given from it (hintIndex 1, the engine is resolving), so guesses have a
// hint to answer.
function typedTurn(answers = 3): RoomState {
  let room = createRoom({
    code: 'ABC234',
    editionId: 'geography',
    host: { seatId: 'a', name: 'Ann', avatar: 'fox' },
    settings: typedSettings(),
  })
  room = join(room, { seatId: 'b', name: 'Bob', avatar: 'turtle' })
  room = join(room, { seatId: 'c', name: 'Cal', avatar: 'dragon' })
  room = start(room, 'a')
  room = startTurn(room, 'a', deckOf(answers))
  room = hinterAddWord(room, 'a', 'clue')
  return typedGiveHint(room, 'a', [0])
}

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
  const noDeck: IntentDeps = { dealDeck: () => deckOf(4), poolFor }

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

  it('rejects a guess in voice mode as unsupported', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    room = startTurn(room, 'a', deckOf(5))
    expect(() =>
      applyIntent(room, 'b', { v: 1, type: 'guess', term: 'ANS-0', hintIndex: 0 }, noDeck),
    ).toThrow(/typed guessing is off/)
  })

  it('routes a typed guess through submitGuess', () => {
    const room = applyIntent(typedTurn(3), 'b', { v: 1, type: 'guess', term: 'ANS-0', hintIndex: 1 }, typedDeps(3))
    expect(room.game?.resolved).toBe(1)
    expect(room.game?.correctGuesses.b).toBe(1)
  })

  it('routes the hinter give-hint through the typed path in typed mode', () => {
    let room = typedTurn(3)
    room = submitGuess(room, 'b', 'ANS-0', 1, poolFor) // land ANS-0, back to hinting
    // The hinter gives the next hint through applyIntent; the engine advances
    // hintCount and the current hint shows on the view.
    room = applyIntent(room, 'a', { v: 1, type: 'giveHint', selection: [0] }, typedDeps(3))
    expect(room.game?.phase).toBe('resolving')
    expect(room.currentHint).toEqual([0])
    expect(room.game?.hintCount).toBe(2)
  })
})

describe('typed-guess resolution', () => {
  // A typed turn where the hinter has banked several words but not yet given a
  // hint (the engine is still hinting): guesses have nothing to answer.
  function bankedNoHint(answers = 3): RoomState {
    let room = createRoom({
      code: 'ABC234',
      editionId: 'geography',
      host: { seatId: 'a', name: 'Ann', avatar: 'fox' },
      settings: typedSettings(),
    })
    room = join(room, { seatId: 'b', name: 'Bob', avatar: 'turtle' })
    room = join(room, { seatId: 'c', name: 'Cal', avatar: 'dragon' })
    room = start(room, 'a')
    room = startTurn(room, 'a', deckOf(answers))
    room = hinterAddWord(room, 'a', 'w1')
    room = hinterAddWord(room, 'a', 'w2')
    return hinterAddWord(room, 'a', 'w3')
  }

  it('lands the current answer on the first correct pick and credits that guesser', () => {
    const room = submitGuess(typedTurn(3), 'b', 'ANS-0', 1, poolFor)
    expect(room.game?.resolved).toBe(1)
    expect(room.game?.correctGuesses.b).toBe(1)
    expect(room.game?.results[0]).toEqual({ answer: 'ANS-0', guesserId: 'b' })
    // The landing closes the hint and records the pick, marked as it resolved.
    expect(room.currentHint).toBeNull()
    expect(room.guessFeed).toEqual([{ guesserId: 'b', term: 'ANS-0', correct: true, hintIndex: 1 }])
  })

  it('shows the current hint as the selected bank words, in order', () => {
    let room = bankedNoHint(3)
    room = typedGiveHint(room, 'a', [2, 0])
    expect(room.currentHint).toEqual([2, 0])
    expect(room.game?.phase).toBe('resolving')
    expect(room.game?.hintCount).toBe(1)
  })

  it('credits only the first correct arrival when two race the same answer', () => {
    let room = typedTurn(3)
    room = submitGuess(room, 'b', 'ANS-0', 1, poolFor) // b lands it first, hint closes
    // c's pick arrives after the hint closed (no hint open now) and is dropped.
    const after = submitGuess(room, 'c', 'ANS-0', 1, poolFor)
    expect(after).toBe(room)
    expect(after.game?.correctGuesses.c).toBeUndefined()
  })

  it('applies an overguess the moment a repeat wrong pick on a hint arrives', () => {
    let room = typedTurn(3)
    room = submitGuess(room, 'b', 'WRONG-A', 1, poolFor) // first pick on hint 1: free
    expect(room.game?.overguesses.b ?? 0).toBe(0)
    room = submitGuess(room, 'b', 'WRONG-B', 1, poolFor) // second on hint 1
    expect(room.game?.overguesses.b).toBe(1) // scored now, before anything lands
    room = submitGuess(room, 'b', 'ANS-0', 1, poolFor) // lands it
    expect(room.game?.overguesses.b).toBe(1)
    expect(guesserScore(room.game!, 'b')).toBe(0) // +1 landed, -1 overguess
  })

  it('gives a fresh free guess per hint, even at the same bank size', () => {
    let room = typedTurn(3) // hint 1 from bank size 1
    room = submitGuess(room, 'b', 'WRONG-A', 1, poolFor) // first on hint 1: free
    room = typedGiveHint(room, 'a', [0]) // hint 2, same bank size, no word added
    expect(room.game?.hintCount).toBe(2)
    room = submitGuess(room, 'b', 'WRONG-B', 2, poolFor) // first on hint 2: free again
    room = submitGuess(room, 'b', 'ANS-0', 2, poolFor)
    // Two wrong picks, but one per hint, so no overguess: bank size is not the key.
    expect(room.game?.overguesses.b ?? 0).toBe(0)
    expect(guesserScore(room.game!, 'b')).toBe(1)
  })

  it('keeps one hint one hint across several word-adds', () => {
    let room = bankedNoHint(3) // three banked words, no hint yet
    room = typedGiveHint(room, 'a', [0, 1, 2]) // one hint over all three
    expect(room.game?.hintCount).toBe(1)
    room = submitGuess(room, 'b', 'WRONG-A', 1, poolFor)
    room = submitGuess(room, 'b', 'WRONG-B', 1, poolFor) // second on the same hint
    room = submitGuess(room, 'b', 'ANS-0', 1, poolFor)
    expect(room.game?.overguesses.b).toBe(1)
  })

  it('attributes a late pick to the hint it named, not the current one', () => {
    let room = typedTurn(3) // hint 1
    room = submitGuess(room, 'b', 'WRONG-A', 1, poolFor) // on hint 1
    room = typedGiveHint(room, 'a', [0]) // hint 2 now current
    // A pick made against hint 1 arrives late; scored on hint 1, so it is the
    // second there and an overguess, though hint 2 is current.
    room = submitGuess(room, 'b', 'WRONG-B', 1, poolFor)
    room = submitGuess(room, 'b', 'ANS-0', 2, poolFor)
    expect(room.game?.overguesses.b).toBe(1)
  })

  it('scores a claim on a hint older than the guesser has already answered against the newer one', () => {
    let room = typedTurn(3) // hint 1
    room = typedGiveHint(room, 'a', [0]) // hint 2 now current
    room = submitGuess(room, 'b', 'WRONG-A', 2, poolFor) // first on hint 2: free
    // b never guessed on hint 1, and honest picks arrive in order, so a claim on
    // it now can only be a client fishing for a fresh free pick. It is clamped up
    // to hint 2, the newest hint b has answered, and is the second pick there.
    room = submitGuess(room, 'b', 'WRONG-B', 1, poolFor)
    expect(room.guessFeed[1].hintIndex).toBe(2)
    expect(room.game?.overguesses.b).toBe(1)
  })

  it('clamps a hintIndex beyond the hints that exist', () => {
    let room = typedTurn(3) // hintCount 1
    room = submitGuess(room, 'b', 'WRONG-A', 999, poolFor) // clamped to hint 1
    room = submitGuess(room, 'b', 'WRONG-B', 0, poolFor) // clamped up to hint 1
    room = submitGuess(room, 'b', 'ANS-0', 1, poolFor)
    expect(room.game?.overguesses.b).toBe(1) // both landed on hint 1
  })

  it('keeps an applied overguess when the hinter rerolls the answer away', () => {
    let room = typedTurn(3) // hint 1 on ANS-0
    room = submitGuess(room, 'b', 'WRONG-A', 1, poolFor) // first on hint 1: free
    room = submitGuess(room, 'b', 'WRONG-B', 1, poolFor) // second on hint 1: -1
    room = hinterReroll(room, 'a') // ANS-0 rerolled away, never lands
    expect(room.game?.overguesses.b).toBe(1) // the penalty sticks
    room = typedGiveHint(room, 'a', [0]) // hint 2 on the new answer ANS-1
    room = submitGuess(room, 'b', 'WRONG-C', 2, poolFor) // first on hint 2: free again
    room = submitGuess(room, 'b', 'ANS-1', 2, poolFor)
    expect(room.game?.overguesses.b).toBe(1) // still just the one, attributed to hint 1
  })

  it('keeps an applied overguess when the turn ends without the answer landing', () => {
    let room = typedTurn(3)
    room = submitGuess(room, 'b', 'WRONG-A', 1, poolFor)
    room = submitGuess(room, 'b', 'WRONG-B', 1, poolFor) // -1 on hint 1
    room = leave(room, 'a') // the hinter leaves; the turn settles as a forfeit
    expect(room.totals.b).toBe(-1) // the penalty is banked, not dropped
  })

  it('carries the whole turn of picks in the feed, wrong and correct', () => {
    let room = typedTurn(3)
    room = submitGuess(room, 'b', 'WRONG-A', 1, poolFor)
    room = submitGuess(room, 'c', 'ANS-0', 1, poolFor)
    expect(room.guessFeed).toEqual([
      { guesserId: 'b', term: 'WRONG-A', correct: false, hintIndex: 1 },
      { guesserId: 'c', term: 'ANS-0', correct: true, hintIndex: 1 },
    ])
  })

  it('rejects a hinter manual-resolve but allows the hinter to give a hint', () => {
    const room = typedTurn(3)
    expect(() =>
      applyIntent(room, 'a', { v: 1, type: 'resolve', outcome: { correctGuesserId: 'b' } }, typedDeps(3)),
    ).toThrow(/adjudicate/)
    // Giving a hint is allowed: it closes the open hint and opens a new one.
    const after = applyIntent(room, 'a', { v: 1, type: 'giveHint', selection: [0] }, typedDeps(3))
    expect(after.game?.hintCount).toBe(2)
  })

  it('lets the hinter build the bank and reroll while a hint is open', () => {
    let room = typedTurn(3) // hint 1 open (resolving)
    room = hinterAddWord(room, 'a', 'clue2') // closes the hint, back to hinting
    expect(room.game?.phase).toBe('hinting')
    expect(room.game?.bank).toHaveLength(2)
    expect(room.currentHint).toBeNull()
    room = typedGiveHint(room, 'a', [0, 1]) // hint 2
    room = hinterReroll(room, 'a') // reroll from resolving: closes the hint, swaps answer
    expect(room.currentHint).toBeNull()
    expect(room.game?.resolved).toBe(0) // reroll does not land an answer
  })

  it('refuses a guess from the hinter, a spectator, and a non-pool term', () => {
    let room = typedTurn(3)
    room = join(room, { seatId: 's', name: 'Sam', avatar: 'ghost', spectator: true })
    expect(() => submitGuess(room, 'a', 'ANS-0', 1, poolFor)).toThrow(/hinter/)
    expect(() => submitGuess(room, 's', 'ANS-0', 1, poolFor)).toThrow(/guesser/)
    expect(() => submitGuess(room, 'b', 'NOT-A-TERM', 1, poolFor)).toThrow(/not a term/)
  })

  it('drops a guess when no hint is open', () => {
    const room = bankedNoHint(3) // words banked, but no hint given yet
    const after = submitGuess(room, 'b', 'ANS-0', 0, poolFor)
    expect(after).toBe(room) // nothing to answer, dropped
  })

  it('drops a guess once the turn is over', () => {
    let room = typedTurn(1) // a one-answer turn completes on the first land
    room = submitGuess(room, 'b', 'ANS-0', 1, poolFor)
    expect(room.game?.status).toBe('complete')
    const after = submitGuess(room, 'c', 'ANS-0', 1, poolFor)
    expect(after).toBe(room)
  })
})

describe('empty deck guard', () => {
  it('refuses to start a turn on an empty pool', () => {
    let room = lobbyOfThree()
    room = start(room, 'a')
    expect(() => startTurn(room, 'a', [])).toThrow(/pool/)
  })
})
