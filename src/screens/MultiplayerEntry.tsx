import Avatar from '../components/Avatar'
import { avatarKey } from '../avatars'
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from '../protocol'
import type { PlayerAvatar } from '../types'
import styles from './Multiplayer.module.css'

// The one-panel entry: name and avatar, then Create room or a code and Join.
// The Jackbox pattern, identity and entry on one form. Controlled from above so
// a failed attempt (bad code, taken name, wrong edition) keeps every field
// filled. Settings never appear here; they live in the lobby only.
export default function MultiplayerEntry({
  avatars,
  name,
  avatar,
  code,
  watchOnly,
  busy,
  error,
  onName,
  onAvatar,
  onCode,
  onWatchOnly,
  onCreate,
  onJoin,
  onCancel,
}: {
  avatars: PlayerAvatar[]
  name: string
  avatar: PlayerAvatar
  code: string
  watchOnly: boolean
  busy: boolean
  error: string | null
  onName: (name: string) => void
  onAvatar: (avatar: PlayerAvatar) => void
  onCode: (code: string) => void
  onWatchOnly: (watchOnly: boolean) => void
  onCreate: () => void
  onJoin: () => void
  onCancel: () => void
}) {
  const named = name.trim().length > 0
  const codeReady = code.trim().length === ROOM_CODE_LENGTH

  return (
    <div className={styles.entry}>
      <div className={styles.entryHead}>
        <h2>Online: Multiplayer</h2>
        <button type="button" className={styles.back} onClick={onCancel}>
          Back
        </button>
      </div>

      <section className={styles.field}>
        <div className={styles.subLabel}>Your name</div>
        <input
          className={styles.nameInput}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Name"
          onChange={(e) => onName(e.target.value)}
        />
      </section>

      <section className={styles.field}>
        <div className={styles.subLabel}>Your avatar</div>
        <div className={styles.picker}>
          {avatars.map((a) => {
            const key = avatarKey(a)
            const on = avatarKey(avatar) === key
            return (
              <button
                key={key}
                type="button"
                className={on ? styles.pickActive : styles.pick}
                title={a.kind === 'image' ? a.label : undefined}
                onClick={() => onAvatar(a)}
              >
                <Avatar avatar={a} size={34} />
              </button>
            )
          })}
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.create} disabled={!named || busy} onClick={onCreate}>
          {busy ? 'Connecting…' : 'Create room'}
        </button>

        <div className={styles.or}>or join with a code</div>

        <div className={styles.joinRow}>
          <input
            className={styles.codeInput}
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            placeholder="CODE"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(e) => onCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
          />
          <button type="button" className={styles.join} disabled={!named || !codeReady || busy} onClick={onJoin}>
            Join
          </button>
        </div>

        {/* A board view, not an identity choice: a display surface for a stream
            capture, a shared TV, or following along. Join-only: the first join
            into a room creates it as host, and a spectator host makes no sense,
            so Create stays player-only. */}
        <label className={styles.watchRow}>
          <input type="checkbox" checked={watchOnly} onChange={(e) => onWatchOnly(e.target.checked)} />
          Watch only: a board view for a stream, a shared TV, or following along
        </label>
      </div>
    </div>
  )
}
