import type { Env } from './env'
import { allowedOrigins, corsHeaders, originAllowed } from './origin'
import {
  CREATE_CODE_ATTEMPTS,
  CREATE_LIMIT,
  CREATE_WINDOW_MS,
  JOIN_LIMIT,
  JOIN_WINDOW_MS,
  LOOKUP_LIMIT,
  LOOKUP_WINDOW_MS,
} from './config'
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, isRoomCode, normalizeRoomCode, roomCodeFrom } from '../src/protocol'

export { RoomDurableObject } from './room'
export { RateLimiterDurableObject } from './ratelimiter'

// The worker: HTTP for room creation and the pre-join lookup, a WebSocket
// upgrade for joining. All room state lives in the room Durable Object; this
// layer routes, checks origin, and rate-limits per IP. The static app on
// GitHub Pages is untouched; this runs at its own URL.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // The create call is cross-origin in production (GitHub Pages -> workers.
    // dev), so it needs CORS. The grant reuses the WebSocket Origin allow list.
    if (url.pathname === '/rooms') {
      const cors = corsHeaders(request.headers.get('Origin'), allowedOrigins(env.ALLOWED_ORIGINS))
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
      if (request.method === 'POST') return createRoom(request, env, cors)
      return new Response('method not allowed', { status: 405, headers: cors })
    }

    // One route, two meanings, told apart by the Upgrade header: with it this
    // is the WebSocket join (unchanged), without it the pre-join lookup.
    const roomMatch = url.pathname.match(/^\/rooms\/([^/]+)\/?$/)
    if (roomMatch && request.method === 'GET') {
      const rawCode = decodeURIComponent(roomMatch[1])
      return request.headers.get('Upgrade') === 'websocket'
        ? joinRoom(request, env, rawCode)
        : lookupRoom(request, env, rawCode)
    }

    return new Response('not found', { status: 404 })
  },
}

async function createRoom(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  if (env.ROOMS_ENABLED === 'false') {
    return json(503, { error: 'multiplayer is off right now' }, cors)
  }
  const ip = clientIp(request)
  if (!(await rateOk(env, `create:${ip}`, CREATE_LIMIT, CREATE_WINDOW_MS))) {
    return json(429, { error: 'too many rooms, try again later' }, cors)
  }

  const body = (await request.json().catch(() => null)) as { editionId?: unknown } | null
  const editionId = body?.editionId
  if (typeof editionId !== 'string' || !editionId) {
    return json(400, { error: 'editionId is required' }, cors)
  }

  // Retry a fresh code on the vanishingly rare Durable Object name collision.
  for (let attempt = 0; attempt < CREATE_CODE_ATTEMPTS; attempt++) {
    const code = newCode()
    const stub = env.HINT_ROOM.get(env.HINT_ROOM.idFromName(code))
    if (await stub.createRoom(code, editionId)) {
      return json(200, { code }, cors)
    }
  }
  return json(500, { error: 'could not allocate a room, try again' }, cors)
}

// Only ever called with the Upgrade header present (the route disambiguates),
// so no 426 branch remains here.
async function joinRoom(request: Request, env: Env, rawCode: string): Promise<Response> {
  if (!originAllowed(request.headers.get('Origin'), allowedOrigins(env.ALLOWED_ORIGINS))) {
    return new Response('forbidden origin', { status: 403 })
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

// The pre-join lookup: whether a code names a live room, its edition, whether
// it is joinable, and the avatar keys already taken. A nicety in front of the
// handshake, which stays the source of truth for every join error; and a
// code-probe surface, so it takes its own per-IP budget. Cross-origin from the
// Pages client, so it carries the same CORS grant as the create path (one
// allow list, never a wildcard).
async function lookupRoom(request: Request, env: Env, rawCode: string): Promise<Response> {
  const cors = corsHeaders(request.headers.get('Origin'), allowedOrigins(env.ALLOWED_ORIGINS))
  const code = normalizeRoomCode(rawCode)
  if (!isRoomCode(code)) {
    return json(400, { error: 'bad room code' }, cors)
  }
  const ip = clientIp(request)
  if (!(await rateOk(env, `lookup:${ip}`, LOOKUP_LIMIT, LOOKUP_WINDOW_MS))) {
    return json(429, { error: 'too many lookups, try again shortly' }, cors)
  }
  const stub = env.HINT_ROOM.get(env.HINT_ROOM.idFromName(code))
  const found = await stub.lookup()
  if (!found) return json(404, { error: 'no such room' }, cors)
  return json(200, found, cors)
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

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...extra },
  })
}
