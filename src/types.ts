// UI presentation types. Engine domain types (game state, scoring) live in
// src/engine/types.ts — don't import those from here, or these from there.

// An avatar is either an emoji glyph or an image (a creator pic or Pokemon
// sprite). The <Avatar> component renders whichever kind is present.
export type PlayerAvatar =
  | { kind: 'emoji'; value: string }
  // zoom scales the image inside its box (>1 crops padding, e.g. the empty
  // margin around a Pokemon sprite). Defaults to 1 for photos that already fill.
  // bare drops the circular disc + backdrop so a transparent sprite floats like
  // an emoji; leave it off for photos, which need the circle to crop to shape.
  | { kind: 'image'; src: string; label?: string; zoom?: number; bare?: boolean }

// UI-side player record. The engine only ever deals in the id; name and avatar
// live here so the engine stays category- and presentation-agnostic.
export interface Player {
  id: string
  name: string
  avatar: PlayerAvatar
}
