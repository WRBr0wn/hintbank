import type { SessionState } from './types'

export function createSession(players: string[]): SessionState {
  if (players.length < 2) throw new Error('a session needs at least 2 players')
  const totals: Record<string, number> = {}
  for (const p of players) totals[p] = 0
  return { players, totals, giverPosition: 0, completedRotations: 0 }
}

export const currentGiver = (s: SessionState): string | null =>
  s.giverPosition < s.players.length ? s.players[s.giverPosition] : null

export const isRotationComplete = (s: SessionState): boolean =>
  s.giverPosition >= s.players.length

export function recordGame(s: SessionState, deltas: Record<string, number>): SessionState {
  if (isRotationComplete(s)) {
    throw new Error('rotation complete; continue or start over first')
  }
  const totals = { ...s.totals }
  for (const [pid, delta] of Object.entries(deltas)) {
    totals[pid] = (totals[pid] ?? 0) + delta
  }
  const giverPosition = s.giverPosition + 1
  const completedRotations =
    giverPosition >= s.players.length ? s.completedRotations + 1 : s.completedRotations
  return { ...s, totals, giverPosition, completedRotations }
}

export function continueSession(s: SessionState): SessionState {
  if (!isRotationComplete(s)) throw new Error('the current rotation is not finished')
  return { ...s, giverPosition: 0 }
}

export function startOver(s: SessionState): SessionState {
  const totals: Record<string, number> = {}
  for (const p of s.players) totals[p] = 0
  return { ...s, totals, giverPosition: 0, completedRotations: 0 }
}

// Players tied for the highest total — the crown. All zeros at session start
// means everyone is a leader, which is the honest answer.
export function leaders(s: SessionState): string[] {
  let best = -Infinity
  for (const p of s.players) {
    const total = s.totals[p] ?? 0
    if (total > best) best = total
  }
  return s.players.filter((p) => (s.totals[p] ?? 0) === best)
}
