import { useState } from 'react'
import { ANSWERS_PER_GAME } from '../engine'
import type { Player } from '../types'
import styles from './Setup.module.css'

const AVATARS = ['🦊', '🐢', '🐉', '🦉', '🐱', '🐰', '🐼', '🐧', '🦄', '🐸', '🦁', '🐙']

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
  const avatar = AVATARS.find((a) => !used.includes(a)) ?? AVATARS[0]
  return { id: crypto.randomUUID(), name: '', avatar }
}

export default function Setup({ onStart }: { onStart: (players: Player[]) => void }) {
  const [players, setPlayers] = useState<Player[]>(() => [makePlayer([]), makePlayer(['🦊'])])
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(['pokemon']))

  function update(id: string, patch: Partial<Player>) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function add() {
    if (players.length >= MAX_PLAYERS) return
    setPlayers((ps) => [...ps, makePlayer(ps.map((p) => p.avatar))])
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
    onStart(players.map((p) => ({ ...p, name: p.name.trim() })))
  }

  return (
    <div className={styles.setup}>
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
                  {p.avatar}
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
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={a === p.avatar ? styles.pickActive : styles.pick}
                      onClick={() => {
                        update(p.id, { avatar: a })
                        setPickerFor(null)
                      }}
                    >
                      {a}
                    </button>
                  ))}
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
