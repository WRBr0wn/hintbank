import { DurableObject } from 'cloudflare:workers'
import type { Env } from './env'
import { nameAllowed } from './names'
import { dueSeats, nextAlarmAt, shouldExpire } from './lifecycle'
import {
  GRACE_MS,
  MAX_MESSAGE_BYTES,
  MSG_BURST,
  MSG_MAX_STRIKES,
  MSG_REFILL_PER_SEC,
  ROOM_TTL_MS,
} from './config'
import {
  PROTOCOL_VERSION,
  RoomError,
  applyIntent,
  createRoom as createRoomState,
  defaultRoomSettings,
  disconnected,
  join as joinRoom,
  leave as leaveRoom,
  parseClientMessage,
  reconnected,
  viewFor,
  type ClientMessage,
  type RoomErrorCode,
  type RoomState,
  type SeatId,
  type ServerMessage,
} from '../src/protocol'

// Phase 2 stops at the lobby. Gameplay intents parse and validate but are
// refused here until phase 3 wires the engine through; the reducer already
// knows them, so this is a worker-side gate, not missing logic.
const LOBBY_INTENTS: ReadonlySet<ClientMessage['type']> = new Set([
  'updateSettings',
  'setLocked',
  'kick',
  'leave',
  'requestSnapshot',
  'closeRoom',
])

interface RoomMeta {
  code: string
  editionId: string
}

// Everything the reducer never touches: dealing a deck. Phase 2 has no turns,
// so a stray gameplay intent that slips the gate fails loudly instead of
// dealing.
const NO_DEAL = {
  dealDeck: (): string[] => {
    throw new RoomError('unsupported', 'dealing is not available yet')
  },
}

// One room. The Durable Object is the room's authoritative home; the reducer in
// src/protocol owns every state transition, and this class is transport,
// persistence, and time-based policy around it. Nothing here re-decides a game
// rule. Hibernation keeps sockets open while the object sleeps, so idle lobbies
// cost nothing.
export class RoomDurableObject extends DurableObject<Env> {
  // Per-socket message budgets. In-memory only: after a hibernation wake the
  // map is empty, which just means a fresh full bucket, an acceptable leniency.
  private buckets = new Map<WebSocket, { tokens: number; last: number; strikes: number }>()

  // Called once by the worker when a code is allocated, before anyone connects.
  // Returns false if the code is already taken, so the worker can retry.
  async createRoom(code: string, editionId: string): Promise<boolean> {
    if (await this.ctx.storage.get<RoomMeta>('meta')) return false
    await this.ctx.storage.put<RoomMeta>('meta', { code, editionId })
    // No connections yet, so start the idle-expiry countdown.
    await this.touchIdle(false)
    return true
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected a websocket upgrade', { status: 426 })
    }
    if (!(await this.ctx.storage.get<RoomMeta>('meta'))) {
      return new Response('no such room', { status: 404 })
    }
    const pair = new WebSocketPair()
    this.ctx.acceptWebSocket(pair[1])
    // A live connection cancels any pending idle expiry.
    await this.touchIdle(true)
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const size = typeof message === 'string' ? message.length : message.byteLength
    if (size > MAX_MESSAGE_BYTES) return // drop oversized frames
    if (!this.allow(ws)) return // over budget: dropped, and closed on sustained abuse

    let raw: unknown
    try {
      raw = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message))
    } catch {
      return // non-JSON: drop
    }

    let msg: ClientMessage
    try {
      msg = parseClientMessage(raw)
    } catch (e) {
      // Only a version mismatch is worth telling the client about (hard
      // refresh); other malformed frames are dropped silently.
      if (e instanceof RoomError && e.code === 'bad-version') this.send(ws, this.errorMsg(e))
      return
    }

    if (msg.type === 'join') return this.handleJoin(ws, msg)

    const seatId = this.seatOf(ws)
    if (!seatId) return // must join before anything else
    return this.handleIntent(ws, seatId, msg)
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.buckets.delete(ws)
    const seatId = this.seatOf(ws)
    if (seatId) {
      const room = await this.load()
      if (room && room.seats.some((s) => s.id === seatId)) {
        await this.save(disconnected(room, seatId))
        await this.setGrace(seatId, Date.now() + GRACE_MS)
        await this.broadcast()
      }
    }
    // If that was the last socket, start the room's idle countdown.
    await this.touchIdle(this.ctx.getWebSockets().length > 0)
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.buckets.delete(ws)
  }

  async alarm(): Promise<void> {
    const now = Date.now()
    const grace = await this.grace()
    const due = dueSeats(grace, now)
    let room = await this.load()
    let changed = false

    for (const seatId of due) {
      delete grace[seatId]
      const seat = room?.seats.find((s) => s.id === seatId)
      // A seat that reconnected inside the window is back to connected; leave
      // it. Only a still-absent seat loses its place and its token.
      if (room && seat && seat.connection === 'reconnecting') {
        room = leaveRoom(room, seatId)
        await this.invalidateToken(seatId)
        changed = true
      }
    }
    await this.putGrace(grace)
    if (changed && room) {
      await this.save(room)
      await this.broadcast()
    }

    const idleAt = await this.idleExpiry()
    if (shouldExpire(this.ctx.getWebSockets().length, idleAt, now)) {
      // No PII, tokens, or names outlive the room (MULTIPLAYER.md, Security).
      await this.ctx.storage.deleteAll()
      return
    }
    await this.reschedule()
  }

  // ---- join and reconnect ----

  private async handleJoin(ws: WebSocket, msg: Extract<ClientMessage, { type: 'join' }>): Promise<void> {
    const meta = await this.ctx.storage.get<RoomMeta>('meta')
    if (!meta) {
      this.send(ws, this.errorMsg(new RoomError('not-allowed', 'this room no longer exists')))
      return
    }
    let room = await this.load()

    // Reconnect: a valid token restores the existing seat and a fresh snapshot.
    if (msg.token) {
      const seatId = await this.seatForToken(msg.token)
      if (room && seatId && room.seats.some((s) => s.id === seatId)) {
        room = reconnected(room, seatId)
        await this.save(room)
        this.bindSeat(ws, seatId)
        await this.clearGrace(seatId)
        this.send(ws, { v: PROTOCOL_VERSION, type: 'welcome', seatId, token: msg.token, view: viewFor(room, seatId) })
        await this.broadcast()
        return
      }
      // A dead token falls through to a fresh join.
    }

    if (!nameAllowed(msg.name)) {
      this.send(ws, this.errorMsg(new RoomError('bad-name', 'pick another name')))
      return
    }

    const seatId = crypto.randomUUID()
    try {
      room = room
        ? joinRoom(room, { seatId, name: msg.name, avatar: msg.avatar, spectator: msg.spectator })
        : createRoomState({
            code: meta.code,
            editionId: meta.editionId,
            host: { seatId, name: msg.name, avatar: msg.avatar },
            settings: defaultRoomSettings([]),
          })
    } catch (e) {
      if (e instanceof RoomError) this.send(ws, this.errorMsg(e))
      return
    }

    const token = randomToken()
    await this.addToken(token, seatId)
    await this.save(room)
    this.bindSeat(ws, seatId)
    this.send(ws, { v: PROTOCOL_VERSION, type: 'welcome', seatId, token, view: viewFor(room, seatId) })
    await this.broadcast()
  }

  // ---- lobby intents ----

  private async handleIntent(ws: WebSocket, seatId: SeatId, msg: ClientMessage): Promise<void> {
    if (msg.type === 'requestSnapshot') {
      const room = await this.load()
      if (room) this.send(ws, { v: PROTOCOL_VERSION, type: 'snapshot', view: viewFor(room, seatId) })
      return
    }
    if (!LOBBY_INTENTS.has(msg.type)) {
      this.send(ws, this.errorMsg(new RoomError('unsupported', 'not available yet')))
      return
    }

    const before = await this.load()
    if (!before) return

    let after: RoomState
    try {
      after = applyIntent(before, seatId, msg, NO_DEAL)
    } catch (e) {
      if (e instanceof RoomError) this.send(ws, this.errorMsg(e))
      return
    }

    if (msg.type === 'closeRoom') {
      await this.tearDown('closed')
      return
    }

    await this.save(after)

    // Broadcast the new state to every socket first, while a kicked socket is
    // still open, then eject removed seats. Closing before the broadcast would
    // make the broadcast send to an already-closed socket.
    await this.broadcast()

    // A seat removed by a kick or a leave loses its token and its socket. Only
    // a kick tells the target why; a leaver closed their own socket.
    for (const gone of removedSeats(before, after)) {
      await this.invalidateToken(gone)
      for (const s of this.ctx.getWebSockets()) {
        if (this.seatOf(s) !== gone) continue
        if (msg.type === 'kick') this.send(s, { v: PROTOCOL_VERSION, type: 'kicked' })
        s.close(1000, 'seat removed')
      }
    }
  }

  // ---- broadcast and teardown ----

  // Every socket gets its own role-filtered view; the worker never sends raw
  // RoomState, so secrecy holds by construction.
  private async broadcast(): Promise<void> {
    const room = await this.load()
    if (!room) return
    for (const ws of this.ctx.getWebSockets()) {
      const seatId = this.seatOf(ws)
      if (!seatId) continue
      this.send(ws, { v: PROTOCOL_VERSION, type: 'snapshot', view: viewFor(room, seatId) })
    }
  }

  private async tearDown(reason: 'closed' | 'expired'): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) {
      this.send(ws, { v: PROTOCOL_VERSION, type: 'roomClosed', reason })
      ws.close(1000, reason)
    }
    await this.ctx.storage.deleteAll()
  }

  // ---- socket <-> seat binding ----

  private bindSeat(ws: WebSocket, seatId: SeatId): void {
    ws.serializeAttachment({ seatId })
  }

  private seatOf(ws: WebSocket): SeatId | null {
    const attachment = ws.deserializeAttachment() as { seatId?: SeatId } | null
    return attachment?.seatId ?? null
  }

  // ---- per-connection rate limit ----

  private allow(ws: WebSocket): boolean {
    const now = Date.now()
    let bucket = this.buckets.get(ws)
    if (!bucket) {
      bucket = { tokens: MSG_BURST, last: now, strikes: 0 }
      this.buckets.set(ws, bucket)
    }
    const elapsed = (now - bucket.last) / 1000
    bucket.tokens = Math.min(MSG_BURST, bucket.tokens + elapsed * MSG_REFILL_PER_SEC)
    bucket.last = now
    if (bucket.tokens < 1) {
      bucket.strikes += 1
      if (bucket.strikes > MSG_MAX_STRIKES) ws.close(1013, 'slow down')
      return false
    }
    bucket.tokens -= 1
    bucket.strikes = 0
    return true
  }

  // ---- storage ----

  private async load(): Promise<RoomState | null> {
    return (await this.ctx.storage.get<RoomState>('room')) ?? null
  }

  private async save(room: RoomState): Promise<void> {
    await this.ctx.storage.put('room', room)
  }

  private async tokens(): Promise<Record<string, SeatId>> {
    return (await this.ctx.storage.get<Record<string, SeatId>>('tokens')) ?? {}
  }

  private async seatForToken(token: string): Promise<SeatId | undefined> {
    return (await this.tokens())[token]
  }

  private async addToken(token: string, seatId: SeatId): Promise<void> {
    const tokens = await this.tokens()
    tokens[token] = seatId
    await this.ctx.storage.put('tokens', tokens)
  }

  private async invalidateToken(seatId: SeatId): Promise<void> {
    const tokens = await this.tokens()
    let touched = false
    for (const [token, id] of Object.entries(tokens)) {
      if (id === seatId) {
        delete tokens[token]
        touched = true
      }
    }
    if (touched) await this.ctx.storage.put('tokens', tokens)
  }

  private async grace(): Promise<Record<SeatId, number>> {
    return (await this.ctx.storage.get<Record<SeatId, number>>('grace')) ?? {}
  }

  private async putGrace(grace: Record<SeatId, number>): Promise<void> {
    await this.ctx.storage.put('grace', grace)
  }

  private async setGrace(seatId: SeatId, deadline: number): Promise<void> {
    const grace = await this.grace()
    grace[seatId] = deadline
    await this.putGrace(grace)
    await this.reschedule()
  }

  private async clearGrace(seatId: SeatId): Promise<void> {
    const grace = await this.grace()
    if (seatId in grace) {
      delete grace[seatId]
      await this.putGrace(grace)
      await this.reschedule()
    }
  }

  private async idleExpiry(): Promise<number | null> {
    return (await this.ctx.storage.get<number>('idleExpiry')) ?? null
  }

  // connected true clears the idle countdown; false (arriving at zero sockets)
  // starts it. Either way the alarm is rescheduled to the nearest deadline.
  private async touchIdle(connected: boolean): Promise<void> {
    if (connected) {
      await this.ctx.storage.delete('idleExpiry')
    } else {
      await this.ctx.storage.put('idleExpiry', Date.now() + ROOM_TTL_MS)
    }
    await this.reschedule()
  }

  private async reschedule(): Promise<void> {
    const at = nextAlarmAt(await this.grace(), await this.idleExpiry())
    if (at == null) await this.ctx.storage.deleteAlarm()
    else await this.ctx.storage.setAlarm(at)
  }

  // ---- small helpers ----

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      // The socket is mid-close; nothing to deliver.
    }
  }

  private errorMsg(e: RoomError): ServerMessage {
    return { v: PROTOCOL_VERSION, type: 'error', code: e.code as RoomErrorCode, message: e.message }
  }
}

// Seat ids present before an intent but gone after it (a kick or a leave).
function removedSeats(before: RoomState, after: RoomState): SeatId[] {
  const still = new Set(after.seats.map((s) => s.id))
  return before.seats.map((s) => s.id).filter((id) => !still.has(id))
}

// A 128-bit reconnect token as hex. The only credential a seat has; it travels
// in messages, never in a URL.
function randomToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
