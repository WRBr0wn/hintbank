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
