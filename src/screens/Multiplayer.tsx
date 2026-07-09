import { useState } from 'react'
import MultiplayerEntry from './MultiplayerEntry'
import Lobby from './Lobby'
import Interstitial from './Interstitial'
import HinterBoard from './HinterBoard'
import GuesserBoard from './GuesserBoard'
import TypedHinterBoard from './TypedHinterBoard'
import TypedGuesserBoard from './TypedGuesserBoard'
import MpLeaderboard from './MpLeaderboard'
import { avatarKey } from '../avatars'
import { useRoom } from '../net'
import type { Edition } from '../editions'
import type { ScreenProps } from './roomScreen'
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
  // Leaving a room returns to the entry with the mode still chosen and the name
  // and avatar retained (they live above the connection), ready to create or
  // join again, rather than resetting to In Person.
  const backToEntry = () => room.leave()

  // Terminal states drop out of the room, back to the entry (identity kept).
  if (state.status === 'kicked' || state.status === 'room-closed' || state.status === 'version') {
    return <Ended status={state.status} onDone={backToEntry} />
  }

  if (joinedHere && state.view) {
    const screen: ScreenProps = {
      view: state.view,
      seatId: state.seatId!,
      connection: state.status,
      avatars,
      edition,
      onSend: room.send,
      onLeave: backToEntry,
    }
    switch (state.view.phase) {
      case 'lobby':
        return <Lobby {...screen} />
      case 'interstitial':
        return <Interstitial {...screen} />
      case 'turn': {
        // Typed and voice share the "Online: Multiplayer" mode; the room's
        // onlineMode setting picks which pair of boards a turn renders.
        const typed = state.view.settings.onlineMode === 'typed'
        const isHinter = state.view.game?.hinterId === state.seatId
        if (typed) return isHinter ? <TypedHinterBoard {...screen} /> : <TypedGuesserBoard {...screen} />
        return isHinter ? <HinterBoard {...screen} /> : <GuesserBoard {...screen} />
      }
      case 'leaderboard':
        return <MpLeaderboard {...screen} />
    }
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
          Back
        </button>
      )}
    </div>
  )
}
