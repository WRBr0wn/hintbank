import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './types'

// A room code is exactly ROOM_CODE_LENGTH characters from the unambiguous
// alphabet. The join form normalizes user input to uppercase first; this is
// the shared shape check the client and the worker both apply.
export function isRoomCode(raw: string): boolean {
  if (raw.length !== ROOM_CODE_LENGTH) return false
  for (const ch of raw) {
    if (!ROOM_CODE_ALPHABET.includes(ch)) return false
  }
  return true
}

// Normalize a typed code: uppercase, strip whitespace. Returns the cleaned
// code, which the caller then checks with isRoomCode.
export function normalizeRoomCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

// Builds a code from a random-integer source (0..alphabet length-1). The
// randomness stays with the caller (the worker's crypto), keeping this pure
// and testable, the same discipline the engine uses for its deck shuffle.
export function roomCodeFrom(randomIndex: () => number): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[randomIndex() % ROOM_CODE_ALPHABET.length]
  }
  return code
}
