import { useMemo, useState } from 'react'
import Setup from './screens/Setup'
import PassToGiver from './screens/PassToGiver'
import { createSession, currentGiver, type SessionState } from './engine'
import type { Player } from './types'
import styles from './App.module.css'

type Phase = 'setup' | 'pass' | 'giver'

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [roster, setRoster] = useState<Player[]>([])
  const [session, setSession] = useState<SessionState | null>(null)

  const giver = useMemo(() => {
    if (!session) return null
    return roster.find((p) => p.id === currentGiver(session)) ?? null
  }, [session, roster])

  function handleStart(players: Player[]) {
    setRoster(players)
    setSession(createSession(players.map((p) => p.id)))
    setPhase('pass')
  }

  function startOver() {
    setSession(null)
    setRoster([])
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
            onReady={() => setPhase('giver')}
          />
        )}

        {phase === 'giver' && giver && (
          <div className={styles.stub}>
            <p className={styles.stubKicker}>
              {giver.avatar} {giver.name}'s turn
            </p>
            <h2>Giver play screen</h2>
            <p className={styles.stubNote}>Coming next — the answers and Hint Bank live here.</p>
            <button type="button" className={styles.link} onClick={startOver}>
              Start over
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
