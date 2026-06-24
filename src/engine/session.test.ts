import { describe, expect, it } from 'vitest'
import {
  continueSession,
  createSession,
  currentGiver,
  isRotationComplete,
  leaders,
  recordGame,
  startOver,
} from './session'

describe('session rotation', () => {
  it('rotates the giver through the roster in order', () => {
    let s = createSession(['a', 'b', 'c'])
    expect(currentGiver(s)).toBe('a')
    s = recordGame(s, { a: 5 })
    expect(currentGiver(s)).toBe('b')
    s = recordGame(s, { b: 5 })
    expect(currentGiver(s)).toBe('c')
  })

  it('flags rotation complete after everyone has given once', () => {
    let s = createSession(['a', 'b'])
    s = recordGame(s, { a: 1 })
    expect(isRotationComplete(s)).toBe(false)
    s = recordGame(s, { b: 1 })
    expect(isRotationComplete(s)).toBe(true)
    expect(s.completedRotations).toBe(1)
    expect(currentGiver(s)).toBeNull()
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
    expect(currentGiver(kept)).toBe('a')
    expect(kept.completedRotations).toBe(1)

    const reset = startOver(s)
    expect(reset.totals).toEqual({ a: 0, b: 0 })
    expect(reset.completedRotations).toBe(0)
    expect(currentGiver(reset)).toBe('a')
  })

  it('continue is only allowed once the rotation is finished', () => {
    let s = createSession(['a', 'b'])
    s = recordGame(s, { a: 1 })
    expect(() => continueSession(s)).toThrow()
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
