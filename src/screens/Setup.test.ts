import { describe, expect, it } from 'vitest'
import { cutoffFor } from './Setup'

// The clue cutoff is derived from the difficulty base (the full-game cutoff) and
// the answer count: round(base * answers / 10). A full 10-answer game leaves the
// base unchanged, so the defaults still pass 25; shorter games scale it down.
describe('cutoffFor (difficulty x answer-count derivation)', () => {
  it('leaves the base unchanged for a full 10-answer game', () => {
    expect(cutoffFor(30, 10)).toBe(30) // Easy
    expect(cutoffFor(25, 10)).toBe(25) // Regular, the default
    expect(cutoffFor(20, 10)).toBe(20) // Hard
  })

  it('scales the cutoff down proportionally for shorter games (round-half-up)', () => {
    expect(cutoffFor(25, 7)).toBe(18) // Regular + 7: round(17.5) = 18
    expect(cutoffFor(30, 5)).toBe(15) // Easy + 5: 15 exactly
    expect(cutoffFor(20, 5)).toBe(10) // Hard + 5: 10 exactly
    expect(cutoffFor(20, 7)).toBe(14) // Hard + 7: round(14.0) = 14
  })
})
