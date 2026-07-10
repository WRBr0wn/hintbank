import { describe, expect, it } from 'vitest'
import { parseRoomLookup } from './lookup'

describe('pre-join lookup parsing', () => {
  it('accepts the exact response shape', () => {
    const raw = { editionId: 'geography', joinable: true, avatarsTaken: ['fox', 'turtle'] }
    expect(parseRoomLookup(raw)).toEqual(raw)
  })

  it('accepts an empty avatars list and a locked room', () => {
    expect(parseRoomLookup({ editionId: 'pokemon', joinable: false, avatarsTaken: [] })).toEqual({
      editionId: 'pokemon',
      joinable: false,
      avatarsTaken: [],
    })
  })

  it('rejects anything malformed rather than guessing', () => {
    expect(parseRoomLookup(null)).toBeNull()
    expect(parseRoomLookup('geography')).toBeNull()
    expect(parseRoomLookup({})).toBeNull()
    expect(parseRoomLookup({ editionId: '', joinable: true, avatarsTaken: [] })).toBeNull()
    expect(parseRoomLookup({ editionId: 'geography', joinable: 'yes', avatarsTaken: [] })).toBeNull()
    expect(parseRoomLookup({ editionId: 'geography', joinable: true, avatarsTaken: [1] })).toBeNull()
    expect(parseRoomLookup({ editionId: 'geography', joinable: true })).toBeNull()
  })
})
