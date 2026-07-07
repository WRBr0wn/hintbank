import type { PlayerAvatar } from '../types'
import { ROUND_TARGET, spriteZoom } from '../sprites'
import styles from './Avatar.module.css'

interface Props {
  avatar: PlayerAvatar
  // Omit to fill the parent box, which is what the pass-screen plate does: it
  // sets its own size and scales responsively.
  size?: number
  // The caller draws a circular frame around the avatar (the pass plate), so
  // sprite normalization targets the circle's inscribed area. Non-bare avatars
  // are circular on their own via the disc and imply this.
  round?: boolean
  className?: string
}

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

export default function Avatar({ avatar, size, round, className }: Props) {
  if (avatar.kind === 'image') {
    const inCircle = round || !avatar.bare
    const imgStyle = avatar.box
      ? spriteZoom(avatar.box, inCircle ? ROUND_TARGET : undefined)
      : avatar.zoom
        ? { transform: `scale(${avatar.zoom})` }
        : undefined
    return (
      <span
        className={cls(styles.imgBox, !avatar.bare && styles.disc, size == null && styles.fill, className)}
        style={size != null ? { width: size, height: size } : undefined}
      >
        <img className={styles.img} src={avatar.src} alt={avatar.label ?? ''} style={imgStyle} draggable={false} />
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
