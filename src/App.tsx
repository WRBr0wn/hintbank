import { useMemo, useState } from 'react'
import Setup from './screens/Setup'
import PassToGiver from './screens/PassToGiver'
import GiverPlay from './screens/GiverPlay'
import {
  createGame,
  createSession,
  currentGiver,
  isRotationComplete,
  recordGame,
  type GameState,
  type SessionState,
} from './engine'
import pokemon from './data/pokemon.json'
import type { Player } from './types'
import styles from './App.module.css'

type Phase = 'setup' | 'pass' | 'giver' | 'done'

// Enough draws to land 10 answers even after a bank's worth of rerolls.
const DECK_SIZE = 60

function buildDeck(): string[] {
  const names = pokemon.map((p) => p.name)
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[names[i], names[j]] = [names[j], names[i]]
  }
  return names.slice(0, DECK_SIZE)
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [roster, setRoster] = useState<Player[]>([])
  const [session, setSession] = useState<SessionState | null>(null)
  const [game, setGame] = useState<GameState | null>(null)

  const giver = useMemo(() => {
    if (!session) return null
    return roster.find((p) => p.id === currentGiver(session)) ?? null
  }, [session, roster])

  function handleStart(players: Player[]) {
    setRoster(players)
    setSession(createSession(players.map((p) => p.id)))
    setPhase('pass')
  }

  function reveal() {
    if (!giver) return
    setGame(createGame({ players: roster.map((p) => p.id), giverId: giver.id, deck: buildDeck() }))
    setPhase('giver')
  }

  function finishTurn(deltas: Record<string, number>) {
    if (!session) return
    const next = recordGame(session, deltas)
    setSession(next)
    setGame(null)
    setPhase(isRotationComplete(next) ? 'done' : 'pass')
  }

  function startOver() {
    setSession(null)
    setRoster([])
    setGame(null)
    setPhase('setup')
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>Hint Bank</h1>
        <p className={styles.edition}>Pokémon Edition</p>
      </header>
      <main className={styles.main}>
        {phase === 'setup' && <Setup onStart={handleStart} />}

        {phase === 'pass' && giver && session && (
          <PassToGiver
            giver={giver}
            position={session.giverPosition + 1}
            total={roster.length}
            onReady={reveal}
          />
        )}

        {phase === 'giver' && game && (
          <GiverPlay game={game} roster={roster} onChange={setGame} onFinish={finishTurn} />
        )}

        {phase === 'done' && (
          <div className={styles.stub}>
            <p className={styles.stubKicker}>Rotation complete</p>
            <h2>Everyone has given a turn</h2>
            <p className={styles.stubNote}>The session leaderboard and continue/start-over flow come next.</p>
            <button type="button" className={styles.link} onClick={startOver}>
              Start over
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
