import { useMemo, useState } from 'react'
import BankGrid from '../components/BankGrid'
import MpScoreStrip from './MpScoreStrip'
import MpLanded from './MpLanded'
import GuessFeed from './GuessFeed'
import CurrentHint from './CurrentHint'
import { guessIntent, guessPool, matchTerms, GUESS_QUERY_MIN } from './typedGuess'
import { seatById, type ScreenProps } from './roomScreen'
import { BANK_CAP } from '../engine'
import hp from './HinterPlay.module.css'
import g from './Game.module.css'
import styles from './TypedGuess.module.css'

// The typed-guess guesser (and spectator) board: the read-only live board plus,
// for a seated guesser while a hint is open, a typeahead over the room's pool. A
// projection of viewFor, which never carries the current answer or the deck. A
// pick is sent as the guess intent carrying the current hint index; the server
// resolves it and the next snapshot re-renders. The client does no matching or
// scoring, and a throttled pick is simply dropped by the server, so sending is
// fire-and-forget.
export default function TypedGuesserBoard({ view, seatId, connection, avatars, edition, onSend, onLeave }: ScreenProps) {
  const game = view.game!
  const hinter = seatById(view, game.hinterId)
  const hinterDropped = hinter?.connection === 'reconnecting'
  const isHost = view.hostId === seatId
  const complete = game.status === 'complete'
  const hintOpen = game.currentHint != null

  const me = seatById(view, seatId)
  // Only a seated, active guesser picks, and only while a hint is open;
  // spectators and late joiners watch.
  const canGuess = !complete && hintOpen && me?.role === 'player' && !me.pending

  const [query, setQuery] = useState('')
  // The pool is fixed for the turn (settings are locked), so it recomputes only
  // when a new snapshot brings new settings, and holds stable across keystrokes.
  const pool = useMemo(() => guessPool(edition.categories, view.settings), [edition.categories, view.settings])
  const matches = useMemo(() => matchTerms(pool, query), [pool, query])

  function pick(term: string) {
    onSend(guessIntent(term, game))
    setQuery('')
  }

  return (
    <div className={g.screen}>
      <div className={g.scroll}>
        {connection === 'reconnecting' && <div className={g.reconnect}>Reconnecting…</div>}
        <div className={hp.play}>
          <div className={hp.main}>
            <div className={g.whoseTurn}>
              <span className={g.turnName}>
                {hinter ? hinter.name : 'Someone'} <span className={g.hinting}>is hinting</span>
              </span>
              <span className={hp.bankCount}>
                {game.bank.length} / {BANK_CAP}
              </span>
            </div>
            <div className={hp.progress}>
              <span>{complete ? 'Turn complete' : `Answer ${game.resolved + 1} of ${game.answersPerGame}`}</span>
              <span>{game.hintCount} {game.hintCount === 1 ? 'hint' : 'hints'}</span>
            </div>
            <div className={hp.bar}>
              <div className={hp.barFill} style={{ width: `${(game.resolved / game.answersPerGame) * 100}%` }} />
            </div>

            {hinterDropped && (
              <div className={g.banner}>
                <span className={g.bannerText}>{hinter?.name} is reconnecting…</span>
                {isHost && (
                  <button type="button" className={g.endBtn} onClick={() => onSend({ type: 'forceEndTurn' })}>
                    End their turn
                  </button>
                )}
              </div>
            )}

            {me?.pending && (
              <div className={g.banner}>
                <span className={g.noticeText}>
                  You're in. You'll be playing from the next turn; this one was already underway when you joined.
                </span>
              </div>
            )}

            {!complete &&
              (hintOpen ? (
                <CurrentHint game={game} />
              ) : (
                <p className={styles.hintWaiting}>{hinter ? hinter.name : 'The hinter'} is choosing a hint…</p>
              ))}

            <section className={hp.bankSection}>
              <div className={hp.bankHead}>
                <h2>Hint Bank</h2>
              </div>
              <BankGrid bank={game.bank} cap={BANK_CAP} cutoff={game.cutoff} selected={game.currentHint ?? []} interactive={false} onToggle={() => {}} />
            </section>

            {canGuess ? (
              <section className={styles.pick}>
                <label className={styles.pickLabel} htmlFor="guess-input">
                  Your guess
                </label>
                <input
                  id="guess-input"
                  className={styles.pickInput}
                  value={query}
                  autoComplete="off"
                  placeholder={`Type ${GUESS_QUERY_MIN}+ letters, then pick`}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query.trim().length >= GUESS_QUERY_MIN && (
                  <ul className={styles.pickList}>
                    {matches.length === 0 ? (
                      <li className={styles.pickEmpty}>No matches in this room's pool.</li>
                    ) : (
                      matches.map((term) => (
                        <li key={term}>
                          <button type="button" className={styles.pickItem} onClick={() => pick(term)}>
                            {term}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
                <p className={styles.pickNote}>A wrong pick past your first on a hint costs a point. First correct lands it.</p>
              </section>
            ) : (
              !complete &&
              me?.role !== 'player' && <p className={hp.fullNote}>Watching this turn. Guessers pick from the pool to land answers.</p>
            )}

            <GuessFeed view={view} game={game} avatars={avatars} />

            <div className={g.leaveRow}>
              <button type="button" className={g.leave} onClick={onLeave}>
                Leave room
              </button>
            </div>
          </div>

          <div className={hp.results}>
            <MpLanded view={view} game={game} avatars={avatars} />
          </div>
        </div>
      </div>

      <MpScoreStrip view={view} avatars={avatars} game={game} />
    </div>
  )
}
