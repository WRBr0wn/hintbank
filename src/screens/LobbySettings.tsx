import { useMemo } from 'react'
import {
  HINTER_BASE,
  HINTER_BASE_EASY,
  HINTER_BASE_HARD,
  MAX_ANSWERS,
  MIN_ANSWERS,
} from '../engine'
import { tagValueOptions, termPasses, type Category, type SecondaryTag, type TagValue } from '../editions'
import type { RoomSettings } from '../protocol'
import setup from './Setup.module.css'

const DIFFICULTIES: { id: string; label: string; base: number }[] = [
  { id: 'easy', label: 'Easy', base: HINTER_BASE_EASY },
  { id: 'regular', label: 'Regular', base: HINTER_BASE },
  { id: 'hard', label: 'Hard', base: HINTER_BASE_HARD },
]

const clampAnswers = (n: number) => Math.max(MIN_ANSWERS, Math.min(MAX_ANSWERS, n))

// The per-room voice/typed toggle, labeled by how guesses happen. Both play
// under the one "Online: Multiplayer" mode; this only picks the guess flow.
const GUESS_MODES: { id: 'voice' | 'typed'; label: string; note: string }[] = [
  { id: 'voice', label: 'Out loud', note: 'Guessers say answers on a call; the hinter marks who got it.' },
  { id: 'typed', label: 'Typed', note: 'Guessers pick from the pool on their own screen; the server scores it.' },
]

// The host-edited room settings, rendered through the same controls Setup uses.
// Fully driven by the server's RoomSettings: a change sends an intent and the
// next snapshot updates the controls, so the client never holds settings state
// of its own. Guests see the same controls, disabled.
export default function LobbySettings({
  settings,
  categories,
  secondaryTag,
  editable,
  onChange,
}: {
  settings: RoomSettings
  categories: Category[]
  secondaryTag?: SecondaryTag
  editable: boolean
  onChange: (patch: Partial<RoomSettings>) => void
}) {
  const selected = useMemo(() => new Set(settings.categoryIds), [settings.categoryIds])
  const secondaryOptions = useMemo(() => tagValueOptions(categories, selected), [categories, selected])
  const showSecondary = Boolean(secondaryTag) && secondaryOptions.length > 0

  const poolSize = useMemo(() => {
    let n = 0
    for (const c of categories) {
      if (!selected.has(c.id)) continue
      for (const t of c.terms) if (termPasses(t, settings.tagValues)) n++
    }
    return n
  }, [categories, selected, settings.tagValues])

  function toggleCategory(id: string) {
    if (!editable) return
    const next = selected.has(id) ? settings.categoryIds.filter((c) => c !== id) : [...settings.categoryIds, id]
    onChange({ categoryIds: next })
  }

  function toggleSecondary(value: TagValue) {
    if (!editable) return
    const has = settings.tagValues.includes(value)
    onChange({ tagValues: has ? settings.tagValues.filter((v) => v !== value) : [...settings.tagValues, value] })
  }

  return (
    <div className={setup.setup} style={{ padding: 0, gap: '1.5rem', maxWidth: 'none' }}>
      <section className={setup.section}>
        <div className={setup.sectionHead}>
          <h2>Game</h2>
        </div>
        <div className={setup.gameControls}>
          <div className={setup.controlGroup}>
            <div className={setup.subLabel}>Difficulty</div>
            <div className={setup.categories}>
              {DIFFICULTIES.map((d) => {
                const on = settings.difficultyBase === d.base
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={on ? setup.catOn : setup.cat}
                    aria-pressed={on}
                    disabled={!editable}
                    onClick={() => editable && onChange({ difficultyBase: d.base })}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={setup.controlGroup}>
            <div className={setup.subLabel}>Answers per turn</div>
            <div className={setup.stepperRow}>
              <div className={setup.stepper}>
                <button
                  type="button"
                  className={setup.step}
                  onClick={() => onChange({ answersPerGame: clampAnswers(settings.answersPerGame - 1) })}
                  disabled={!editable || settings.answersPerGame <= MIN_ANSWERS}
                  aria-label="Fewer answers"
                >
                  −
                </button>
                <span className={setup.stepValue}>{settings.answersPerGame}</span>
                <button
                  type="button"
                  className={setup.step}
                  onClick={() => onChange({ answersPerGame: clampAnswers(settings.answersPerGame + 1) })}
                  disabled={!editable || settings.answersPerGame >= MAX_ANSWERS}
                  aria-label="More answers"
                >
                  +
                </button>
              </div>
              <span className={setup.note}>{MIN_ANSWERS}–{MAX_ANSWERS} answers to land per turn.</span>
            </div>
            {poolSize < settings.answersPerGame && (
              <p className={setup.note}>
                This selection has {poolSize} {poolSize === 1 ? 'answer' : 'answers'} - turns will run {poolSize}.
              </p>
            )}
          </div>

          <div className={setup.controlGroup}>
            <div className={setup.subLabel}>How guesses happen</div>
            <div className={setup.categories}>
              {GUESS_MODES.map((m) => {
                const on = settings.onlineMode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={on ? setup.catOn : setup.cat}
                    aria-pressed={on}
                    disabled={!editable}
                    onClick={() => editable && onChange({ onlineMode: m.id })}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
            <p className={setup.note}>{GUESS_MODES.find((m) => m.id === settings.onlineMode)?.note}</p>
          </div>
        </div>
      </section>

      <section className={setup.section}>
        <div className={setup.sectionHead}>
          <h2>Categories</h2>
        </div>
        <div className={setup.categories}>
          {categories.map((c) => {
            const on = selected.has(c.id)
            const cls = !c.ready ? setup.catSoon : on ? setup.catOn : setup.cat
            return (
              <button
                key={c.id}
                type="button"
                className={cls}
                disabled={!c.ready || !editable}
                aria-pressed={on}
                onClick={() => toggleCategory(c.id)}
              >
                {c.label}
                {!c.ready && <span className={setup.soon}>soon</span>}
              </button>
            )
          })}
        </div>
        {showSecondary && secondaryTag && (
          <div className={setup.secondary}>
            <div className={setup.subLabel}>{secondaryTag.label}</div>
            <div className={setup.categories}>
              {secondaryOptions.map((val) => {
                const on = settings.tagValues.includes(val)
                return (
                  <button
                    key={String(val)}
                    type="button"
                    className={on ? setup.catOn : setup.cat}
                    aria-pressed={on}
                    disabled={!editable}
                    onClick={() => toggleSecondary(val)}
                  >
                    {val}
                  </button>
                )
              })}
            </div>
            <p className={setup.note}>Pick one or more, or none for all.</p>
          </div>
        )}
      </section>
    </div>
  )
}
