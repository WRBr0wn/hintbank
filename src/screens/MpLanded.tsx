import Avatar from '../components/Avatar'
import { avatarOf, seatById } from './roomScreen'
import type { PublicGameView, RoomView } from '../protocol'
import type { PlayerAvatar } from '../types'
import hp from './HinterPlay.module.css'

// The landed-answers list, reused by both boards. Answers only appear here after
// they resolve, which is what makes it safe on a guesser or spectator screen.
// Reuses the local HinterPlay results styling for parity.
export default function MpLanded({
  view,
  game,
  avatars,
}: {
  view: RoomView
  game: PublicGameView
  avatars: PlayerAvatar[]
}) {
  return (
    <aside className={hp.results}>
      <div className={hp.resultsHeadRow}>
        <h2 className={hp.resultsHead}>Landed</h2>
      </div>
      <ol className={hp.resultList}>
        {Array.from({ length: game.answersPerGame }, (_, i) => {
          const result = game.results[i]
          const winner = result ? seatById(view, result.guesserId) : null
          return (
            <li key={i} className={result ? hp.resultRow : hp.resultPending}>
              <span className={hp.resultNum}>{i + 1}</span>
              <span className={hp.resultName}>{result ? result.answer : ''}</span>
              <span className={hp.resultAvatar}>
                {winner && <Avatar avatar={avatarOf(avatars, winner)} size={20} />}
              </span>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
