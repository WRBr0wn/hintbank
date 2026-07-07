import type { CSSProperties } from 'react'

// Pokemon sprites share a 96px canvas but the artwork inside varies from ~27px
// to the full 96 (PokeAPI preserves the games' relative scale), so small
// Pokemon render tiny in fixed slots. Given the artwork's measured bounding
// box ([x, y, w, h] on the canvas; see scripts/measure-sprites.mjs), this
// centers the artwork and scales it toward the target extent. Upscales are
// capped: past 2x the smallest pixel art turns to mush even pixelated, so the
// scaled content never exceeds the canvas and nothing overflows a square slot.
const CANVAS = 96
const MAX_SCALE = 2

// Target extent for circular frames. A circle's usable area is smaller than
// its bounding square, so the full-canvas target would push ears and wings
// into the missing corners; ~72% of the diameter keeps the artwork comfortably
// inside the inscribed area. Sprites larger than this shrink to fit.
export const ROUND_TARGET = 69

export function spriteZoom(box?: number[], target = CANVAS): CSSProperties | undefined {
  if (!box) return undefined
  const [x, y, w, h] = box
  const scale = Math.min(target / Math.max(w, h), MAX_SCALE)
  const dx = ((CANVAS / 2 - (x + w / 2)) / CANVAS) * 100
  const dy = ((CANVAS / 2 - (y + h / 2)) / CANVAS) * 100
  if (scale === 1 && dx === 0 && dy === 0) return undefined
  const style: CSSProperties = {
    transform: `scale(${scale.toFixed(3)}) translate(${dx.toFixed(2)}%, ${dy.toFixed(2)}%)`,
  }
  // Pixelated only on upscale; downscales render smoother without it.
  if (scale > 1) style.imageRendering = 'pixelated'
  return style
}
