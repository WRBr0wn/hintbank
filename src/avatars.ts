import type { PlayerAvatar } from './types'

// Neutral emoji set: the fallback for editions that declare no avatars, so a
// future edition works day one without avatar data. Pokemon also leads its own
// declared set with these.
export const EMOJI_AVATARS: PlayerAvatar[] = ['🦊', '🐢', '🐉', '🦉', '🐱', '🐰', '🐼', '🐧', '🦄', '🐸', '🦁', '🐙'].map(
  (value) => ({ kind: 'emoji', value }),
)

// The maker's avatar signs off every edition's picker. Platform-level: it is
// not part of any edition's set, so it is appended here, always last.
const ZENVOLKA: PlayerAvatar = {
  kind: 'image',
  src: `${import.meta.env.BASE_URL}avatars/zenvolka.png`,
  label: 'ZenVolka',
}

export const avatarKey = (a: PlayerAvatar) => (a.kind === 'emoji' ? a.value : a.src)

// The picker set for an edition: what its manifest declares, or the neutral
// default when it declares nothing.
export function avatarsFor(declared?: PlayerAvatar[]): PlayerAvatar[] {
  return [...(declared ?? EMOJI_AVATARS), ZENVOLKA]
}
