import { PROTOCOL_VERSION, type ServerMessage } from '../protocol'
import type { Intent } from './state'

const SERVER_TYPES: ReadonlySet<string> = new Set(['welcome', 'snapshot', 'error', 'kicked', 'roomClosed'])

// Parses a raw socket frame into a ServerMessage, or null if it is not one we
// recognize (dropped). Shape validation is light: the server is trusted to
// send well-formed messages, so this only guards against truncated or junk
// frames, not a hostile server.
export function parseServerMessage(raw: string): ServerMessage | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const type = (data as { type?: unknown }).type
  if (typeof type !== 'string' || !SERVER_TYPES.has(type)) return null
  return data as ServerMessage
}

// The one place the protocol version is attached to an outbound intent, so a
// version bump is a single edit.
export function encodeIntent(intent: Intent): string {
  return JSON.stringify({ ...intent, v: PROTOCOL_VERSION })
}
