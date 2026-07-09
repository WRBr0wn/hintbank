import type { ClientMessage, RoomErrorCode, RoomView, ServerMessage } from '../protocol'

// Omit that distributes over the ClientMessage union, so a caller can pass a
// single variant (e.g. { type: 'setLocked', locked }) and keep its narrowing.
// A plain Omit<Union, 'v'> collapses to the shared keys and loses the shape.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

// An outbound intent without the protocol version; the connection stamps the
// version in one place.
export type Intent = DistributiveOmit<ClientMessage, 'v'>

// The client's whole view of a room connection. The client holds no room truth
// of its own: view is always the latest server snapshot, and every screen is a
// projection of it. status tracks the socket lifecycle around that.
export type NetStatus =
  | 'idle' // before any create/join; the entry form is shown
  | 'connecting' // opening the socket (or the create request is in flight)
  | 'joining' // socket open, join sent, awaiting the welcome
  | 'joined' // in the room, view present
  | 'reconnecting' // dropped after joining, retrying with the saved token
  | 'join-error' // a join was refused for a fixable reason; back to the form
  | 'kicked' // removed by the host
  | 'room-closed' // the room ended or is gone
  | 'version' // protocol mismatch: the page must hard-refresh

export interface NetError {
  code: RoomErrorCode | 'join-failed'
  message: string
}

export interface NetState {
  status: NetStatus
  view: RoomView | null
  seatId: string | null
  error: NetError | null
}

export const IDLE: NetState = { status: 'idle', view: null, seatId: null, error: null }

// Pure projection: the next client state from the current one and a server
// message. Reconnect and missed-message recovery are the same path here, a
// welcome or snapshot simply replaces the view, so there is no separate
// recovery branch.
export function applyServerMessage(state: NetState, msg: ServerMessage): NetState {
  switch (msg.type) {
    case 'welcome':
      return { status: 'joined', view: msg.view, seatId: msg.seatId, error: null }
    case 'snapshot':
      return { ...state, status: 'joined', view: msg.view, error: null }
    case 'error': {
      const error: NetError = { code: msg.code, message: msg.message }
      // A version mismatch is terminal: the client is out of date.
      if (msg.code === 'bad-version') return { ...state, status: 'version', error }
      // Before a welcome, an error means the join was refused for a reason the
      // user can fix (name taken, room locked); return to the form.
      if (state.seatId === null) return { ...state, status: 'join-error', error }
      // Already in the room: a transient rejection (e.g. a rejected settings
      // edit), surfaced without dropping the lobby.
      return { ...state, error }
    }
    case 'kicked':
      return { ...state, status: 'kicked', view: null, error: null }
    case 'roomClosed':
      return { ...state, status: 'room-closed', view: null, error: null }
    default:
      return state
  }
}
