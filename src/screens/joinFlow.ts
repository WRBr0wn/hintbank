import { ROOM_CODE_LENGTH, isRoomCode, normalizeRoomCode } from '../protocol'
import type { RoomLookupResult } from '../net'

// Pure join-flow helpers: the live code verdict, the one-status-slot rule, and
// the invite message. The code itself never renders on screen anywhere in the
// join path (the lobby chip's rule, extended); these compose around that.

// One voice for a bad or unknown code, shared by the live verdict and the
// post-attempt errors so the two read the same.
export const badCodeMessage = `A room code is ${ROOM_CODE_LENGTH} letters and numbers.`
export const noRoomMessage = 'No room with that code.'

// The live verdict for a typed code, from the pre-join lookup that already
// ran. Null means nothing to say: still typing, a lookup in flight, or a
// lookup that failed (failure stays no-information, advisory as ever; it must
// never read as "no room"). editionName resolves an edition id to its display
// name; an id this build does not know also yields silence.
export function lookupVerdict(
  code: string,
  result: RoomLookupResult | null,
  editionName: (id: string) => string | null,
): string | null {
  const c = normalizeRoomCode(code)
  if (c.length !== ROOM_CODE_LENGTH) return null
  if (!isRoomCode(c)) return badCodeMessage
  if (result == null) return null
  if (!result.ok) return result.reason === 'not-found' ? noRoomMessage : null
  const name = editionName(result.editionId)
  if (name == null) return null
  return result.joinable ? `Room found: ${name} Edition.` : `Room found: ${name} Edition, locked right now.`
}

// The one status slot under a code field, latest truth wins: a join attempt's
// error fills it until the code is edited (the caller records the dismissal),
// then the live verdict resumes. Never both at once.
export function codeStatus(
  error: string | null,
  dismissedError: string | null,
  verdict: string | null,
): { kind: 'error' | 'verdict'; text: string } | null {
  if (error !== null && error !== dismissedError) return { kind: 'error', text: error }
  return verdict !== null ? { kind: 'verdict', text: verdict } : null
}

// The Share invite text. It carries the code by design; it goes to the share
// sheet or the clipboard and never renders in the app.
export function inviteMessage(inviter: string, editionName: string, code: string): string {
  return `${inviter} invited you to play Hint Bank - ${editionName} Edition! Follow the link and use code ${code} to join.`
}

// Deterministic invite delivery, by platform rather than feature detection:
// desktop browsers implement navigator.share too and their dialogs preview the
// text (which contains the code), so desktop always copies silently; the OS
// share sheet is a mobile surface. iPadOS reports itself as a Mac; the touch
// points give it away.
export function isMobileSharePlatform(
  ua: string = navigator.userAgent,
  touchPoints: number = navigator.maxTouchPoints,
): boolean {
  if (/Android|iPhone|iPod/i.test(ua)) return true
  return /Mac/i.test(ua) && touchPoints > 1
}
