import { ANSWERS_PER_GAME, HINTER_BASE, type GameMode, type SessionState } from './types'

// The clue cutoff scales with answer count: the base is the cutoff for a full
// 10-answer game, and a shorter game scales it down in proportion (round-half-up).
// A full game leaves the base unchanged.
export const cutoffFor = (base: number, answers: number) => Math.round(base * (answers / ANSWERS_PER_GAME))

export function createSession(
  players: string[],
  mode: GameMode = 'in-person',
  hinterBase: number = HINTER_BASE,
  answersPerGame: number = ANSWERS_PER_GAME,
): SessionState {
  if (players.length < 2) throw new Error('a session needs at least 2 players')
  const totals: Record<string, number> = {}
  for (const p of players) totals[p] = 0
  return { players, totals, mode, hinterBase, answersPerGame, hinterPosition: 0, completedRotations: 0 }
}

export const currentHinter = (s: SessionState): string | null =>
  s.hinterPosition < s.players.length ? s.players[s.hinterPosition] : null

export const isRotationComplete = (s: SessionState): boolean =>
  s.hinterPosition >= s.players.length

export function recordGame(s: SessionState, deltas: Record<string, number>): SessionState {
  if (isRotationComplete(s)) {
    throw new Error('rotation complete; continue or start over first')
  }
  const totals = { ...s.totals }
  for (const [pid, delta] of Object.entries(deltas)) {
    totals[pid] = (totals[pid] ?? 0) + delta
  }
  const hinterPosition = s.hinterPosition + 1
  const completedRotations =
    hinterPosition >= s.players.length ? s.completedRotations + 1 : s.completedRotations
  return { ...s, totals, hinterPosition, completedRotations }
}

export function continueSession(s: SessionState): SessionState {
  if (!isRotationComplete(s)) throw new Error('the current rotation is not finished')
  return { ...s, hinterPosition: 0 }
}

export function startOver(s: SessionState): SessionState {
  const totals: Record<string, number> = {}
  for (const p of s.players) totals[p] = 0
  return { ...s, totals, hinterPosition: 0, completedRotations: 0 }
}

// Players tied for the highest total. Everyone starts at zero, so a fresh session
// ties all players.
export function leaders(s: SessionState): string[] {
  let best = -Infinity
  for (const p of s.players) {
    const total = s.totals[p] ?? 0
    if (total > best) best = total
  }
  return s.players.filter((p) => (s.totals[p] ?? 0) === best)
}
