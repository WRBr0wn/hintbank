import { roomLookupUrl } from './config'

// The pre-join lookup: what a client may know about a room before the
// handshake. Enough to route a code to its edition and grey taken avatars,
// and nothing more (no names, no game state). A nicety, never the critical
// path: the join handshake stays the source of truth for every error it
// already surfaces, so any failure here just means no early information.
export interface RoomLookup {
  editionId: string
  joinable: boolean
  avatarsTaken: string[]
}

export type RoomLookupResult = ({ ok: true } & RoomLookup) | { ok: false; reason: 'not-found' | 'unreachable' }

// The response shape check, pure so it is testable without a fetch. Anything
// malformed is null; the caller degrades to no information.
export function parseRoomLookup(raw: unknown): RoomLookup | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (typeof o.editionId !== 'string' || o.editionId === '') return null
  if (typeof o.joinable !== 'boolean') return null
  if (!Array.isArray(o.avatarsTaken) || !o.avatarsTaken.every((a) => typeof a === 'string')) return null
  return { editionId: o.editionId, joinable: o.joinable, avatarsTaken: o.avatarsTaken }
}

// Resolves a code against the worker. A 404 (and the 400 a malformed code
// draws) is "no such room"; everything else that fails, including a body that
// does not parse, is "unreachable" so the caller can word the two apart.
export async function lookupRoom(code: string): Promise<RoomLookupResult> {
  try {
    const res = await fetch(roomLookupUrl(code))
    if (res.status === 404 || res.status === 400) return { ok: false, reason: 'not-found' }
    if (!res.ok) return { ok: false, reason: 'unreachable' }
    const parsed = parseRoomLookup(await res.json())
    return parsed ? { ok: true, ...parsed } : { ok: false, reason: 'unreachable' }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}
