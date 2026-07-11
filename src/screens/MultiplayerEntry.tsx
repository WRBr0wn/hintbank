import { useEffect, useState } from 'react'
import Avatar from '../components/Avatar'
import CodeInput from '../components/CodeInput'
import { avatarKey } from '../avatars'
import { editionById } from '../editions'
import { lookupRoom, type RoomLookupResult } from '../net'
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH, isRoomCode } from '../protocol'
import { codeStatus, lookupVerdict } from './joinFlow'
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

  // Once a full-length code is present, the pre-join lookup resolves it: the
  // result greys taken avatars and fills the live verdict line. Purely
  // advisory: a failed or slow lookup means no greying, no verdict, and
  // nothing else; the join handshake still catches everything, so this never
  // blocks joining. The result is keyed by the code it answered, so editing
  // the code drops stale state by derivation.
  const [lookedUp, setLookedUp] = useState<{ code: string; result: RoomLookupResult } | null>(null)
  useEffect(() => {
    const c = code.trim()
    // A full-length code outside the alphabet gets its verdict client-side.
    if (c.length !== ROOM_CODE_LENGTH || !isRoomCode(c)) return
    let stale = false
    lookupRoom(c).then((result) => {
      if (!stale) setLookedUp({ code: c, result })
    })
    return () => {
      stale = true
    }
  }, [code])
  const resolved = lookedUp?.code === code.trim() ? lookedUp.result : null
  const taken: ReadonlySet<string> = resolved?.ok ? new Set(resolved.avatarsTaken) : new Set()
  const verdict = lookupVerdict(code, resolved, (id) => editionById(id)?.displayName ?? null)

  // The one status slot under the code field: a join attempt's error fills it
  // until the code is edited, then the live verdict resumes. A fresh attempt
  // clears the dismissal so its error always shows.
  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const status = codeStatus(error, dismissedError, verdict)
  // The manual flow is name, avatar, then code, so the lookup usually resolves
  // after the avatar was picked; when it marks the current pick taken, say so
  // instead of silently greying everything else. Advisory only: no auto-switch,
  // and the join is never blocked (a duplicate avatar is legal).
  const selectedTaken = taken.has(avatarKey(avatar))

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
            const isTaken = taken.has(key)
            const cls = on ? (isTaken ? styles.pickActiveTaken : styles.pickActive) : isTaken ? styles.pickTaken : styles.pick
            return (
              <button
                key={key}
                type="button"
                className={cls}
                disabled={isTaken && !on}
                title={isTaken ? 'Taken in this room' : a.kind === 'image' ? a.label : undefined}
                onClick={() => onAvatar(a)}
              >
                <Avatar avatar={a} size={34} />
              </button>
            )
          })}
        </div>
        {selectedTaken && (
          <p className={styles.takenNote}>Your avatar is taken in this room. Pick another, or join with it anyway.</p>
        )}
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.create}
          disabled={!named || busy}
          onClick={() => {
            setDismissedError(null)
            onCreate()
          }}
        >
          {busy ? 'Connecting…' : 'Create room'}
        </button>

        <div className={styles.or}>or join with a code</div>

        <div className={styles.joinRow}>
          <CodeInput
            value={code}
            inputClassName={styles.codeInput}
            onChange={(c) => {
              if (error) setDismissedError(error)
              onCode(c)
            }}
          />
          <button
            type="button"
            className={styles.join}
            disabled={!named || !codeReady || busy}
            onClick={() => {
              setDismissedError(null)
              onJoin()
            }}
          >
            Join
          </button>
        </div>

        {status && (
          <p className={status.kind === 'error' ? styles.error : styles.verdict}>{status.text}</p>
        )}

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
