import { describe, expect, it } from 'vitest'
import { dueSeats, nextAlarmAt, shouldExpire } from './lifecycle'

describe('grace deadlines', () => {
  it('returns only the seats whose grace has run out', () => {
    const grace = { a: 100, b: 500, c: 90 }
    expect(dueSeats(grace, 100).sort()).toEqual(['a', 'c'])
    expect(dueSeats(grace, 50)).toEqual([])
    expect(dueSeats(grace, 1000).sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('next alarm', () => {
  it('is the earliest of the grace timers and the idle deadline', () => {
    expect(nextAlarmAt({ a: 300, b: 200 }, 500)).toBe(200)
    expect(nextAlarmAt({ a: 300 }, 100)).toBe(100)
    expect(nextAlarmAt({}, 900)).toBe(900)
    expect(nextAlarmAt({ a: 300 }, null)).toBe(300)
    expect(nextAlarmAt({}, null)).toBeNull()
  })
})

describe('room expiry', () => {
  it('expires only with no connections past the idle deadline', () => {
    expect(shouldExpire(0, 100, 200)).toBe(true)
    expect(shouldExpire(1, 100, 200)).toBe(false) // someone is connected
    expect(shouldExpire(0, 300, 200)).toBe(false) // deadline not reached
    expect(shouldExpire(0, null, 200)).toBe(false) // no countdown running
  })
})
