import { useMemo, useState } from 'react'
import Setup, { cutoffFor } from './screens/Setup'
import PassToHinter from './screens/PassToHinter'
import HinterPlay from './screens/HinterPlay'
import Leaderboard from './screens/Leaderboard'
import ScoreBar from './components/ScoreBar'
import ThemeToggle from './components/ThemeToggle'
import ConfirmModal from './components/ConfirmModal'
import {
  ANSWERS_PER_GAME,
  BANK_CAP,
  HINTER_BASE,
  canEditMode,
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
import { CATEGORIES } from './data/categories'
import type { Player } from './types'
import styles from './App.module.css'

type Phase = 'setup' | 'pass' | 'hinter' | 'leaderboard'

// Worst case a turn draws answersPerGame lands plus a full bank of rerolls, so the
// deck needs that many cards. Derived from the settings rather than a magic number,
// and slice naturally caps it at the pool size when a category is short.
const deckSizeFor = (answersPerGame: number) => answersPerGame + BANK_CAP

// Combine the selected categories into one shuffled pool, then take the deck off
// the front. Every category's terms are stored display-ready, so they go in as-is
// and the board renders them verbatim.
function buildDeck(categoryIds: string[], deckSize: number): string[] {
  const pool: string[] = []
  for (const id of categoryIds) {
    const category = CATEGORIES.find((c) => c.id === id)
    if (!category) continue
    pool.push(...category.terms)
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, deckSize)
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [roster, setRoster] = useState<Player[]>([])
  const [session, setSession] = useState<SessionState | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  // Selected answer categories, locked at setup. The engine never sees these; they
  // only decide which terms buildDeck pools.
  const [categoryIds, setCategoryIds] = useState<string[]>(['pokemon'])
  // The rest of the raw setup choices, kept so return-to-setup can pre-fill every
  // control. difficultyBase is the raw preset (30/25/20), not the derived cutoff:
  // the session only stores the cutoff, so this is what lets the difficulty button
  // round-trip without reverse-deriving it.
  const [mode, setMode] = useState<GameMode>('in-person')
  const [difficultyBase, setDifficultyBase] = useState(HINTER_BASE)
  const [answers, setAnswers] = useState(ANSWERS_PER_GAME)
  // Confirm before the title returns to Setup mid-game.
  const [confirmReturn, setConfirmReturn] = useState(false)

  const hinter = useMemo(() => {
    if (!session) return null
    return roster.find((p) => p.id === currentHinter(session)) ?? null
  }, [session, roster])

  function handleStart(
    players: Player[],
    chosenMode: GameMode,
    ids: string[],
    chosenDifficultyBase: number,
    answersPerGame: number,
  ) {
    setRoster(players)
    setCategoryIds(ids)
    setMode(chosenMode)
    setDifficultyBase(chosenDifficultyBase)
    setAnswers(answersPerGame)
    // The session stores the derived cutoff; App keeps the raw base above for return.
    const hinterBase = cutoffFor(chosenDifficultyBase, answersPerGame)
    setSession(createSession(players.map((p) => p.id), chosenMode, hinterBase, answersPerGame))
    setPhase('pass')
  }

  function reveal() {
    if (!hinter || !session) return
    // Randomizer is host-driven with no dealt deck. The host supplies each answer,
    // so the game runs deckless and nothing secret is ever put on the board.
    const deck =
      session.mode === 'online-randomizer'
        ? []
        : buildDeck(categoryIds, deckSizeFor(session.answersPerGame))
    setGame(
      createGame({
        players: roster.map((p) => p.id),
        hinterId: hinter.id,
        deck,
        hinterBase: session.hinterBase,
        answersPerGame: session.answersPerGame,
      }),
    )
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
    setCategoryIds(['pokemon'])
    setMode('in-person')
    setDifficultyBase(HINTER_BASE)
    setAnswers(ANSWERS_PER_GAME)
    setPhase('setup')
  }

  // Title return: keep the roster and every prior setup choice (mode, categories,
  // difficulty, answers all persist in state and round-trip back into Setup), but
  // drop the in-progress session, game, and scores. Unlike startOver, nothing
  // resets to defaults: it restarts this group with their settings, ready to tweak.
  function returnToSetup() {
    setSession(null)
    setGame(null)
    setConfirmReturn(false)
    setPhase('setup')
  }

  // The title returns to Setup during a game, but on Setup there is nowhere to go.
  const canReturn = phase !== 'setup'

  return (
    <div className={styles.app}>
      <ThemeToggle />
      <header className={styles.header}>
        {canReturn ? (
          <h1
            className={styles.titleAction}
            role="button"
            tabIndex={0}
            onClick={() => setConfirmReturn(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setConfirmReturn(true)
              }
            }}
          >
            Hint Bank
          </h1>
        ) : (
          <h1>Hint Bank</h1>
        )}
        <p className={styles.edition}>Pokémon Edition</p>
      </header>
      <main className={styles.main}>
        {phase === 'setup' && (
          <Setup
            onStart={handleStart}
            initialPlayers={roster.length ? roster : undefined}
            initialMode={mode}
            initialCategoryIds={categoryIds}
            initialDifficultyBase={difficultyBase}
            initialAnswers={answers}
          />
        )}

        {phase === 'pass' && hinter && session && (
          <PassToHinter
            hinter={hinter}
            position={session.hinterPosition + 1}
            total={roster.length}
            mode={session.mode}
            onReady={reveal}
          />
        )}

        {phase === 'hinter' && game && session && (
          // The board stays up after the 10th answer lands (game.status === 'complete')
          // so the group can review it as the turn recap. Continue records the turn
          // and routes straight to the next pass, or the leaderboard at rotation end.
          <HinterPlay
            game={game}
            roster={roster}
            mode={session.mode}
            canEdit={canEditMode(session.mode)}
            onChange={setGame}
            onComplete={finishTurn}
          />
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

      {session && phase !== 'leaderboard' && (
        // Shown through play and on the completed board so the group can review
        // scores. Hidden on the leaderboard, which shows totals itself.
        <ScoreBar roster={roster} totals={session.totals} hinterId={hinter?.id ?? null} game={game} />
      )}

      {confirmReturn && (
        <ConfirmModal
          message="Return to setup? The current game will be lost."
          confirmLabel="Return to setup"
          cancelLabel="Keep playing"
          onConfirm={returnToSetup}
          onCancel={() => setConfirmReturn(false)}
        />
      )}
    </div>
  )
}
