// Origin check for the WebSocket upgrade. Not authentication, just a cheap cut
// against lazy cross-site abuse: the GitHub Pages origin and localhost dev are
// allowed, everything else is refused (MULTIPLAYER.md, Security).

export function originAllowed(origin: string | null, allowList: string[]): boolean {
  if (!origin) return false
  if (allowList.includes(origin)) return true
  try {
    const { hostname } = new URL(origin)
    // Any localhost port, so dev servers on 5173/4173/etc all work.
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

// The configured allow list plus the production default, so a misconfigured or
// empty var still admits the deployed site.
export function allowedOrigins(configured: string | undefined): string[] {
  const fromEnv = (configured ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return fromEnv.length > 0 ? fromEnv : ['https://wrbr0wn.github.io']
}

// The methods and request header the HTTP calls actually use. content-type:
// application/json is not a CORS-safe value, so the browser preflights POST
// /rooms in production (GitHub Pages -> workers.dev, a cross origin); the
// GET lookup is a simple request and needs only the origin grant.
const CORS_METHODS = 'GET, POST, OPTIONS'
const CORS_HEADERS = 'content-type'

// The CORS grant for the create and lookup paths, reusing the same allow list
// the WebSocket Origin check uses (one allow list, not two). Echoes the matched
// origin, never a wildcard, and returns nothing for a disallowed origin so it
// gets no grant and the browser blocks it. No credentials mode: the reconnect
// token travels in messages, not a cookie, so there is no credentialed CORS
// surface.
export function corsHeaders(origin: string | null, allowList: string[]): Record<string, string> {
  if (!origin || !originAllowed(origin, allowList)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': CORS_METHODS,
    'Access-Control-Allow-Headers': CORS_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
