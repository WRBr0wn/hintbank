import { useState } from 'react'
import Avatar from '../components/Avatar'
import LobbySettings from './LobbySettings'
import { avatarByKey } from '../avatars'
import { gamePath, type Edition } from '../editions'
import type { Intent, NetStatus } from '../net'
import type { RoomSettings, RoomView } from '../protocol'
import type { PlayerAvatar } from '../types'
import styles from './Lobby.module.css'

// The synced lobby: a projection of the latest RoomView. The host edits
// settings and roster (kick, lock) which broadcast to everyone; guests watch.
// Nothing here is computed locally except the per-device reveal toggle and the
// copy affordances.
export default function Lobby({
  view,
  seatId,
  connection,
  avatars,
  edition,
  onSend,
  onLeave,
}: {
  view: RoomView
  seatId: string
  connection: NetStatus
  avatars: PlayerAvatar[]
  edition: Edition
  onSend: (intent: Intent) => void
  onLeave: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const isHost = view.hostId === seatId
  const players = view.seats.filter((s) => s.role === 'player')
  const spectators = view.seats.filter((s) => s.role === 'spectator')
  const enoughPlayers = players.length >= 2
  const hasCategories = view.settings.categoryIds.length > 0

  const shareLink = `${location.origin}${gamePath(edition.id)}?room=${view.code}`

  async function copy(what: 'code' | 'link') {
    const text = what === 'code' ? view.code : shareLink
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 1500)
    } catch {
      // Clipboard blocked (insecure context or denied); reveal instead so the
      // code can be copied by hand.
      setRevealed(true)
    }
  }

  const startReason = !enoughPlayers ? 'Need one more player' : !hasCategories ? 'Pick at least one category' : null

  return (
    <div className={styles.lobby}>
      {connection === 'reconnecting' && (
        <div className={styles.reconnect}>Reconnecting…</div>
      )}

      <section className={styles.codeRow}>
        <div className={styles.codeChip}>
          <span className={styles.codeLabel}>Room code</span>
          <button
            type="button"
            className={styles.code}
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? 'Hide room code' : 'Reveal room code'}
            title={revealed ? 'Tap to hide' : 'Tap to reveal'}
          >
            {revealed ? view.code : '••••••'}
          </button>
        </div>
        <div className={styles.copyRow}>
          <button type="button" className={styles.copyBtn} onClick={() => copy('code')}>
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </button>
          <button type="button" className={styles.copyBtn} onClick={() => copy('link')}>
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Players</h2>
          <span className={styles.count}>{players.length}</span>
        </div>
        <ul className={styles.roster}>
          {players.map((seat) => {
            const you = seat.id === seatId
            const host = seat.id === view.hostId
            const avatar: PlayerAvatar = avatarByKey(avatars, seat.avatar)
            const dropped = seat.connection === 'reconnecting'
            return (
              <li key={seat.id} className={dropped ? `${styles.seat} ${styles.seatDropped}` : styles.seat}>
                <Avatar avatar={avatar} size={34} />
                <span className={styles.seatName}>
                  {seat.name}
                  {host && <span className={styles.host} title="Host"> 👑</span>}
                  {you && <span className={styles.youTag}> (you)</span>}
                </span>
                {dropped && <span className={styles.presence}>reconnecting</span>}
                {isHost && !you && (
                  <button
                    type="button"
                    className={styles.kick}
                    onClick={() => onSend({ type: 'kick', seatId: seat.id })}
                    aria-label={`Remove ${seat.name}`}
                  >
                    Kick
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {spectators.length > 0 && (
          <p className={styles.spectators}>
            {spectators.length} watching: {spectators.map((s) => s.name).join(', ')}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <LobbySettings
          settings={view.settings}
          categories={edition.categories}
          secondaryTag={edition.secondaryTag}
          editable={isHost}
          onChange={(patch: Partial<RoomSettings>) => onSend({ type: 'updateSettings', settings: patch })}
        />
        {!isHost && <p className={styles.hostNote}>Only the host can change the settings.</p>}
      </section>

      <div className={styles.footer}>
        {isHost ? (
          <>
            <label className={styles.lockRow}>
              <input
                type="checkbox"
                checked={view.locked}
                onChange={(e) => onSend({ type: 'setLocked', locked: e.target.checked })}
              />
              Lock the room (no new players)
            </label>
            {startReason && <p className={styles.reason}>{startReason}</p>}
            <button
              type="button"
              className={styles.start}
              disabled={!enoughPlayers || !hasCategories}
              onClick={() => onSend({ type: 'start' })}
            >
              Start
            </button>
          </>
        ) : (
          <p className={styles.waiting}>Waiting for the host to start…</p>
        )}
        <button type="button" className={styles.leave} onClick={onLeave}>
          Leave room
        </button>
      </div>
    </div>
  )
}
