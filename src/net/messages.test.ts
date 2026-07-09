import { describe, expect, it } from 'vitest'
import { PROTOCOL_VERSION } from '../protocol'
import { encodeIntent, parseServerMessage } from './messages'

describe('parseServerMessage', () => {
  it('accepts the known server message types', () => {
    const snapshot = JSON.stringify({ v: 1, type: 'snapshot', view: { code: 'ABC234' } })
    expect(parseServerMessage(snapshot)?.type).toBe('snapshot')
    expect(parseServerMessage(JSON.stringify({ v: 1, type: 'kicked' }))?.type).toBe('kicked')
  })

  it('drops junk, non-objects, and unknown types', () => {
    expect(parseServerMessage('not json')).toBeNull()
    expect(parseServerMessage('42')).toBeNull()
    expect(parseServerMessage('null')).toBeNull()
    expect(parseServerMessage(JSON.stringify({ v: 1, type: 'nonsense' }))).toBeNull()
    expect(parseServerMessage(JSON.stringify({ v: 1 }))).toBeNull()
  })
})

describe('encodeIntent', () => {
  it('stamps the protocol version onto the intent', () => {
    const encoded = encodeIntent({ type: 'setLocked', locked: true })
    expect(JSON.parse(encoded)).toEqual({ v: PROTOCOL_VERSION, type: 'setLocked', locked: true })
  })

  it('carries an intent payload through unchanged', () => {
    const encoded = encodeIntent({ type: 'updateSettings', settings: { answersPerGame: 6 } })
    expect(JSON.parse(encoded)).toEqual({ v: PROTOCOL_VERSION, type: 'updateSettings', settings: { answersPerGame: 6 } })
  })
})
