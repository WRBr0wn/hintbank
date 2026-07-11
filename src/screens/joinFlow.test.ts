import { describe, expect, it } from 'vitest'
import { badCodeMessage, codeStatus, inviteMessage, isMobileSharePlatform, lookupVerdict, noRoomMessage } from './joinFlow'
import type { RoomLookupResult } from '../net'

const names = (id: string) => (id === 'geography' ? 'Geography' : null)
const found = (joinable = true): RoomLookupResult => ({ ok: true, editionId: 'geography', joinable, avatarsTaken: [] })

describe('the live code verdict', () => {
  it('says nothing while the code is short or the lookup has not answered', () => {
    expect(lookupVerdict('ABC', null, names)).toBeNull()
    expect(lookupVerdict('ABC234', null, names)).toBeNull()
  })

  it('names the edition and the joinable state for a found room', () => {
    expect(lookupVerdict('ABC234', found(), names)).toBe('Room found: Geography Edition.')
    expect(lookupVerdict('ABC234', found(false), names)).toBe('Room found: Geography Edition, locked right now.')
  })

  it('speaks the one bad-code voice without a lookup for an impossible code', () => {
    // 0, O, 1, and I are outside the code alphabet.
    expect(lookupVerdict('ABC10O', null, names)).toBe(badCodeMessage)
  })

  it('reports a dead code but stays silent when the lookup cannot say', () => {
    expect(lookupVerdict('ABC234', { ok: false, reason: 'not-found' }, names)).toBe(noRoomMessage)
    expect(lookupVerdict('ABC234', { ok: false, reason: 'unreachable' }, names)).toBeNull()
    // A found room in an edition this build does not know cannot be named.
    expect(lookupVerdict('ABC234', { ok: true, editionId: 'marvel', joinable: true, avatarsTaken: [] }, names)).toBeNull()
  })
})

describe('the one status slot', () => {
  it('lets a join error overwrite the verdict, never showing both', () => {
    expect(codeStatus('name taken', null, 'Room found: Geography Edition.')).toEqual({
      kind: 'error',
      text: 'name taken',
    })
  })

  it('resumes the verdict once the error has been edited past', () => {
    expect(codeStatus('name taken', 'name taken', 'Room found: Geography Edition.')).toEqual({
      kind: 'verdict',
      text: 'Room found: Geography Edition.',
    })
    expect(codeStatus('name taken', 'name taken', null)).toBeNull()
  })

  it('shows the verdict with no error, and nothing with neither', () => {
    expect(codeStatus(null, null, noRoomMessage)).toEqual({ kind: 'verdict', text: noRoomMessage })
    expect(codeStatus(null, null, null)).toBeNull()
  })
})

describe('the invite message', () => {
  it('composes name, edition, and code in the fixed wording', () => {
    expect(inviteMessage('Ann', 'Geography', 'ABC234')).toBe(
      'Ann invited you to play Hint Bank - Geography Edition! Follow the link and use code ABC234 to join.',
    )
  })
})

describe('invite delivery is by platform', () => {
  it('marks phones and iPads mobile, desktops not', () => {
    expect(isMobileSharePlatform('Mozilla/5.0 (Linux; Android 14) Chrome/126', 5)).toBe(true)
    expect(isMobileSharePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true)
    // iPadOS reports itself as a Mac; the touch points give it away.
    expect(isMobileSharePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 5)).toBe(true)
    expect(isMobileSharePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 0)).toBe(false)
    expect(isMobileSharePlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126', 10)).toBe(false)
  })
})
