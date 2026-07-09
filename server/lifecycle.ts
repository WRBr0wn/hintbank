// Pure helpers for the worker's clock decisions: which grace deadlines are due
// and when the next alarm should fire. Kept out of the Durable Object so they
// are unit-testable without a runtime, the same discipline the engine and the
// protocol reducer follow.

// Seats whose disconnect grace has run out as of now. The caller then drops
// each through the reducer's leave.
export function dueSeats(grace: Record<string, number>, now: number): string[] {
  return Object.entries(grace)
    .filter(([, deadline]) => deadline <= now)
    .map(([seatId]) => seatId)
}

// The earliest pending deadline across the grace timers and the idle-expiry
// timestamp, or null when nothing is scheduled. Drives setAlarm.
export function nextAlarmAt(grace: Record<string, number>, idleAt: number | null): number | null {
  const times = Object.values(grace)
  if (idleAt != null) times.push(idleAt)
  return times.length > 0 ? Math.min(...times) : null
}

// The room is torn down when nothing is connected and the idle deadline has
// passed. A single connection resets it (the worker clears idleAt on connect).
export function shouldExpire(connections: number, idleAt: number | null, now: number): boolean {
  return connections === 0 && idleAt != null && idleAt <= now
}
