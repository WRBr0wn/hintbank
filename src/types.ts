// UI presentation types. Engine domain types (game state, scoring) live in
// src/engine/types.ts — don't import those from here, or these from there.
//
// UI-side player record. The engine only ever deals in the id; name and avatar
// live here so the engine stays category- and presentation-agnostic.
export interface Player {
  id: string
  name: string
  avatar: string
}
