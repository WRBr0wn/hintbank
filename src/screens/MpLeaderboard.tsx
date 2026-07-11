import Avatar from '../components/Avatar'
import { CHANGE_SETTINGS_DESC, avatarOf, playerSeats, type ScreenProps } from './roomScreen'
import board from './Leaderboard.module.css'
import g from './Game.module.css'

// The synced end-of-session leaderboard. Continue / Play Again / Change
// Settings are host controls; every screen follows the host's choice through the
// next snapshot. Same three meanings and labels as single-device play. Reuses
// the local Leaderboard styling.
export default function MpLeaderboard({ view, seatId, avatars, onSend, onLeave }: ScreenProps) {
  const isHost = view.hostId === seatId
  const players = playerSeats(view)
  const best = players.reduce((m, s) => Math.max(m, view.totals[s.id] ?? 0), -Infinity)
  const ranked = [...players].sort((a, b) => (view.totals[b.id] ?? 0) - (view.totals[a.id] ?? 0))
  const rotations = view.session?.completedRotations ?? 0

  return (
    <div className={board.board}>
      <p className={board.kicker}>
        {rotations} {rotations === 1 ? 'rotation' : 'rotations'} played
      </p>
      <h2 className={board.title}>Leaderboard</h2>

      <ol className={board.list}>
        {ranked.map((seat) => {
          const total = view.totals[seat.id] ?? 0
          const isLeader = total === best
          return (
            <li key={seat.id} className={isLeader ? board.leader : board.row}>
              <span className={board.crown}>{isLeader ? '👑' : ''}</span>
              <span className={board.avatar}>
                <Avatar avatar={avatarOf(avatars, seat)} size={26} />
              </span>
              <span className={board.name}>{seat.name}</span>
              <span className={board.total}>{total}</span>
            </li>
          )
        })}
      </ol>

      {isHost ? (
        <div className={board.actions}>
          <div className={board.action}>
            <button type="button" className={board.continue} onClick={() => onSend({ type: 'continueSession' })}>
              Continue
            </button>
            <p className={board.actionDesc}>Keep the scores and play another rotation.</p>
          </div>
          <div className={board.action}>
            <button type="button" className={board.playAgain} onClick={() => onSend({ type: 'playAgain' })}>
              Play Again
            </button>
            <p className={board.actionDesc}>New game now, same players and settings, scores back to 0.</p>
          </div>
          <div className={board.action}>
            <button type="button" className={board.startOver} onClick={() => onSend({ type: 'resetSession' })}>
              Change Settings
            </button>
            <p className={board.actionDesc}>{CHANGE_SETTINGS_DESC}</p>
          </div>
        </div>
      ) : (
        <p className={g.waiting}>Waiting for the host to choose what's next…</p>
      )}

      <div className={g.leaveRow}>
        <button type="button" className={g.leave} onClick={onLeave}>
          Leave room
        </button>
      </div>
    </div>
  )
}
