import { PROTOCOL_VERSION } from '../protocol'
import { roomSocketUrl } from './config'
import { encodeIntent, parseServerMessage } from './messages'
import { applyServerMessage, IDLE, type Intent, type NetState } from './state'
import { clearToken, loadToken, saveToken } from './token'

export interface Identity {
  name: string
  avatar: string
  spectator?: boolean
}

export interface RoomConnection {
  send(intent: Intent): void
  // Leaves for good: tells the server, closes the socket, stops reconnecting.
  leave(): void
}

// Backoff for reconnect attempts after a drop; the last value repeats up to the
// cap, then the room is treated as gone.
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000]
const MAX_RECONNECTS = 5

// Opens one WebSocket to a room and runs the join handshake, projecting every
// server message into NetState via the pure reducer. Token save/clear are the
// only side effects layered on top: a welcome persists the reconnect token, an
// end (kicked or closed) drops it. On an unexpected drop after joining it
// reconnects with the saved token, which is the same path as a first join.
export function openRoom(opts: { code: string; identity: Identity; onState: (state: NetState) => void }): RoomConnection {
  const { code, identity, onState } = opts
  let state: NetState = { ...IDLE, status: 'connecting' }
  let ws: WebSocket | null = null
  let intentional = false
  let joinedOnce = false
  let attempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const set = (next: NetState) => {
    state = next
    onState(state)
  }

  function connect() {
    set({ ...state, status: joinedOnce ? 'reconnecting' : 'connecting' })
    const socket = new WebSocket(roomSocketUrl(code))
    ws = socket

    socket.onopen = () => {
      if (!joinedOnce) set({ ...state, status: 'joining' })
      const token = loadToken(code) ?? undefined
      socket.send(
        JSON.stringify({ v: PROTOCOL_VERSION, type: 'join', name: identity.name, avatar: identity.avatar, spectator: identity.spectator, token }),
      )
    }

    socket.onmessage = (event) => {
      const msg = parseServerMessage(typeof event.data === 'string' ? event.data : '')
      if (!msg) return
      if (msg.type === 'welcome') {
        joinedOnce = true
        attempt = 0
        saveToken(code, msg.token)
      }
      if (msg.type === 'kicked' || msg.type === 'roomClosed') clearToken(code)
      set(applyServerMessage(state, msg))
    }

    socket.onclose = () => {
      if (intentional) return
      // A server-sent end (kicked, closed, version) already set a terminal
      // state; the close that follows must not override it.
      if (state.status === 'kicked' || state.status === 'room-closed' || state.status === 'version') return
      if (joinedOnce) {
        scheduleReconnect()
      } else if (state.status !== 'join-error') {
        // Never welcomed: the upgrade was refused (no such room, full, or a
        // rejected origin). The browser hides the HTTP status, so this is the
        // one generic join failure.
        set({
          ...state,
          status: 'join-error',
          error: { code: 'join-failed', message: 'Could not join that room. Check the code and try again.' },
        })
      }
    }

    socket.onerror = () => {
      // A close event always follows an error; the handling lives there.
    }
  }

  function scheduleReconnect() {
    if (attempt >= MAX_RECONNECTS) {
      set({ ...state, status: 'room-closed', error: { code: 'join-failed', message: 'Lost the connection to the room.' } })
      return
    }
    const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)]
    attempt += 1
    set({ ...state, status: 'reconnecting' })
    reconnectTimer = setTimeout(connect, delay)
  }

  connect()

  return {
    send(intent) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(encodeIntent(intent))
    },
    leave() {
      intentional = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ v: PROTOCOL_VERSION, type: 'leave' }))
      }
      ws?.close()
      clearToken(code)
    },
  }
}
