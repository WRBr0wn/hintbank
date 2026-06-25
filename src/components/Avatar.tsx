import type { PlayerAvatar } from '../types'
import styles from './Avatar.module.css'

interface Props {
  avatar: PlayerAvatar
  // Fixed pixel size for a square avatar. Omit it to fill the parent box, which
  // is what the pass-screen plate does: it sets its own size and scales
  // responsively.
  size?: number
  className?: string
}

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

export default function Avatar({ avatar, size, className }: Props) {
  if (avatar.kind === 'image') {
    return (
      <span
        className={cls(styles.imgBox, !avatar.bare && styles.disc, size == null && styles.fill, className)}
        style={size != null ? { width: size, height: size } : undefined}
      >
        <img
          className={styles.img}
          src={avatar.src}
          alt={avatar.label ?? ''}
          style={avatar.zoom ? { transform: `scale(${avatar.zoom})` } : undefined}
          draggable={false}
        />
      </span>
    )
  }

  return (
    <span
      className={cls(styles.emoji, className)}
      style={size != null ? { width: size, height: size, fontSize: Math.round(size * 0.94) } : undefined}
      role="img"
      aria-label={avatar.value}
    >
      {avatar.value}
    </span>
  )
}
