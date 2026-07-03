// Set toggles shared by the pickers. Both return a new Set so they can feed
// setState directly.
export function toggled<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

// Same, but keeps at least one item selected: toggling the last one off is a no-op.
export function toggledKeepOne<T>(set: ReadonlySet<T>, value: T): Set<T> {
  if (set.has(value) && set.size <= 1) return new Set(set)
  return toggled(set, value)
}
