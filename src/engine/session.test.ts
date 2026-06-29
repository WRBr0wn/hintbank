import { describe, expect, it } from 'vitest'
import {
  continueSession,
  createSession,
  currentHinter,
  isRotationComplete,
  leaders,
  recordGame,
  startOver,
} from './session'

describe('session rotation', () => {
  it('rotates the hinter through the roster in order', () => {
    let s = createSession(['a', 'b', 'c'])
    expect(currentHinter(s)).toBe('a')
    s = recordGame(s, { a: 5 })
    expect(currentHinter(s)).toBe('b')
    s = recordGame(s, { b: 5 })
    expect(currentHinter(s)).toBe('c')
  })

  it('flags rotation complete after everyone has given once', () => {
    let s = createSession(['a', 'b'])
    s = recordGame(s, { a: 1 })
    expect(isRotationComplete(s)).toBe(false)
    s = recordGame(s, { b: 1 })
    expect(isRotationComplete(s)).toBe(true)
    expect(s.completedRotations).toBe(1)
    expect(currentHinter(s)).toBeNull()
    expect(() => recordGame(s, { a: 1 })).toThrow()
  })
})

describe('session totals', () => {
  it('accumulates deltas across games', () => {
    let s = createSession(['a', 'b', 'c'])
    s = recordGame(s, { a: 20, b: 1, c: 0 })
    s = recordGame(s, { a: 1, b: 18, c: 2 })
    expect(s.totals).toEqual({ a: 21, b: 19, c: 2 })
  })

  it('keeps totals through continue and resets them on start over', () => {
    let s = createSession(['a', 'b'])
    s = recordGame(s, { a: 10, b: 4 })
    s = recordGame(s, { a: 3, b: 7 })
    expect(isRotationComplete(s)).toBe(true)

    const kept = continueSession(s)
    expect(kept.totals).toEqual({ a: 13, b: 11 })
    expect(currentHinter(kept)).toBe('a')
    expect(kept.completedRotations).toBe(1)

    const reset = startOver(s)
    expect(reset.totals).toEqual({ a: 0, b: 0 })
    expect(reset.completedRotations).toBe(0)
    expect(currentHinter(reset)).toBe('a')
  })

  it('continue is only allowed once the rotation is finished', () => {
    let s = createSession(['a', 'b'])
    s = recordGame(s, { a: 1 })
    expect(() => continueSession(s)).toThrow()
  })
})

describe('mode', () => {
  it('defaults to in-person and keeps the mode through a rotation', () => {
    let s = createSession(['a', 'b'])
    expect(s.mode).toBe('in-person')
    s = recordGame(s, { a: 5 })
    expect(s.mode).toBe('in-person')
  })

  it('locks the chosen mode for the session', () => {
    const s = createSession(['a', 'b'], 'online-randomizer')
    expect(s.mode).toBe('online-randomizer')
    expect(continueSession(recordGame(recordGame(s, { a: 1 }), { b: 1 })).mode).toBe('online-randomizer')
  })
})

describe('difficulty and answers settings', () => {
  it('defaults to a Regular cutoff of 25 and 10 answers', () => {
    const s = createSession(['a', 'b'])
    expect(s.hinterBase).toBe(25)
    expect(s.answersPerGame).toBe(10)
  })

  it('locks custom settings for the whole session', () => {
    const s = createSession(['a', 'b'], 'in-person', 20, 7)
    expect(s.hinterBase).toBe(20)
    expect(s.answersPerGame).toBe(7)
    const after = continueSession(recordGame(recordGame(s, { a: 1 }), { b: 1 }))
    expect(after.hinterBase).toBe(20) // carried through a rotation and continue
    expect(after.answersPerGame).toBe(7)
  })
})

describe('leaders', () => {
  it('returns the player with the highest total', () => {
    let s = createSession(['a', 'b', 'c'])
    s = recordGame(s, { a: 5, b: 9, c: 2 })
    expect(leaders(s)).toEqual(['b'])
  })

  it('returns every player tied at the top', () => {
    let s = createSession(['a', 'b', 'c'])
    s = recordGame(s, { a: 4, b: 4, c: 1 })
    expect(leaders(s)).toEqual(['a', 'b'])
  })
})
