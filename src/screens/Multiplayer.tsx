import { useState } from 'react'
import MultiplayerEntry from './MultiplayerEntry'
import Lobby from './Lobby'
import { avatarKey } from '../avatars'
import { useRoom } from '../net'
import type { Edition } from '../editions'
import type { PlayerAvatar } from '../types'
import styles from './Multiplayer.module.css'

// The client path to a synced lobby. Owns one room connection and the entry
// form's fields (lifted so a failed attempt keeps them), then hands off to the
// Lobby once joined. Every screen is a projection of the latest RoomView; this
// component only routes between them by connection status.
export default function Multiplayer({
  editionId,
  edition,
  avatars,
  prefillCode,
  onExit,
}: {
  editionId: string
  edition: Edition
  avatars: PlayerAvatar[]
  prefillCode: string | null
  onExit: () => void
}) {
  const room = useRoom(editionId)
  const { state } = room
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<PlayerAvatar>(avatars[0])
  const [code, setCode] = useState(prefillCode ?? '')

  const inRoom = state.view != null && (state.status === 'joined' || state.status === 'reconnecting')
  const joinedHere = inRoom && state.view!.editionId === editionId
  // A code for another edition joins a real room, but the wrong one. Detected
  // purely from the view, so the form stays put with its fields; the next
  // Create/Join leaves the stale socket, and Back unmounts and closes it.
  const wrongEdition = inRoom && !joinedHere

  const identity = { name: name.trim(), avatar: avatarKey(avatar) }
  const create = () => room.create(identity)
  const join = () => room.join(code.trim(), identity)

  // Terminal states drop out of the room entirely.
  if (state.status === 'kicked' || state.status === 'room-closed' || state.status === 'version') {
    return <Ended status={state.status} onDone={onExit} />
  }

  if (joinedHere && state.view) {
    if (state.view.phase !== 'lobby') return <Started />
    return (
      <Lobby
        view={state.view}
        seatId={state.seatId!}
        connection={state.status}
        avatars={avatars}
        edition={edition}
        onSend={room.send}
        onLeave={() => {
          room.leave()
          onExit()
        }}
      />
    )
  }

  const busy = state.status === 'connecting' || state.status === 'joining'
  const entryError = wrongEdition
    ? 'That code is for a different edition.'
    : state.status === 'join-error'
      ? (state.error?.message ?? 'Could not join that room.')
      : null

  return (
    <MultiplayerEntry
      avatars={avatars}
      name={name}
      avatar={avatar}
      code={code}
      busy={busy}
      error={entryError}
      onName={setName}
      onAvatar={setAvatar}
      onCode={setCode}
      onCreate={create}
      onJoin={join}
      onCancel={onExit}
    />
  )
}

// Phase beyond the lobby: the game has started, but gameplay screens land in
// phase 3b. A plain holding card so the app never renders a blank.
function Started() {
  return (
    <div className={styles.notice}>
      <p>The game is starting.</p>
      <p className={styles.noticeSub}>Gameplay screens arrive in the next update.</p>
    </div>
  )
}

function Ended({ status, onDone }: { status: 'kicked' | 'room-closed' | 'version'; onDone: () => void }) {
  const message =
    status === 'kicked'
      ? 'The host removed you from the room.'
      : status === 'version'
        ? 'This page is out of date. Hard refresh to update (Ctrl/Cmd + Shift + R).'
        : 'The room has closed.'
  return (
    <div className={styles.notice}>
      <p>{message}</p>
      {status !== 'version' && (
        <button type="button" className={styles.noticeBtn} onClick={onDone}>
          Back to setup
        </button>
      )}
    </div>
  )
}
