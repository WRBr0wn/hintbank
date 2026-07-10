// The worker's base URL. Empty (the default) means same-origin: in dev that is
// the Vite proxy to `wrangler dev` (see vite.config.ts), and in production the
// deploy sets VITE_ROOMS_URL to the worker's own origin (workers.dev or a
// custom domain), since the app on GitHub Pages and the worker are different
// origins there.
const BASE = (import.meta.env.VITE_ROOMS_URL ?? '').replace(/\/+$/, '')

export function createRoomUrl(): string {
  return `${BASE}/rooms`
}

// The pre-join lookup URL: the same path the socket uses, but as a plain GET
// (the worker tells them apart by the Upgrade header).
export function roomLookupUrl(code: string): string {
  return `${BASE}/rooms/${encodeURIComponent(code)}`
}

// The WebSocket URL for a room. Derived from BASE when set, otherwise from the
// current page origin (the proxy/same-origin case), flipping http(s) to ws(s).
export function roomSocketUrl(code: string): string {
  const path = `/rooms/${encodeURIComponent(code)}`
  if (BASE) {
    const url = new URL(`${BASE}${path}`)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return url.toString()
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}${path}`
}
