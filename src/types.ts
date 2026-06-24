// UI-side player record. The engine only ever deals in the id; name and avatar
// live here so the engine stays category- and presentation-agnostic.
export interface Player {
  id: string
  name: string
  avatar: string
}
