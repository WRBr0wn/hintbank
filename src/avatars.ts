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

// Resolve an avatar key (what a seat carries over the wire) back to a full
// avatar for rendering, against this edition's picker set. A key from another
// edition or an old build falls back to a neutral face rather than breaking the
// roster.
export function avatarByKey(avatars: PlayerAvatar[], key: string): PlayerAvatar {
  return avatars.find((a) => avatarKey(a) === key) ?? { kind: 'emoji', value: '🙂' }
}

// The picker set for an edition: what its manifest declares, or the neutral
// default when it declares nothing.
export function avatarsFor(declared?: PlayerAvatar[]): PlayerAvatar[] {
  return [...(declared ?? EMOJI_AVATARS), ZENVOLKA]
}
