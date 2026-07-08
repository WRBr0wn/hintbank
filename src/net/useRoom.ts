import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoomUrl } from './config'
import { openRoom, type Identity, type RoomConnection } from './connection'
import { IDLE, type Intent, type NetState } from './state'

export interface RoomControls {
  state: NetState
  // Creates a room for this edition, then joins it as host.
  create(identity: Identity): Promise<void>
  // Joins an existing room by code.
  join(code: string, identity: Identity): void
  send(intent: Intent): void
  leave(): void
}

// POSTs to the worker to allocate a room. The worker checks its own kill switch
// and per-IP limit; those map to friendly messages here.
async function requestRoom(editionId: string): Promise<{ code: string } | { error: string }> {
  try {
    const res = await fetch(createRoomUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ editionId }),
    })
    if (res.status === 503) return { error: 'Multiplayer is off right now.' }
    if (res.status === 429) return { error: 'Too many rooms just now, try again shortly.' }
    if (!res.ok) return { error: 'Could not create a room. Try again.' }
    const body = (await res.json()) as { code?: unknown }
    if (typeof body.code !== 'string') return { error: 'Could not create a room. Try again.' }
    return { code: body.code }
  } catch {
    return { error: 'Could not reach the server.' }
  }
}

// Owns one room connection for the lifetime of the multiplayer screen. The
// connection does the socket work; this hook exposes its state and the actions
// the UI drives, and closes the socket on unmount.
export function useRoom(editionId: string): RoomControls {
  const [state, setState] = useState<NetState>(IDLE)
  const conn = useRef<RoomConnection | null>(null)

  const start = useCallback((code: string, identity: Identity) => {
    conn.current?.leave()
    conn.current = openRoom({ code, identity, onState: setState })
  }, [])

  const create = useCallback(
    async (identity: Identity) => {
      setState({ ...IDLE, status: 'connecting' })
      const result = await requestRoom(editionId)
      if ('error' in result) {
        setState({ ...IDLE, status: 'join-error', error: { code: 'join-failed', message: result.error } })
        return
      }
      start(result.code, identity)
    },
    [editionId, start],
  )

  const join = useCallback(
    (code: string, identity: Identity) => {
      start(code, identity)
    },
    [start],
  )

  const send = useCallback((intent: Intent) => {
    conn.current?.send(intent)
  }, [])

  const leave = useCallback(() => {
    conn.current?.leave()
    conn.current = null
    setState(IDLE)
  }, [])

  useEffect(() => () => conn.current?.leave(), [])

  return { state, create, join, send, leave }
}
