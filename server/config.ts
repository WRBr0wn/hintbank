// Tunable policy numbers for the worker. The plan (MULTIPLAYER.md) calls these
// starting points to be tuned in playtesting; they live in one place so a tune
// is a one-line edit. Time-based policy is the worker's, not the reducer's.

export const GRACE_MS = 2 * 60 * 1000
export const ROOM_TTL_MS = 30 * 60 * 1000

// Inbound frames larger than this are dropped before parsing.
export const MAX_MESSAGE_BYTES = 4096

// Per-IP room creation and join-attempt limits.
export const CREATE_LIMIT = 5
export const CREATE_WINDOW_MS = 60 * 60 * 1000
export const JOIN_LIMIT = 20
export const JOIN_WINDOW_MS = 60 * 1000

// Per-connection message budget: a token bucket that refills to a burst cap.
// Sustained overflow past the strike count closes the socket.
export const MSG_BURST = 10
export const MSG_REFILL_PER_SEC = 10
export const MSG_MAX_STRIKES = 20

// Per-connection typed-guess throttle: a small token bucket over guesses alone,
// tighter than the message budget, a backstop to the rules-based pricing (every
// wrong pick past the first already costs a point). Over budget, a guess is
// dropped. A human picking from the typeahead stays well under this.
export const GUESS_BURST = 5
export const GUESS_REFILL_PER_SEC = 3

// How many times room creation retries a fresh code on a Durable Object
// collision before giving up. The code space is ~1 billion, so this is
// effectively never reached.
export const CREATE_CODE_ATTEMPTS = 5
