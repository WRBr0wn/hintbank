import type { PlayerAvatar } from '../types'
import styles from './Avatar.module.css'

interface Props {
  avatar: PlayerAvatar
  // Fixed pixel size for a square avatar. Omit to fill the parent box, used
  // where a styled container already sets the dimensions (e.g. the pass-screen
  // plate, which scales responsively).
  size?: number
  className?: string
}

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

export default function Avatar({ avatar, size, className }: Props) {
  if (avatar.kind === 'image') {
    return (
      <img
        className={cls(styles.img, size == null && styles.fill, className)}
        src={avatar.src}
        alt={avatar.label ?? ''}
        style={size != null ? { width: size, height: size } : undefined}
        draggable={false}
      />
    )
  }

  return (
    <span
      className={cls(styles.emoji, className)}
      style={size != null ? { width: size, height: size, fontSize: Math.round(size * 0.86) } : undefined}
      role="img"
      aria-label={avatar.value}
    >
      {avatar.value}
    </span>
  )
}
