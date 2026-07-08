import { describe, expect, it } from 'vitest'
import { isRoomCode, normalizeRoomCode, roomCodeFrom } from './code'
import { ROOM_CODE_LENGTH } from './types'

describe('room codes', () => {
  it('accepts a well-formed code and rejects malformed ones', () => {
    expect(isRoomCode('ABC234')).toBe(true)
    expect(isRoomCode('ABC23')).toBe(false) // too short
    expect(isRoomCode('ABC2340')).toBe(false) // too long
    expect(isRoomCode('ABC23O')).toBe(false) // O is not in the alphabet
    expect(isRoomCode('abc234')).toBe(false) // lowercase
  })

  it('normalizes typed input to uppercase without whitespace', () => {
    expect(normalizeRoomCode(' abc 234 ')).toBe('ABC234')
  })

  it('builds a valid code from a random-index source', () => {
    let n = 0
    const code = roomCodeFrom(() => n++)
    expect(code).toHaveLength(ROOM_CODE_LENGTH)
    expect(isRoomCode(code)).toBe(true)
  })
})
