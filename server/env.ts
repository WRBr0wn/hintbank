import type { RoomDurableObject } from './room'
import type { RateLimiterDurableObject } from './ratelimiter'

// The worker's bindings, as declared in wrangler.toml. The Durable Object
// namespaces are typed with their class so stub calls are checked (RPC).
export interface Env {
  HINT_ROOM: DurableObjectNamespace<RoomDurableObject>
  RATE_LIMITER: DurableObjectNamespace<RateLimiterDurableObject>
  // Kill switch for room creation: set to "false" to stop new rooms during
  // sustained abuse. Existing rooms keep running.
  ROOMS_ENABLED: string
  // Comma-separated origin allow list for the WebSocket upgrade.
  ALLOWED_ORIGINS: string
}
