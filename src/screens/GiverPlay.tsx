import { useState } from 'react'
import BankGrid from '../components/BankGrid'
import {
  ANSWERS_PER_GAME,
  BANK_CAP,
  addWord,
  canAddWord,
  canEndTurn,
  canReroll,
  currentAnswer,
  endTurn,
  giveHint,
  isBankFull,
  resolveHint,
  reroll,
  type GameState,
} from '../engine'
import type { Player } from '../types'
import styles from './GiverPlay.module.css'

interface Props {
  game: GameState
  roster: Player[]
  onChange: (next: GameState) => void
}

// PokeAPI identifiers are lowercase and hyphenated; tidy them for display only.
function pretty(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function GiverPlay({ game, roster, onChange }: Props) {
  const [selection, setSelection] = useState<number[]>([])
  const [draft, setDraft] = useState('')
  const [overguess, setOverguess] = useState<Record<string, number>>({})

  const guessers = roster.filter((p) => p.id !== game.giverId)
  const answer = currentAnswer(game)
  const full = isBankFull(game)
  const hinting = game.phase === 'hinting'
  const avatarFor = (id: string) => roster.find((p) => p.id === id)?.avatar ?? '?'

  function toggleWord(i: number) {
    setSelection((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
  }

  function handleAdd() {
    const word = draft.trim()
    if (!word || !canAddWord(game)) return
    onChange(addWord(game, word))
    setDraft('')
  }

  function handleGive() {
    if (selection.length === 0) return
    onChange(giveHint(game, selection))
    setSelection([])
  }

  function handleCorrect(pid: string) {
    onChange(resolveHint(game, { correctGuesserId: pid, overguesses: overguess }))
    setOverguess({})
    setSelection([])
  }

  function handleNoOne() {
    onChange(resolveHint(game, { overguesses: overguess }))
    setOverguess({})
  }

  function handleReroll() {
    if (!canReroll(game)) return
    onChange(reroll(game))
    setSelection([])
  }

  function handleEndTurn() {
    if (!canEndTurn(game)) return
    onChange(endTurn(game))
  }

  return (
    <div className={styles.play}>
      <div className={styles.main}>
      <div className={styles.progress}>
        <span>Answer {game.resolved + 1} of {ANSWERS_PER_GAME}</span>
        <span>{game.hintCount} {game.hintCount === 1 ? 'hint' : 'hints'}</span>
      </div>
      <div className={styles.bar}>
        <div className={styles.barFill} style={{ width: `${(game.resolved / ANSWERS_PER_GAME) * 100}%` }} />
      </div>

      <div className={styles.answer}>
        <span className={styles.answerLabel}>Secret answer</span>
        <span className={styles.answerName}>{answer ? pretty(answer) : ''}</span>
      </div>

      <section className={styles.bankSection}>
        <div className={styles.bankHead}>
          <h2>Hint Bank</h2>
          <span className={full ? styles.bankFull : styles.bankCount}>
            {game.bank.length} / {BANK_CAP}
            {full && ' · bank full'}
          </span>
        </div>

        <BankGrid bank={game.bank} cap={BANK_CAP} selected={selection} interactive={hinting} onToggle={toggleWord} />

        {full ? (
          <p className={styles.fullNote}>The bank is full — give hints from these words, or end the turn.</p>
        ) : (
          <div className={styles.addRow}>
            <input
              className={styles.addInput}
              value={draft}
              maxLength={24}
              placeholder="Add a word to the bank"
              disabled={!hinting}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button type="button" className={styles.add} onClick={handleAdd} disabled={!canAddWord(game) || draft.trim() === ''}>
              Add
            </button>
          </div>
        )}
      </section>

      {hinting ? (
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={handleGive} disabled={selection.length === 0}>
            Give hint
          </button>
          <div className={styles.escapes}>
            <button type="button" className={styles.secondary} onClick={handleReroll} disabled={!canReroll(game)}>
              Reroll
            </button>
            <button type="button" className={styles.danger} onClick={handleEndTurn} disabled={!canEndTurn(game)}>
              End turn (−5)
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.resolve}>
          <p className={styles.resolvePrompt}>Who guessed it?</p>
          <ul className={styles.guessers}>
            {guessers.map((p) => (
              <li key={p.id} className={styles.guesser}>
                <span className={styles.guesserName}>
                  {p.avatar} {p.name}
                  {overguess[p.id] ? <span className={styles.penalty}> −{overguess[p.id]}</span> : null}
                </span>
                <span className={styles.guesserBtns}>
                  <button
                    type="button"
                    className={styles.minus}
                    onClick={() => setOverguess((o) => ({ ...o, [p.id]: (o[p.id] ?? 0) + 1 }))}
                    aria-label={`Overguess for ${p.name}`}
                  >
                    Guessed Twice (−1)
                  </button>
                  <button type="button" className={styles.correct} onClick={() => handleCorrect(p.id)}>
                    Correct
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.secondary} onClick={handleNoOne}>
            No one — keep hinting
          </button>
        </div>
      )}
      </div>

      <aside className={styles.results}>
        <h2 className={styles.resultsHead}>Landed</h2>
        <ol className={styles.resultList}>
          {Array.from({ length: ANSWERS_PER_GAME }, (_, i) => {
            const result = game.results[i]
            return (
              <li key={i} className={result ? styles.resultRow : styles.resultPending}>
                <span className={styles.resultNum}>{i + 1}</span>
                <span className={styles.resultName}>{result ? pretty(result.answer) : ''}</span>
                <span className={styles.resultAvatar}>{result ? avatarFor(result.guesserId) : ''}</span>
              </li>
            )
          })}
        </ol>
      </aside>
    </div>
  )
}
