import type { Env } from './env'
import { allowedOrigins, originAllowed } from './origin'
import {
  CREATE_CODE_ATTEMPTS,
  CREATE_LIMIT,
  CREATE_WINDOW_MS,
  JOIN_LIMIT,
  JOIN_WINDOW_MS,
} from './config'
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, isRoomCode, normalizeRoomCode, roomCodeFrom } from '../src/protocol'

export { RoomDurableObject } from './room'
export { RateLimiterDurableObject } from './ratelimiter'

// The worker: HTTP for room creation, a WebSocket upgrade for joining. All
// room state lives in the room Durable Object; this layer routes, checks
// origin, and rate-limits per IP. The static app on GitHub Pages is untouched;
// this runs at its own URL.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/rooms') {
      return createRoom(request, env)
    }

    const joinMatch = url.pathname.match(/^\/rooms\/([^/]+)\/?$/)
    if (joinMatch && request.method === 'GET') {
      return joinRoom(request, env, decodeURIComponent(joinMatch[1]))
    }

    return new Response('not found', { status: 404 })
  },
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  if (env.ROOMS_ENABLED === 'false') {
    return json(503, { error: 'multiplayer is off right now' })
  }
  const ip = clientIp(request)
  if (!(await rateOk(env, `create:${ip}`, CREATE_LIMIT, CREATE_WINDOW_MS))) {
    return json(429, { error: 'too many rooms, try again later' })
  }

  const body = (await request.json().catch(() => null)) as { editionId?: unknown } | null
  const editionId = body?.editionId
  if (typeof editionId !== 'string' || !editionId) {
    return json(400, { error: 'editionId is required' })
  }

  // Retry a fresh code on the vanishingly rare Durable Object name collision.
  for (let attempt = 0; attempt < CREATE_CODE_ATTEMPTS; attempt++) {
    const code = newCode()
    const stub = env.HINT_ROOM.get(env.HINT_ROOM.idFromName(code))
    if (await stub.createRoom(code, editionId)) {
      return json(200, { code })
    }
  }
  return json(500, { error: 'could not allocate a room, try again' })
}

async function joinRoom(request: Request, env: Env, rawCode: string): Promise<Response> {
  if (!originAllowed(request.headers.get('Origin'), allowedOrigins(env.ALLOWED_ORIGINS))) {
    return new Response('forbidden origin', { status: 403 })
  }
  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('expected a websocket upgrade', { status: 426 })
  }
  const code = normalizeRoomCode(rawCode)
  if (!isRoomCode(code)) {
    return new Response('bad room code', { status: 400 })
  }
  const ip = clientIp(request)
  if (!(await rateOk(env, `join:${ip}`, JOIN_LIMIT, JOIN_WINDOW_MS))) {
    return new Response('too many join attempts', { status: 429 })
  }

  const stub = env.HINT_ROOM.get(env.HINT_ROOM.idFromName(code))
  return stub.fetch(request)
}

async function rateOk(env: Env, key: string, limit: number, windowMs: number): Promise<boolean> {
  const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(key))
  return stub.hit(limit, windowMs)
}

// 32 divides 256 evenly, so a raw byte indexes the alphabet with no modulo
// bias.
function newCode(): string {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH)
  crypto.getRandomValues(bytes)
  let i = 0
  return roomCodeFrom(() => bytes[i++] % ROOM_CODE_ALPHABET.length)
}

function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'anon'
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
