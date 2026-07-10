import { describe, expect, it } from 'vitest'
import { filterPool } from './deck'
import { type Category } from '../editions/terms'

const cat = (id: string, names: string[]): Category => ({
  id,
  label: id,
  ready: true,
  terms: names.map((name) => ({ name })),
})

describe('filterPool', () => {
  it('pools the selected categories in order', () => {
    const categories = [cat('one', ['Red', 'Green']), cat('two', ['Gold']), cat('three', ['Ruby'])]
    expect(filterPool(categories, ['one', 'three'], [])).toEqual(['Red', 'Green', 'Ruby'])
  })

  it('returns a name shared across categories once, first occurrence winning', () => {
    // Real data collides: Blue, Pearl, Ruby, Sapphire each sit in two Pokemon
    // categories. A doubled name would deal an unlandable second copy.
    const categories = [cat('games', ['Red', 'Blue']), cat('rivals', ['Blue', 'May'])]
    expect(filterPool(categories, ['games', 'rivals'], [])).toEqual(['Red', 'Blue', 'May'])
  })
})
