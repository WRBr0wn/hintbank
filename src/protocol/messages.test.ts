import { describe, expect, it } from 'vitest'
import { parseClientMessage } from './messages'
import { PROTOCOL_VERSION, RoomError } from './types'

const v = PROTOCOL_VERSION

describe('protocol version', () => {
  it('rejects a missing or mismatched version before anything else', () => {
    expect(() => parseClientMessage({ type: 'leave' })).toThrow(RoomError)
    try {
      parseClientMessage({ v: v + 1, type: 'leave' })
    } catch (e) {
      expect((e as RoomError).code).toBe('bad-version')
    }
  })
})

describe('shape validation', () => {
  it('rejects non-objects and unknown types', () => {
    expect(() => parseClientMessage(null)).toThrow(/object/)
    expect(() => parseClientMessage('nope')).toThrow(/object/)
    expect(() => parseClientMessage({ v, type: 'nonsense' })).toThrow(/unknown message/)
  })

  it('accepts a join and enforces the name cap', () => {
    const msg = parseClientMessage({ v, type: 'join', name: 'Ann', avatar: 'fox' })
    expect(msg).toEqual({ v, type: 'join', name: 'Ann', avatar: 'fox' })
    expect(() => parseClientMessage({ v, type: 'join', name: '   ', avatar: 'fox' })).toThrow(/name/)
    expect(() => parseClientMessage({ v, type: 'join', name: 'x'.repeat(13), avatar: 'fox' })).toThrow(/name/)
  })

  it('carries optional join fields when present', () => {
    const msg = parseClientMessage({ v, type: 'join', name: 'Ann', avatar: 'fox', spectator: true, token: 'abc' })
    expect(msg).toMatchObject({ spectator: true, token: 'abc' })
  })

  it('validates a settings patch field by field', () => {
    const msg = parseClientMessage({ v, type: 'updateSettings', settings: { answersPerGame: 6, tagValues: ['Europe', 3] } })
    expect(msg).toEqual({ v, type: 'updateSettings', settings: { answersPerGame: 6, tagValues: ['Europe', 3] } })
    expect(() =>
      parseClientMessage({ v, type: 'updateSettings', settings: { answersPerGame: 'lots' } }),
    ).toThrow(/answersPerGame/)
    expect(() =>
      parseClientMessage({ v, type: 'updateSettings', settings: { categoryIds: [1, 2] } }),
    ).toThrow(/categoryIds/)
  })

  it('validates a resolve outcome', () => {
    const msg = parseClientMessage({ v, type: 'resolve', outcome: { correctGuesserId: 'b', overguesses: { c: 2 } } })
    expect(msg).toEqual({ v, type: 'resolve', outcome: { correctGuesserId: 'b', overguesses: { c: 2 } } })
    expect(() =>
      parseClientMessage({ v, type: 'resolve', outcome: { overguesses: { c: -1 } } }),
    ).toThrow(/non-negative/)
  })

  it('requires a non-negative integer selection for a hint', () => {
    expect(parseClientMessage({ v, type: 'giveHint', selection: [0, 2] })).toEqual({
      v,
      type: 'giveHint',
      selection: [0, 2],
    })
    expect(() => parseClientMessage({ v, type: 'giveHint', selection: [0, -1] })).toThrow(/selection/)
    expect(() => parseClientMessage({ v, type: 'giveHint', selection: 'all' })).toThrow(/selection/)
  })

  it('caps a hint word length', () => {
    expect(() => parseClientMessage({ v, type: 'addWord', word: 'x'.repeat(41) })).toThrow(/word/)
  })
})

describe('typed-guess message reserved from day one', () => {
  it('carries the term and the bank count it was made against', () => {
    const msg = parseClientMessage({ v, type: 'guess', term: 'France', bankCount: 4 })
    expect(msg).toEqual({ v, type: 'guess', term: 'France', bankCount: 4 })
  })

  it('requires a non-negative bank count', () => {
    expect(() => parseClientMessage({ v, type: 'guess', term: 'France', bankCount: -1 })).toThrow(/bankCount/)
    expect(() => parseClientMessage({ v, type: 'guess', term: 'France' })).toThrow(/bankCount/)
  })
})
