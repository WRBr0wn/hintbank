import { useId } from 'react'
import { useModalFocus } from '../hooks/useModalFocus'
import { CHANGE_SETTINGS_DESC, roomMenuOptions } from './roomScreen'
import type { Intent, NetError } from '../net'
import type { RoomView } from '../protocol'
import styles from './RoomMenu.module.css'

// The title's in-room menu: tapping the title while seated must never silently
// leave the room, so it opens this instead. Which options show comes from the
// pure roomMenuOptions; Stay and Leave room are always there. The room code
// never renders here (masking rules).
export default function RoomMenu({
  view,
  seatId,
  error,
  onSend,
  onLeave,
  onClose,
}: {
  view: RoomView
  seatId: string
  error: NetError | null
  onSend: (intent: Intent) => void
  onLeave: () => void
  onClose: () => void
}) {
  const dialogRef = useModalFocus(onClose)
  const titleId = useId()
  const options = roomMenuOptions(view, seatId)

  function act(intent: Intent) {
    onSend(intent)
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <p id={titleId} className={styles.title}>You're in a room</p>

        {options.switchToWatching && (
          <div className={styles.option}>
            <button type="button" className={styles.act} onClick={() => act({ type: 'becomeSpectator' })}>
              Switch to watching
            </button>
            <p className={styles.desc}>You stop playing and forfeit your points. Your seat stays, watch-only.</p>
          </div>
        )}

        {options.joinGame && (
          <div className={styles.option}>
            {/* Stays open on purpose: a room-full refusal lands in the net
                error below instead of vanishing with the modal. */}
            <button type="button" className={styles.act} onClick={() => onSend({ type: 'becomePlayer' })}>
              Join the game
            </button>
            <p className={styles.desc}>Take a player seat. If a turn is running, you play from the next one.</p>
          </div>
        )}

        {options.backToLobby && (
          <div className={styles.option}>
            <button type="button" className={styles.act} onClick={() => act({ type: 'resetSession' })}>
              Bring everyone back to the lobby
            </button>
            <p className={styles.desc}>{CHANGE_SETTINGS_DESC}</p>
          </div>
        )}

        {error && <p className={styles.error}>{error.message}</p>}

        <div className={styles.footer}>
          <button type="button" className={styles.stay} onClick={onClose}>
            Stay
          </button>
          <button type="button" className={styles.leave} onClick={onLeave}>
            Leave room
          </button>
        </div>
      </div>
    </div>
  )
}
