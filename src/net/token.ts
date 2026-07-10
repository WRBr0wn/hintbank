// Reconnect-token persistence, keyed by room code. localStorage, not
// sessionStorage: a closed tab or a locked phone must not cost a seat, and
// sessionStorage dies with the tab. The token is the only credential a seat
// has; it lives here and travels in messages, never in a URL. The store is
// injectable so the logic is testable without a DOM.
export interface KeyStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const keyFor = (code: string) => `hintbank.room.${code}.token`

// localStorage can throw (private mode, disabled storage); treat any failure as
// "no store", so a missing token just means a fresh seat.
function defaultStore(): KeyStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

// Tokens are for players. A spectator connection is a display surface (a board
// view) with no score or rotation slot to restore, and in the same browser it
// would otherwise load the player seat's token (taking that seat over) and
// overwrite it on welcome. Giving it no store makes every token operation
// inert; a dropped board view rejoins fresh, which loses nothing.
export function tokenStoreFor(spectator: boolean | undefined, store: KeyStore | null = defaultStore()): KeyStore | null {
  return spectator ? null : store
}

export function loadToken(code: string, store: KeyStore | null = defaultStore()): string | null {
  try {
    return store?.getItem(keyFor(code)) ?? null
  } catch {
    return null
  }
}

export function saveToken(code: string, token: string, store: KeyStore | null = defaultStore()): void {
  try {
    store?.setItem(keyFor(code), token)
  } catch {
    // Nothing to do; a lost token just means a new seat next time.
  }
}

export function clearToken(code: string, store: KeyStore | null = defaultStore()): void {
  try {
    store?.removeItem(keyFor(code))
  } catch {
    // Ignore: the room is ending anyway.
  }
}
