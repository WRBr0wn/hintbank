import { useMemo, useState } from 'react'
import Menu from './screens/Menu'
import Setup from './screens/Setup'
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
  continueSession,
  createGame,
  createSession,
  currentHinter,
  cutoffFor,
  gameScores,
  isRotationComplete,
  recordGame,
  type GameMode,
  type GameState,
  type SessionState,
} from './engine'
import { editionById, randomizerPath, termPasses, type Category } from './editions'
import type { Player } from './types'
import styles from './App.module.css'

type Phase = 'setup' | 'pass' | 'hinter' | 'leaderboard'

// Worst case a turn draws answersPerGame lands plus a full bank of rerolls, so the
// deck needs that many cards. Derived from the settings rather than a magic number,
// and slice naturally caps it at the pool size when a category is short.
const deckSizeFor = (answersPerGame: number) => answersPerGame + BANK_CAP

// Categories come from the active edition, so the platform holds no global list.
// The deck is names only; the board renders them verbatim.
function buildDeck(categories: Category[], categoryIds: string[], tagValues: number[], deckSize: number): string[] {
  const pool: string[] = []
  for (const id of categoryIds) {
    const category = categories.find((c) => c.id === id)
    if (!category) continue
    for (const term of category.terms) {
      if (termPasses(term, tagValues)) pool.push(term.name)
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, deckSize)
}

export default function App() {
  // null means the menu is showing. Stored as the id, never an index or the
  // object, so a URL scheme is a clean later addition.
  const [activeEditionId, setActiveEditionId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('setup')
  const [roster, setRoster] = useState<Player[]>([])
  const [session, setSession] = useState<SessionState | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  // The engine never sees these; they only decide which terms buildDeck pools.
  // Empty means no choice made yet: Setup then defaults to the active edition's
  // first ready category.
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  // Raw setup choices, kept so return-to-setup can pre-fill every control.
  // difficultyBase is the raw preset, not the derived cutoff: the session only
  // stores the cutoff, so this is what lets the difficulty button round-trip
  // without reverse-deriving it.
  const [mode, setMode] = useState<GameMode>('in-person')
  const [difficultyBase, setDifficultyBase] = useState(HINTER_BASE)
  const [answers, setAnswers] = useState(ANSWERS_PER_GAME)
  // Empty means no filter, deal from all.
  const [secondaryValues, setSecondaryValues] = useState<number[]>([])
  const [confirmReturn, setConfirmReturn] = useState(false)

  const edition = activeEditionId ? editionById(activeEditionId) : null
  // Handed to the in-game launch links so they open the right edition's
  // randomizer directly, no reselect.
  const randomizerUrl = edition ? randomizerPath(edition.id) : ''

  const hinter = useMemo(() => {
    if (!session) return null
    return roster.find((p) => p.id === currentHinter(session)) ?? null
  }, [session, roster])

  function selectEdition(id: string) {
    setActiveEditionId(id)
    setPhase('setup')
  }

  // Reached from the Setup title, where no game is in progress, so nothing is
  // lost and no confirm is needed.
  function backToMenu() {
    setActiveEditionId(null)
  }

  function handleStart(
    players: Player[],
    chosenMode: GameMode,
    ids: string[],
    chosenDifficultyBase: number,
    answersPerGame: number,
    chosenSecondaryValues: number[],
  ) {
    setRoster(players)
    setCategoryIds(ids)
    setMode(chosenMode)
    setDifficultyBase(chosenDifficultyBase)
    setAnswers(answersPerGame)
    setSecondaryValues(chosenSecondaryValues)
    // The session stores the derived cutoff; App keeps the raw base above for return.
    const hinterBase = cutoffFor(chosenDifficultyBase, answersPerGame)
    setSession(createSession(players.map((p) => p.id), chosenMode, hinterBase, answersPerGame))
    setPhase('pass')
  }

  function reveal() {
    if (!hinter || !session || !edition) return
    // Randomizer is host-driven with no dealt deck. The host supplies each answer,
    // so the game runs deckless and nothing secret is ever put on the board.
    const deck =
      session.mode === 'online-randomizer'
        ? []
        : buildDeck(edition.categories, categoryIds, secondaryValues, deckSizeFor(session.answersPerGame))
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
    setCategoryIds([])
    setMode('in-person')
    setDifficultyBase(HINTER_BASE)
    setAnswers(ANSWERS_PER_GAME)
    setSecondaryValues([])
    setPhase('setup')
  }

  // Unlike startOver, nothing resets to defaults: the roster and every setup
  // choice round-trip back into Setup. The next Start builds a fresh session, so
  // totals still reset to zero.
  function returnToSetup() {
    setSession(null)
    setGame(null)
    setConfirmReturn(false)
    setPhase('setup')
  }

  // The title walks one step back up the flow, with a confirm during a game since
  // the game would be lost. On the menu there is nowhere above, so no button.
  const onMenu = !edition
  const titleBack = () => {
    if (phase === 'setup') backToMenu()
    else setConfirmReturn(true)
  }

  return (
    <div className={styles.app}>
      <ThemeToggle />
      <header className={styles.header}>
        {onMenu ? (
          <h1>Hint Bank</h1>
        ) : (
          <h1>
            <button type="button" className={styles.titleAction} onClick={titleBack}>
              Hint Bank
            </button>
          </h1>
        )}
        {/* Same tag treatment across the app: each edition's name in-game, and
            "Complete" on the menu, the product that sits over all editions. */}
        <p className={styles.edition}>{edition ? `${edition.displayName} Edition` : 'Complete'}</p>
      </header>
      <main className={styles.main}>
        {!edition && <Menu onSelect={selectEdition} />}

        {edition && phase === 'setup' && (
          <Setup
            onStart={handleStart}
            credits={edition.credits}
            categories={edition.categories}
            secondaryTag={edition.secondaryTag}
            randomizerUrl={randomizerUrl}
            initialPlayers={roster.length ? roster : undefined}
            initialMode={mode}
            initialCategoryIds={categoryIds}
            initialDifficultyBase={difficultyBase}
            initialAnswers={answers}
            initialSecondaryValues={secondaryValues}
          />
        )}

        {phase === 'pass' && hinter && session && (
          <PassToHinter
            hinter={hinter}
            position={session.hinterPosition + 1}
            total={roster.length}
            mode={session.mode}
            randomizerUrl={randomizerUrl}
            onReady={reveal}
          />
        )}

        {phase === 'hinter' && game && session && (
          // The board stays up after the final answer lands so the group can
          // review it as the turn recap.
          <HinterPlay
            game={game}
            roster={roster}
            mode={session.mode}
            randomizerUrl={randomizerUrl}
            onChange={setGame}
            onComplete={finishTurn}
          />
        )}

        {phase === 'leaderboard' && session && (
          <Leaderboard
            session={session}
            roster={roster}
            onContinue={continueRotation}
            onPlayAgain={returnToSetup}
            onStartOver={startOver}
          />
        )}
      </main>

      {session && phase !== 'leaderboard' && (
        // Hidden on the leaderboard, which shows totals itself.
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
