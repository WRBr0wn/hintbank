import { describe, expect, it } from 'vitest'
import { allowedOrigins, originAllowed } from './origin'

describe('origin allow list', () => {
  const allow = ['https://wrbr0wn.github.io']

  it('admits the configured origin and localhost dev on any port', () => {
    expect(originAllowed('https://wrbr0wn.github.io', allow)).toBe(true)
    expect(originAllowed('http://localhost:5173', allow)).toBe(true)
    expect(originAllowed('http://127.0.0.1:4173', allow)).toBe(true)
  })

  it('rejects other origins and a missing origin', () => {
    expect(originAllowed('https://evil.example', allow)).toBe(false)
    expect(originAllowed(null, allow)).toBe(false)
    expect(originAllowed('not a url', allow)).toBe(false)
  })
})

describe('allowedOrigins', () => {
  it('parses the comma list and falls back to the deployed origin', () => {
    expect(allowedOrigins('https://a.test, https://b.test')).toEqual(['https://a.test', 'https://b.test'])
    expect(allowedOrigins('')).toEqual(['https://wrbr0wn.github.io'])
    expect(allowedOrigins(undefined)).toEqual(['https://wrbr0wn.github.io'])
  })
})
