import { useState } from 'react'
import Avatar from '../components/Avatar'
import { ANSWERS_PER_GAME, type GameMode } from '../engine'
import type { Player, PlayerAvatar } from '../types'
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
  { kind: 'image', src: `${base}avatars/zenvolka.jpg`, label: 'ZenVolka' },
]
// A handful of recognizable mascots. The full sprite set is bundled in
// public/sprites (see scripts/scrape-sprites.js). This is just the picker subset.
const POKEMON: PlayerAvatar[] = (
  [
    [1, 'Bulbasaur'],
    [4, 'Charmander'],
    [7, 'Squirtle'],
    [25, 'Pikachu'],
    [6, 'Charizard'],
    [39, 'Jigglypuff'],
    [94, 'Gengar'],
    [133, 'Eevee'],
    [143, 'Snorlax'],
    [150, 'Mewtwo'],
    [448, 'Lucario'],
    [658, 'Greninja'],
  ] as [number, string][]
).map(([dex, label]) => ({ kind: 'image', src: `${base}sprites/${dex}.png`, label, zoom: 1.3, bare: true }))

const AVATARS: PlayerAvatar[] = [...EMOJI, ...CREATORS, ...POKEMON]

const avatarKey = (a: PlayerAvatar) => (a.kind === 'emoji' ? a.value : a.src)

// Single-select. Multiplayer ships later and shows as "soon". The online modes
// keep the answer off a shared screen: one-device hides it behind hold-to-reveal,
// randomizer is the host-driven board. In-person is the original private game.
const MODES: { id: GameMode; label: string; ready: boolean }[] = [
  { id: 'in-person', label: 'In Person: One Device', ready: true },
  { id: 'online-one-device', label: 'Online: One Device', ready: true },
  { id: 'online-randomizer', label: 'Online: One Device + Randomizer', ready: true },
  { id: 'online-multiplayer', label: 'Online: Multiplayer', ready: false },
]

const CATEGORIES = [
  { id: 'pokemon', label: 'Pokémon', ready: true },
  { id: 'items', label: 'Items', ready: false },
  { id: 'leaders', label: 'Gym Leaders', ready: false },
  { id: 'towns', label: 'Towns', ready: false },
  { id: 'badges', label: 'Badges', ready: false },
  { id: 'professors', label: 'Professors', ready: false },
]

const MIN_PLAYERS = 2
const MAX_PLAYERS = 8

function makePlayer(used: string[]): Player {
  const avatar = AVATARS.find((a) => !used.includes(avatarKey(a))) ?? AVATARS[0]
  return { id: crypto.randomUUID(), name: '', avatar }
}

export default function Setup({ onStart }: { onStart: (players: Player[], mode: GameMode) => void }) {
  const [players, setPlayers] = useState<Player[]>(() => [
    makePlayer([]),
    makePlayer([avatarKey(AVATARS[0])]),
  ])
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(['pokemon']))
  const [mode, setMode] = useState<GameMode>('in-person')

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
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) {
        if (next.size > 1) next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
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

  function start() {
    if (!ready) return
    onStart(players.map((p) => ({ ...p, name: p.name.trim() })), mode)
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
                onClick={() => m.ready && setMode(m.id)}
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
          <h2>Players</h2>
          <span className={styles.count}>
            {players.length} / {MAX_PLAYERS}
          </span>
        </div>

        <ul className={styles.players}>
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
          <h2>Categories</h2>
        </div>
        <div className={styles.categories}>
          {CATEGORIES.map((c) => {
            const on = selected.has(c.id)
            const cls = !c.ready ? styles.catSoon : on ? styles.catOn : styles.cat
            return (
              <button
                key={c.id}
                type="button"
                className={cls}
                disabled={!c.ready}
                aria-pressed={on}
                onClick={() => c.ready && toggleCategory(c.id)}
              >
                {c.label}
                {!c.ready && <span className={styles.soon}>soon</span>}
              </button>
            )
          })}
        </div>
        <p className={styles.note}>{ANSWERS_PER_GAME} answers per turn. Settings lock once you start.</p>
      </section>

      <div className={styles.footer}>
        {problem && <p className={styles.problem}>{problem}</p>}
        <button type="button" className={styles.start} onClick={start} disabled={!ready}>
          Start
        </button>
      </div>
    </div>
  )
}
