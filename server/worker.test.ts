import { env, runDurableObjectAlarm, runInDurableObject, SELF } from 'cloudflare:test'
import { afterEach, describe, expect, it } from 'vitest'
import worker from './index'
import type { Env } from './env'
import { isRoomCode } from '../src/protocol'

const ORIGIN = 'https://wrbr0wn.github.io'
const bindings = env as unknown as Env

// Sockets opened in a test are closed here so the room Durable Object releases
// its storage before the isolated-storage teardown (an open socket holds the
// SQLite file, which Windows will not let the runner unlink between tests).
const openSockets: WebSocket[] = []
afterEach(() => {
  for (const ws of openSockets.splice(0)) {
    try {
      ws.close()
    } catch {
      // already closed
    }
  }
})

// ---- helpers ----

// A distinct client IP per call keeps the per-IP rate-limit counters from
// bleeding across tests now that storage is shared (no isolated storage). A
// single test does far fewer creates/joins than the limits, so a fresh IP each
// time is safe.
let ipSeq = 0
function freshIp(): string {
  ipSeq += 1
  return `10.0.${Math.floor(ipSeq / 256) % 256}.${ipSeq % 256}`
}

async function createRoom(editionId = 'geography', ip = freshIp()): Promise<string> {
  const res = await SELF.fetch('https://rooms.test/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify({ editionId }),
  })
  expect(res.status).toBe(200)
  const body = (await res.json()) as { code: string }
  return body.code
}

async function openSocket(code: string, origin = ORIGIN, ip = freshIp()): Promise<WebSocket> {
  const res = await SELF.fetch(`https://rooms.test/rooms/${code}`, {
    headers: { Upgrade: 'websocket', Origin: origin, 'CF-Connecting-IP': ip },
  })
  expect(res.status).toBe(101)
  const ws = res.webSocket!
  ws.accept()
  openSockets.push(ws)
  return ws
}

function send(ws: WebSocket, msg: unknown): void {
  ws.send(JSON.stringify(msg))
}

// Reads frames until one satisfies the predicate, so a test can ignore the
// welcome-then-snapshot ordering and assert on the frame it cares about.
function until(ws: WebSocket, pred: (m: any) => boolean, timeoutMs = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeEventListener('message', onMessage)
      reject(new Error('timed out waiting for a matching message'))
    }, timeoutMs)
    function onMessage(event: MessageEvent) {
      const msg = JSON.parse(event.data as string)
      if (pred(msg)) {
        clearTimeout(timer)
        ws.removeEventListener('message', onMessage)
        resolve(msg)
      }
    }
    ws.addEventListener('message', onMessage)
  })
}

// Resolves when the socket closes. A kicked seat is ejected, so the test waits
// on the close rather than a trailing message (workerd drops a frame buffered
// immediately before close).
function closed(ws: WebSocket, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket did not close')), timeoutMs)
    ws.addEventListener(
      'close',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

async function joinAsHost(code: string, name = 'Ann'): Promise<{ ws: WebSocket; seatId: string; token: string }> {
  const ws = await openSocket(code)
  send(ws, { v: 1, type: 'join', name, avatar: 'fox' })
  const welcome = await until(ws, (m) => m.type === 'welcome')
  return { ws, seatId: welcome.seatId, token: welcome.token }
}

// ---- create ----

describe('room creation', () => {
  it('returns a valid room code', async () => {
    const code = await createRoom()
    expect(isRoomCode(code)).toBe(true)
  })

  it('rejects a body with no edition', async () => {
    const res = await SELF.fetch('https://rooms.test/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('honors the kill switch', async () => {
    const res = await worker.fetch(
      new Request('https://rooms.test/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ editionId: 'geography' }),
      }),
      { ...bindings, ROOMS_ENABLED: 'false' },
    )
    expect(res.status).toBe(503)
  })

  it('rate-limits creation per IP', async () => {
    const ip = '203.0.113.7' // one dedicated IP so the counter is this test's alone
    let last = 200
    for (let i = 0; i < 6; i++) {
      const res = await SELF.fetch('https://rooms.test/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
        body: JSON.stringify({ editionId: 'geography' }),
      })
      last = res.status
    }
    expect(last).toBe(429) // the sixth within the window is refused
  })
})

// ---- origin and code guards ----

describe('join guards', () => {
  it('rejects an upgrade from a disallowed origin', async () => {
    const code = await createRoom()
    const res = await SELF.fetch(`https://rooms.test/rooms/${code}`, {
      headers: { Upgrade: 'websocket', Origin: 'https://evil.example' },
    })
    expect(res.status).toBe(403)
  })

  it('rejects an upgrade with no origin', async () => {
    const code = await createRoom()
    const res = await SELF.fetch(`https://rooms.test/rooms/${code}`, {
      headers: { Upgrade: 'websocket' },
    })
    expect(res.status).toBe(403)
  })

  it('returns 404 for a code that was never created', async () => {
    const res = await SELF.fetch('https://rooms.test/rooms/AAAAAA', {
      headers: { Upgrade: 'websocket', Origin: ORIGIN },
    })
    expect(res.status).toBe(404)
  })
})

// ---- lobby flow ----

describe('lobby', () => {
  it('seats the first joiner as host', async () => {
    const code = await createRoom()
    const { seatId, token, ws } = await joinAsHost(code)
    expect(isRoomCode(code)).toBe(true)
    expect(token).toMatch(/^[0-9a-f]{32}$/)
    const snap = await until(ws, (m) => m.type === 'welcome' || m.type === 'snapshot')
    expect(snap.view.hostId).toBe(seatId)
    expect(snap.view.phase).toBe('lobby')
    expect(snap.view.seats).toHaveLength(1)
  })

  it('broadcasts a second join to everyone', async () => {
    const code = await createRoom()
    const host = await joinAsHost(code)
    const guest = await openSocket(code)
    send(guest, { v: 1, type: 'join', name: 'Bob', avatar: 'turtle' })
    await until(guest, (m) => m.type === 'welcome')
    const hostSnap = await until(host.ws, (m) => m.type === 'snapshot' && m.view.seats.length === 2)
    expect(hostSnap.view.seats.map((s: any) => s.name).sort()).toEqual(['Ann', 'Bob'])
  })

  it('propagates a host settings change live', async () => {
    const code = await createRoom()
    const host = await joinAsHost(code)
    send(host.ws, { v: 1, type: 'updateSettings', settings: { answersPerGame: 6 } })
    const snap = await until(host.ws, (m) => m.type === 'snapshot' && m.view.settings.answersPerGame === 6)
    expect(snap.view.settings.answersPerGame).toBe(6)
  })

  it('refuses a settings change from a non-host', async () => {
    const code = await createRoom()
    await joinAsHost(code)
    const guest = await openSocket(code)
    send(guest, { v: 1, type: 'join', name: 'Bob', avatar: 'turtle' })
    await until(guest, (m) => m.type === 'welcome')
    send(guest, { v: 1, type: 'updateSettings', settings: { answersPerGame: 6 } })
    const err = await until(guest, (m) => m.type === 'error')
    expect(err.code).toBe('not-host')
  })
})

// ---- reconnect, kick, lock ----

describe('seat lifecycle', () => {
  it('restores a seat from its reconnect token', async () => {
    const code = await createRoom()
    const host = await joinAsHost(code)
    const back = await openSocket(code)
    send(back, { v: 1, type: 'join', name: 'Ann', avatar: 'fox', token: host.token })
    const reWelcome = await until(back, (m) => m.type === 'welcome')
    expect(reWelcome.seatId).toBe(host.seatId)
  })

  it('kicks a seat, ejecting it and dropping it from the roster', async () => {
    const code = await createRoom()
    const host = await joinAsHost(code)
    const guest = await openSocket(code)
    send(guest, { v: 1, type: 'join', name: 'Bob', avatar: 'turtle' })
    const guestWelcome = await until(guest, (m) => m.type === 'welcome')
    // Attach both listeners before the kick, so neither the guest close nor the
    // host's roster-1 snapshot can arrive before we are listening.
    const guestClosed = closed(guest)
    const hostRoster1 = until(host.ws, (m) => m.type === 'snapshot' && m.view.seats.length === 1)
    send(host.ws, { v: 1, type: 'kick', seatId: guestWelcome.seatId })
    await guestClosed // the kicked seat's socket is closed
    const snap = await hostRoster1
    expect(snap.view.seats[0].name).toBe('Ann')
  })

  it('blocks a join into a locked room', async () => {
    const code = await createRoom()
    const host = await joinAsHost(code)
    send(host.ws, { v: 1, type: 'setLocked', locked: true })
    await until(host.ws, (m) => m.type === 'snapshot' && m.view.locked === true)
    const guest = await openSocket(code)
    send(guest, { v: 1, type: 'join', name: 'Bob', avatar: 'turtle' })
    const err = await until(guest, (m) => m.type === 'error')
    expect(err.code).toBe('room-locked')
  })

  it('tells an out-of-date client to refresh', async () => {
    const code = await createRoom()
    const ws = await openSocket(code)
    send(ws, { v: 999, type: 'join', name: 'Ann', avatar: 'fox' })
    const err = await until(ws, (m) => m.type === 'error')
    expect(err.code).toBe('bad-version')
  })
})

// ---- expiry ----

describe('room expiry', () => {
  it('deletes all state when the idle deadline passes with no connections', async () => {
    const code = await createRoom()
    const stub = bindings.HINT_ROOM.get(bindings.HINT_ROOM.idFromName(code))
    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put('idleExpiry', Date.now() - 1000)
    })
    const ran = await runDurableObjectAlarm(stub)
    expect(ran).toBe(true)
    await runInDurableObject(stub, async (_instance, state) => {
      const all = await state.storage.list()
      expect(all.size).toBe(0)
    })
  })
})
