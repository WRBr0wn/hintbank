import { describe, expect, it } from 'vitest'
import { nameAllowed, normalizeName } from './names'

describe('name normalization', () => {
  it('folds case, diacritics, leet, and repeats to a common core', () => {
    expect(normalizeName('Wyatt')).toBe('wyat')
    expect(normalizeName('  A n n  ')).toBe('an')
    expect(normalizeName('N1GG3R')).toBe('niger')
    expect(normalizeName('José')).toBe('jose')
  })
})

describe('name screening', () => {
  it('passes ordinary names, including substring-prone ones', () => {
    expect(nameAllowed('Wyatt')).toBe(true)
    expect(nameAllowed('Ann')).toBe(true)
    expect(nameAllowed('Assange')).toBe(true) // not caught by the narrow list
    expect(nameAllowed('Cassie')).toBe(true)
  })

  it('refuses a slur even when disguised', () => {
    expect(nameAllowed('n1gg3r')).toBe(false)
    expect(nameAllowed('F  A  G  G  O  T')).toBe(false)
    expect(nameAllowed('retard')).toBe(false)
  })
})
