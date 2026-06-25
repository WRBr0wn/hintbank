import { useMemo, useState } from 'react'
import Setup from './screens/Setup'
import PassToHinter from './screens/PassToHinter'
import HinterPlay from './screens/HinterPlay'
import GameSummary from './screens/GameSummary'
import Leaderboard from './screens/Leaderboard'
import ScoreBar from './components/ScoreBar'
import ThemeToggle from './components/ThemeToggle'
import {
  continueSession,
  createGame,
  createSession,
  currentHinter,
  gameScores,
  isRotationComplete,
  recordGame,
  type GameMode,
  type GameState,
  type SessionState,
} from './engine'
import pokemon from './data/pokemon.json'
import type { Player } from './types'
import styles from './App.module.css'

type Phase = 'setup' | 'pass' | 'hinter' | 'leaderboard'

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

  const hinter = useMemo(() => {
    if (!session) return null
    return roster.find((p) => p.id === currentHinter(session)) ?? null
  }, [session, roster])

  function handleStart(players: Player[], mode: GameMode) {
    setRoster(players)
    setSession(createSession(players.map((p) => p.id), mode))
    setPhase('pass')
  }

  function reveal() {
    if (!hinter || !session) return
    // Randomizer is host-driven with no dealt deck. The host supplies each answer,
    // so the game runs deckless and nothing secret is ever put on the board.
    const deck = session.mode === 'online-randomizer' ? [] : buildDeck()
    setGame(createGame({ players: roster.map((p) => p.id), hinterId: hinter.id, deck }))
    setPhase('hinter')
  }

  function finishTurn() {
    if (!session || !game) return
    const next = recordGame(session, gameScores(game))
    setSession(next)
    setGame(null)
    setPhase(isRotationComplete(next) ? 'leaderboard' : 'pass')
  }

  function continueRotation() {
    if (!session) return
    setSession(continueSession(session))
    setPhase('pass')
  }

  function startOver() {
    setSession(null)
    setRoster([])
    setGame(null)
    setPhase('setup')
  }

  return (
    <div className={styles.app}>
      <ThemeToggle />
      <header className={styles.header}>
        <h1>Hint Bank</h1>
        <p className={styles.edition}>Pokémon Edition</p>
      </header>
      <main className={styles.main}>
        {phase === 'setup' && <Setup onStart={handleStart} />}

        {phase === 'pass' && hinter && session && (
          <PassToHinter
            hinter={hinter}
            position={session.hinterPosition + 1}
            total={roster.length}
            mode={session.mode}
            onReady={reveal}
          />
        )}

        {phase === 'hinter' && game && session && game.status === 'playing' && (
          <HinterPlay game={game} roster={roster} mode={session.mode} onChange={setGame} />
        )}

        {phase === 'hinter' && game && game.status === 'complete' && (
          <GameSummary game={game} roster={roster} onContinue={finishTurn} />
        )}

        {phase === 'leaderboard' && session && (
          <Leaderboard
            session={session}
            roster={roster}
            onContinue={continueRotation}
            onStartOver={startOver}
          />
        )}
      </main>

      {session && phase !== 'leaderboard' && game?.status !== 'complete' && (
        <ScoreBar roster={roster} totals={session.totals} hinterId={hinter?.id ?? null} game={game} />
      )}
    </div>
  )
}
