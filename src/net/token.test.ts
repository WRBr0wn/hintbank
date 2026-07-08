import { describe, expect, it } from 'vitest'
import { clearToken, loadToken, saveToken, type KeyStore } from './token'

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
