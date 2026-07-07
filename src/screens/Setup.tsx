import { useMemo, useState } from 'react'
import Avatar from '../components/Avatar'
import Footer from '../components/Footer'
import { activeTagValues, tagValueOptions, type Category, type EditionCredits, type SecondaryTag, type TagValue } from '../editions'
import {
  ANSWERS_PER_GAME,
  HINTER_BASE,
  HINTER_BASE_EASY,
  HINTER_BASE_HARD,
  MAX_ANSWERS,
  MIN_ANSWERS,
  type GameMode,
} from '../engine'
import { toggled, toggledKeepOne } from '../sets'
import type { Player, PlayerAvatar } from '../types'
import pokemonData from '../editions/pokemon/data/pokemon.json'
import styles from './Setup.module.css'

const base = import.meta.env.BASE_URL
const EMOJI: PlayerAvatar[] = ['🦊', '🐢', '🐉', '🦉', '🐱', '🐰', '🐼', '🐧', '🦄', '🐸', '🦁', '🐙'].map(
  (value) => ({ kind: 'emoji', value }),
)
const CREATORS: PlayerAvatar[] = [
  { kind: 'image', src: `${base}avatars/zanegames.jpg`, label: 'ZaneGames' },
  { kind: 'image', src: `${base}avatars/peebr.jpg`, label: 'Peebr' },
  { kind: 'image', src: `${base}avatars/cush.jpg`, label: 'Cush' },
  { kind: 'image', src: `${base}avatars/bailey.jpg`, label: 'Bailey' },
  { kind: 'image', src: `${base}avatars/chrispiche.jpg`, label: 'Chris Piché' },
  { kind: 'image', src: `${base}avatars/deliciousjames.jpg`, label: 'Delicious James' },
  { kind: 'image', src: `${base}avatars/scarecrow.jpg`, label: 'Scarecrow' },
  { kind: 'image', src: `${base}avatars/zenvolka.png`, label: 'ZenVolka' },
]
// A handful of recognizable mascots. The full sprite set is bundled in
// public/editions/pokemon/sprites; this is just the picker subset. Each carries
// its measured artwork box from the edition data, so small mascots render at
// the same visual size as big ones instead of a flat crop.
const boxByDex = new Map(pokemonData.map((p) => [p.dexNumber, p.box]))
const POKEMON: PlayerAvatar[] = (
  [
    [1, 'Bulbasaur'],
    [3, 'Venusaur'],
    [4, 'Charmander'],
    [6, 'Charizard'],
    [7, 'Squirtle'],
    [9, 'Blastoise'],
    [25, 'Pikachu'],
    [39, 'Jigglypuff'],
    [94, 'Gengar'],
    [133, 'Eevee'],
    [143, 'Snorlax'],
    [150, 'Mewtwo'],
    [155, 'Cyndaquil'],
    [196, 'Espeon'],
    [197, 'Umbreon'],
    [390, 'Chimchar'],
    [393, 'Piplup'],
    [724, 'Decidueye'],
    [448, 'Lucario'],
    [573, 'Cinccino'],
    [658, 'Greninja'],
    [680, 'Doublade'],
    [909, 'Fuecoco']
  ] as [number, string][]
).map(([dex, label]) => ({
  kind: 'image',
  src: `${base}editions/pokemon/sprites/${dex}.png`,
  label,
  box: boxByDex.get(dex),
  bare: true,
}))

const AVATARS: PlayerAvatar[] = [...EMOJI, ...CREATORS, ...POKEMON]

const avatarKey = (a: PlayerAvatar) => (a.kind === 'emoji' ? a.value : a.src)

// The online modes keep the answer off a shared screen: one-device hides it
// behind hold-to-reveal, randomizer is the host-driven board.
const MODES: { id: GameMode; label: string; ready: boolean }[] = [
  { id: 'in-person', label: 'In Person: One Device', ready: true },
  { id: 'online-one-device', label: 'Online: One Device', ready: true },
  { id: 'online-randomizer', label: 'Online: One Device + Randomizer', ready: true },
  { id: 'online-multiplayer', label: 'Online: Multiplayer', ready: false },
]

const MIN_PLAYERS = 2
const MAX_PLAYERS = 8

// A preset picks a base: the clue cutoff for a full 10-answer game. The actual
// cutoff is derived from base and answer count at start. The bases are engine
// constants; only the labels live here.
const DIFFICULTIES: { id: string; label: string; base: number }[] = [
  { id: 'easy', label: 'Easy', base: HINTER_BASE_EASY },
  { id: 'regular', label: 'Regular', base: HINTER_BASE },
  { id: 'hard', label: 'Hard', base: HINTER_BASE_HARD },
]

const clampAnswers = (n: number) => Math.max(MIN_ANSWERS, Math.min(MAX_ANSWERS, n))

// Every choice made on this screen, as one object: handed out on start and back
// in to re-seed the controls on return-to-setup. difficultyBase is the raw
// preset (the full-game cutoff), not the derived cutoff, so the difficulty
// button round-trips without reverse-deriving it.
export interface GameSettings {
  players: Player[]
  mode: GameMode
  categoryIds: string[]
  difficultyBase: number
  answersPerGame: number
  secondaryValues: TagValue[]
}

function makePlayer(used: string[]): Player {
  const avatar = AVATARS.find((a) => !used.includes(avatarKey(a))) ?? AVATARS[0]
  return { id: crypto.randomUUID(), name: '', avatar }
}

export default function Setup({
  onStart,
  credits,
  categories,
  secondaryTag,
  randomizerUrl,
  initial,
}: {
  // Hands back the raw choices as one settings object; App derives the cutoff.
  onStart: (settings: GameSettings) => void
  credits: EditionCredits
  // Passed in so Setup never reaches into edition data itself.
  categories: Category[]
  // Absent means no secondary selector; the values come from the term data.
  secondaryTag?: SecondaryTag
  randomizerUrl: string
  // Seeds the controls on return-to-setup so every prior choice restores.
  // Omitted on a fresh start, where each control falls back to its default
  // (two blank players for the roster).
  initial?: GameSettings
}) {
  const [players, setPlayers] = useState<Player[]>(() =>
    initial && initial.players.length > 0
      ? initial.players
      : [makePlayer([]), makePlayer([avatarKey(AVATARS[0])])],
  )
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (initial && initial.categoryIds.length > 0) return new Set(initial.categoryIds)
    // Same default as the randomizer: the edition's first ready category.
    const first = categories.find((c) => c.ready)?.id
    return new Set(first ? [first] : [])
  })
  const [mode, setMode] = useState<GameMode>(initial?.mode ?? 'in-person')
  // Stored as the base (the full-game cutoff), so a preset is "on" when its base
  // matches; the actual cutoff is derived at start.
  const [difficultyBase, setDifficultyBase] = useState(initial?.difficultyBase ?? HINTER_BASE)
  const [answers, setAnswers] = useState(initial?.answersPerGame ?? ANSWERS_PER_GAME)
  // What applies is the intersection with the values currently on offer, so
  // deselecting a category drops its values without losing the rest of the picks.
  const [secondaryPicks, setSecondaryPicks] = useState<Set<TagValue>>(
    () => new Set(initial?.secondaryValues ?? []),
  )

  const secondaryOptions = useMemo(() => tagValueOptions(categories, selected), [categories, selected])
  const secondaryValues = activeTagValues(secondaryOptions, secondaryPicks)
  const showSecondary = Boolean(secondaryTag) && secondaryOptions.length > 0

  function update(id: string, patch: Partial<Player>) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function add() {
    if (players.length >= MAX_PLAYERS) return
    setPlayers((ps) => [...ps, makePlayer(ps.map((p) => avatarKey(p.avatar)))])
  }

  function remove(id: string) {
    setPlayers((ps) => (ps.length > MIN_PLAYERS ? ps.filter((p) => p.id !== id) : ps))
    if (pickerFor === id) setPickerFor(null)
  }

  function toggleCategory(id: string) {
    setSelected((s) => toggledKeepOne(s, id))
  }

  function toggleSecondary(value: TagValue) {
    setSecondaryPicks((s) => toggled(s, value))
  }

  const names = players.map((p) => p.name.trim())
  const hasBlank = names.some((n) => n === '')
  const hasDupes = new Set(names.map((n) => n.toLowerCase())).size !== names.length
  const problem = hasBlank
    ? 'Give everyone a name.'
    : hasDupes
      ? 'Player names need to be different.'
      : null
  const ready = !problem && selected.size > 0

  function resetDefaults() {
    setDifficultyBase(HINTER_BASE)
    setAnswers(ANSWERS_PER_GAME)
  }

  function start() {
    if (!ready) return
    onStart({
      players: players.map((p) => ({ ...p, name: p.name.trim() })),
      mode,
      categoryIds: [...selected],
      difficultyBase,
      answersPerGame: answers,
      secondaryValues,
    })
  }

  return (
    <div className={styles.setup}>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Mode</h2>
        </div>
        <div className={styles.categories}>
          {MODES.map((m) => {
            const on = mode === m.id
            const cls = !m.ready ? styles.catSoon : on ? styles.catOn : styles.cat
            return (
              <button
                key={m.id}
                type="button"
                className={cls}
                disabled={!m.ready}
                aria-pressed={on}
                onClick={() => setMode(m.id)}
              >
                {m.label}
                {!m.ready && <span className={styles.soon}>soon</span>}
              </button>
            )
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Game</h2>
          <button type="button" className={styles.reset} onClick={resetDefaults}>
            Reset to defaults
          </button>
        </div>

        <div className={styles.gameControls}>
          <div className={styles.controlGroup}>
            <div className={styles.subLabel}>Difficulty</div>
            <div className={styles.categories}>
              {DIFFICULTIES.map((d) => {
                const on = difficultyBase === d.base
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={on ? styles.catOn : styles.cat}
                    aria-pressed={on}
                    onClick={() => setDifficultyBase(d.base)}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.subLabel}>Answers per turn</div>
            <div className={styles.stepperRow}>
              <div className={styles.stepper}>
                <button
                  type="button"
                  className={styles.step}
                  onClick={() => setAnswers((n) => clampAnswers(n - 1))}
                  disabled={answers <= MIN_ANSWERS}
                  aria-label="Fewer answers"
                >
                  −
                </button>
                <span className={styles.stepValue}>{answers}</span>
                <button
                  type="button"
                  className={styles.step}
                  onClick={() => setAnswers((n) => clampAnswers(n + 1))}
                  disabled={answers >= MAX_ANSWERS}
                  aria-label="More answers"
                >
                  +
                </button>
              </div>
              <span className={styles.note}>{MIN_ANSWERS}–{MAX_ANSWERS} answers to land per turn.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Players</h2>
          <span className={styles.count}>
            {players.length} / {MAX_PLAYERS}
          </span>
        </div>

        <ul className={players.length >= 5 ? `${styles.players} ${styles.playersGrid}` : styles.players}>
          {players.map((p) => (
            <li key={p.id} className={styles.player}>
              <div className={styles.row}>
                <button
                  type="button"
                  className={styles.avatarBtn}
                  onClick={() => setPickerFor((cur) => (cur === p.id ? null : p.id))}
                  aria-label="Change avatar"
                >
                  <Avatar avatar={p.avatar} size={36} />
                </button>
                <input
                  className={styles.name}
                  value={p.name}
                  maxLength={16}
                  placeholder="Player name"
                  onChange={(e) => update(p.id, { name: e.target.value })}
                />
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => remove(p.id)}
                  disabled={players.length <= MIN_PLAYERS}
                  aria-label={`Remove ${p.name || 'player'}`}
                >
                  ×
                </button>
              </div>
              {pickerFor === p.id && (
                <div className={styles.picker}>
                  {AVATARS.map((a) => {
                    const key = avatarKey(a)
                    return (
                      <button
                        key={key}
                        type="button"
                        className={avatarKey(p.avatar) === key ? styles.pickActive : styles.pick}
                        title={a.kind === 'image' ? a.label : undefined}
                        onClick={() => {
                          update(p.id, { avatar: a })
                          setPickerFor(null)
                        }}
                      >
                        <Avatar avatar={a} size={32} />
                      </button>
                    )
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>

        <button
          type="button"
          className={styles.add}
          onClick={add}
          disabled={players.length >= MAX_PLAYERS}
        >
          + Add player
        </button>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>{mode === 'online-randomizer' ? 'Answers' : 'Categories'}</h2>
        </div>
        {mode === 'online-randomizer' ? (
          // Randomizer runs deckless, so the game's category toggles would do
          // nothing. Answers are drawn on the randomizer page, which has its own
          // category picker, so point there instead of showing dead toggles.
          <>
            <p className={styles.note}>Answers come from the randomizer page, or outside resources.</p>
            <a
              href={randomizerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.randomizerLink}
            >
              Open randomizer
            </a>
          </>
        ) : (
          <>
            <div className={styles.categories}>
              {categories.map((c) => {
                const on = selected.has(c.id)
                const cls = !c.ready ? styles.catSoon : on ? styles.catOn : styles.cat
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={cls}
                    disabled={!c.ready}
                    aria-pressed={on}
                    onClick={() => toggleCategory(c.id)}
                  >
                    {c.label}
                    {!c.ready && <span className={styles.soon}>soon</span>}
                  </button>
                )
              })}
            </div>
            {showSecondary && secondaryTag && (
              <div className={styles.secondary}>
                <div className={styles.subLabel}>{secondaryTag.label}</div>
                <div className={styles.categories}>
                  {secondaryOptions.map((v) => {
                    const on = secondaryPicks.has(v)
                    return (
                      <button
                        key={v}
                        type="button"
                        className={on ? styles.catOn : styles.cat}
                        aria-pressed={on}
                        onClick={() => toggleSecondary(v)}
                      >
                        {v}
                      </button>
                    )
                  })}
                </div>
                <p className={styles.note}>Pick one or more, or none for all.</p>
              </div>
            )}
            <p className={styles.note}>Settings lock once you start.</p>
          </>
        )}
      </section>

      <div className={styles.footer}>
        {problem && <p className={styles.problem}>{problem}</p>}
        <button type="button" className={styles.start} onClick={start} disabled={!ready}>
          Start
        </button>
      </div>

      <Footer credits={credits} />
    </div>
  )
}
