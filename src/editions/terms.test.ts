// The secondary-tag seam: the shared predicate and derivation helpers must
// handle any tag value type (Pokemon generations are numbers, Geography
// regions will be strings) and keep the untagged pass-through semantics.
import { describe, expect, it } from 'vitest'
import { activeTagValues, tagValueOptions, termPasses, type Category, type Term } from './terms'

const tagged = (name: string, ...tags: (string | number)[]): Term => ({ name, tags })
const untagged = (name: string): Term => ({ name })

const category = (id: string, terms: Term[]): Category => ({ id, label: id, ready: true, terms })

describe('termPasses', () => {
  it('passes everything when no values are selected', () => {
    expect(termPasses(tagged('a', 1), [])).toBe(true)
    expect(termPasses(untagged('b'), [])).toBe(true)
  })

  it('matches a term carrying a selected value', () => {
    expect(termPasses(tagged('a', 1, 2), [2])).toBe(true)
    expect(termPasses(tagged('a', 1, 2), [3])).toBe(false)
  })

  it('matches string values', () => {
    expect(termPasses(tagged('a', 'europe'), ['europe'])).toBe(true)
    expect(termPasses(tagged('a', 'europe'), ['asia'])).toBe(false)
  })

  it('lets untagged terms pass through alongside a selection', () => {
    expect(termPasses(untagged('a'), [1])).toBe(true)
    expect(termPasses({ name: 'a', tags: [] }, [1])).toBe(true)
  })

  it('does not match across value types', () => {
    expect(termPasses(tagged('a', 1), ['1'])).toBe(false)
  })
})

describe('tagValueOptions', () => {
  it('unions values across selected categories only', () => {
    const cats = [
      category('x', [tagged('a', 1), tagged('b', 2)]),
      category('y', [tagged('c', 3)]),
    ]
    expect(tagValueOptions(cats, new Set(['x']))).toEqual([1, 2])
    expect(tagValueOptions(cats, new Set(['x', 'y']))).toEqual([1, 2, 3])
  })

  it('skips untagged terms and dedupes', () => {
    const cats = [category('x', [tagged('a', 1), untagged('b'), tagged('c', 1)])]
    expect(tagValueOptions(cats, new Set(['x']))).toEqual([1])
  })

  it('sorts numbers numerically, not lexicographically', () => {
    const cats = [category('x', [tagged('a', 10), tagged('b', 2), tagged('c', 1)])]
    expect(tagValueOptions(cats, new Set(['x']))).toEqual([1, 2, 10])
  })

  it('sorts string values alphabetically', () => {
    const cats = [category('x', [tagged('a', 'oceania'), tagged('b', 'asia'), tagged('c', 'europe')])]
    expect(tagValueOptions(cats, new Set(['x']))).toEqual(['asia', 'europe', 'oceania'])
  })

  it('puts numbers before strings when an edition mixes them', () => {
    const cats = [category('x', [tagged('a', 'era-b', 2), tagged('b', 'era-a', 10)])]
    expect(tagValueOptions(cats, new Set(['x']))).toEqual([2, 10, 'era-a', 'era-b'])
  })
})

describe('activeTagValues', () => {
  it('keeps only picks still on offer, in option order', () => {
    expect(activeTagValues([1, 2, 3], new Set([3, 1, 9]))).toEqual([1, 3])
    expect(activeTagValues(['asia', 'europe'], new Set(['europe', 'mars']))).toEqual(['europe'])
  })

  it('is empty when nothing is picked', () => {
    expect(activeTagValues([1, 2], new Set())).toEqual([])
  })
})
