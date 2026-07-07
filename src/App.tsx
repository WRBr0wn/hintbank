import { useMemo, useState, type CSSProperties } from 'react'
import Setup, { type GameSettings } from './screens/Setup'
import PassToHinter from './screens/PassToHinter'
import HinterPlay from './screens/HinterPlay'
import Leaderboard from './screens/Leaderboard'
import ScoreBar from './components/ScoreBar'
import ThemeToggle from './components/ThemeToggle'
import ConfirmModal from './components/ConfirmModal'
import HowToPlay from './components/HowToPlay'
import {
  BANK_CAP,
  continueSession,
  createGame,
  createSession,
  currentHinter,
  cutoffFor,
  gameScores,
  isRotationComplete,
  recordGame,
  type GameState,
  type SessionState,
} from './engine'
import { editionById, randomizerPath, termPasses, type Category, type TagValue } from './editions'
import { avatarsFor } from './avatars'
import styles from './App.module.css'

type Phase = 'setup' | 'pass' | 'hinter' | 'leaderboard'

// Worst case a turn draws answersPerGame lands plus a full bank of rerolls, so the
// deck needs that many cards. Derived from the settings rather than a magic number,
// and slice naturally caps it at the pool size when a category is short.
const deckSizeFor = (answersPerGame: number) => answersPerGame + BANK_CAP

// Categories come from the active edition, so the platform holds no global list.
// The deck is names only; the board renders them verbatim.
function buildDeck(categories: Category[], categoryIds: string[], tagValues: TagValue[], deckSize: number): string[] {
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

// One edition's game page, Setup through Leaderboard. The edition is fixed by
// which HTML page this runs on (its entry passes the id); the menu is its own
// page, so leaving for it is a real navigation and the session is let go.
export default function App({ editionId }: { editionId: string }) {
  const edition = editionById(editionId)
  const [phase, setPhase] = useState<Phase>('setup')
  // Every setup choice as one object; null means a fresh start, where Setup
  // falls back to its defaults. The engine never sees it; categoryIds and
  // secondaryValues only decide which terms buildDeck pools.
  const [settings, setSettings] = useState<GameSettings | null>(null)
  const [session, setSession] = useState<SessionState | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [confirmReturn, setConfirmReturn] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const roster = settings?.players ?? []
  // Handed to the in-game launch links so they open this edition's randomizer
  // directly, no reselect.
  const randomizerUrl = randomizerPath(editionId)

  const hinter = useMemo(() => {
    if (!session || !settings) return null
    return settings.players.find((p) => p.id === currentHinter(session)) ?? null
  }, [session, settings])

  // The entries are hand-declared, so a missing edition is a wiring mistake,
  // not a runtime state.
  if (!edition) return null

  // The edition's accent tints the game chrome (header divider, wordmark halo),
  // the same manifest value and inline-variable pattern the menu tiles use.
  const accent = edition.look
    ? ({ '--edition-accent': edition.look.accent } as CSSProperties)
    : undefined

  // The picker set: the edition's declared avatars (or the neutral default)
  // plus the platform-level ZenVolka.
  const avatars = avatarsFor(edition.avatars)

  // Reached from the Setup title, where no game is in progress, so nothing is
  // lost and no confirm is needed.
  function backToMenu() {
    window.location.assign(import.meta.env.BASE_URL)
  }

  function handleStart(next: GameSettings) {
    setSettings(next)
    // The session stores the derived cutoff; settings keep the raw base for return.
    const hinterBase = cutoffFor(next.difficultyBase, next.answersPerGame)
    setSession(createSession(next.players.map((p) => p.id), next.mode, hinterBase, next.answersPerGame))
    setPhase('pass')
  }

  function reveal() {
    if (!hinter || !session || !edition || !settings) return
    // Randomizer is host-driven with no dealt deck. The host supplies each answer,
    // so the game runs deckless and nothing secret is ever put on the board.
    const deck =
      session.mode === 'online-randomizer'
        ? []
        : buildDeck(edition.categories, settings.categoryIds, settings.secondaryValues, deckSizeFor(session.answersPerGame))
    // A filtered pool smaller than the chosen turn clamps the deal, and the
    // cutoff derives from what is actually dealt, so a short turn scores in
    // proportion. The stored setting keeps the player's choice untouched.
    const answers = deck.length > 0 ? Math.min(session.answersPerGame, deck.length) : session.answersPerGame
    setGame(
      createGame({
        players: roster.map((p) => p.id),
        hinterId: hinter.id,
        deck,
        hinterBase: cutoffFor(settings.difficultyBase, answers),
        answersPerGame: answers,
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
    setGame(null)
    setSettings(null)
    setPhase('setup')
  }

  // Unlike startOver, the settings stay: the roster and every setup choice
  // round-trip back into Setup. The next Start builds a fresh session, so
  // totals still reset to zero.
  function returnToSetup() {
    setSession(null)
    setGame(null)
    setConfirmReturn(false)
    setPhase('setup')
  }

  // The title walks one step back up the flow, with a confirm during a game since
  // the game would be lost.
  const titleBack = () => {
    if (phase === 'setup') backToMenu()
    else setConfirmReturn(true)
  }

  // Mid-turn the modal leads with the quick reference instead of the overview.
  const helpInTurn = phase === 'pass' || phase === 'hinter'

  return (
    <div className={styles.app}>
      <ThemeToggle />
      <button
        type="button"
        className={styles.help}
        onClick={() => setShowHelp(true)}
        aria-label="How to play"
        title="How to play"
      >
        ?
      </button>
      <header className={styles.header} style={accent}>
        <h1>
          <button type="button" className={styles.titleAction} onClick={titleBack}>
            Hint <span className={styles.wordmarkAccent}>Bank</span>
          </button>
        </h1>
        <p className={styles.edition}>
          <span className={styles.editionName}>{edition.displayName}</span> Edition
        </p>
      </header>
      <main className={styles.main}>
        {phase === 'setup' && (
          <Setup
            onStart={handleStart}
            credits={edition.credits}
            categories={edition.categories}
            secondaryTag={edition.secondaryTag}
            avatars={avatars}
            randomizerUrl={randomizerUrl}
            initial={settings ?? undefined}
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

      {showHelp && <HowToPlay inTurn={helpInTurn} onClose={() => setShowHelp(false)} />}

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
