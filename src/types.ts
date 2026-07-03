// UI presentation types. Engine domain types (game state, scoring) live in
// src/engine/types.ts. Don't import those from here, or these from there.

export type PlayerAvatar =
  | { kind: 'emoji'; value: string }
  // zoom scales the image inside its box. Above 1 it crops padding, like the
  // empty margin around a Pokemon sprite. Defaults to 1 for photos that fill.
  // bare drops the round disc and backdrop so a transparent sprite floats like an
  // emoji. Leave it off for photos, which need the circle to crop to shape.
  | { kind: 'image'; src: string; label?: string; zoom?: number; bare?: boolean }

// The engine only ever uses the id; name and avatar live here so the engine
// stays presentation-agnostic.
export interface Player {
  id: string
  name: string
  avatar: PlayerAvatar
}
