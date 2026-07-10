import { describe, expect, it } from 'vitest'
import { clearToken, loadToken, saveToken, tokenStoreFor, type KeyStore } from './token'

function fakeStore(): KeyStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

describe('reconnect token persistence', () => {
  it('saves, loads, and clears per room code', () => {
    const store = fakeStore()
    expect(loadToken('ABC234', store)).toBeNull()
    saveToken('ABC234', 'deadbeef', store)
    expect(loadToken('ABC234', store)).toBe('deadbeef')
    clearToken('ABC234', store)
    expect(loadToken('ABC234', store)).toBeNull()
  })

  it('keeps different rooms independent', () => {
    const store = fakeStore()
    saveToken('ABC234', 'one', store)
    saveToken('XYZ789', 'two', store)
    expect(loadToken('ABC234', store)).toBe('one')
    expect(loadToken('XYZ789', store)).toBe('two')
    clearToken('ABC234', store)
    expect(loadToken('XYZ789', store)).toBe('two')
  })

  it('treats a missing store as no token rather than throwing', () => {
    expect(loadToken('ABC234', null)).toBeNull()
    expect(() => saveToken('ABC234', 'x', null)).not.toThrow()
    expect(() => clearToken('ABC234', null)).not.toThrow()
  })
})

// The rule that keeps a same-device board view from breaking the player's
// seat: tokens are for players, so a spectator connection neither loads,
// saves, nor clears one.
describe('tokens are for players', () => {
  it('gives a spectator connection no store, leaving the player token untouched', () => {
    const store = fakeStore()
    saveToken('ABC234', 'player-token', store) // the player seat in this browser
    const asSpectator = tokenStoreFor(true, store)
    expect(loadToken('ABC234', asSpectator)).toBeNull() // no reconnect-as-player
    saveToken('ABC234', 'clobber', asSpectator) // a spectator welcome saves nothing
    clearToken('ABC234', asSpectator) // a spectator leave clears nothing
    expect(loadToken('ABC234', store)).toBe('player-token')
  })

  it('passes the store through for a player join', () => {
    const store = fakeStore()
    expect(tokenStoreFor(false, store)).toBe(store)
    expect(tokenStoreFor(undefined, store)).toBe(store)
  })
})
