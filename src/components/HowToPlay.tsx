import { useId } from 'react'
import { useModalFocus } from '../hooks/useModalFocus'
import {
  ANSWERS_PER_GAME,
  BANK_CAP,
  HINTER_BASE,
  HINTER_BASE_EASY,
  HINTER_BASE_HARD,
  MAX_ANSWERS,
  MIN_ANSWERS,
  cutoffFor,
} from '../engine'
import styles from './HowToPlay.module.css'

interface Props {
  // In-turn surfaces (pass screen, play board) lead with the compact quick
  // reference; everywhere else opens straight to the overview.
  inTurn: boolean
  onClose: () => void
}

// The rules, in-app. Platform content: edition-agnostic, one text for all
// editions. Every number is read from the engine's constants so a balance
// change cannot make this screen lie.
export default function HowToPlay({ inTurn, onClose }: Props) {
  const dialogRef = useModalFocus(onClose)
  const titleId = useId()

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.top}>
          <h2 id={titleId} className={styles.title}>How to play</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.body}>
          {inTurn && (
            <section className={styles.quick}>
              <h3 className={styles.heading}>Quick reference</h3>
              <ul className={styles.list}>
                <li>Hints use only Hint Bank words. Add new words first if there is room; the bank holds {BANK_CAP} for the whole turn.</li>
                <li>Bank words can be reused and recombined on any hint.</li>
                <li>Every other player gets one guess per hint. Extra guesses on the same hint cost that player 1 point each.</li>
                <li>A reroll swaps the answer for a different one but permanently burns one bank slot.</li>
                <li>The hinter scores the cutoff minus the bank size, so every entry counts.</li>
              </ul>
            </section>
          )}

          <section>
            <h3 className={styles.heading}>The idea</h3>
            <p>
              One player is the hinter; everyone else guesses. The hinter holds a set of secret answers
              ({MIN_ANSWERS} to {MAX_ANSWERS}, your call at setup), revealed to them one at a time, and has to
              get the table to guess each one. The catch: hints can only use words from the Hint Bank, a
              shared list the hinter fills as they go, capped at {BANK_CAP} words for their whole turn. Bank
              words can be reused on any hint, in any combination. The fewer words the hinter spends, the more
              they score. Everyone hints once per session, and the highest total takes the crown.
            </p>
          </section>

          <section>
            <h3 className={styles.heading}>A turn</h3>
            <ol className={styles.list}>
              <li>The hinter learns the current secret answer. How it stays secret depends on the mode.</li>
              <li>They give a hint: any selection of words from the bank, adding new words first if there is room.</li>
              <li>Every other player gets one guess, out loud.</li>
              <li>Someone is right: the answer is tagged with their name and the next one comes up. Nobody is right: the hinter gives another hint.</li>
              <li>After the last answer, the finished board stays up to review, then the turn passes to the next hinter.</li>
            </ol>
          </section>

          <section>
            <h3 className={styles.heading}>Scoring</h3>
            <p>
              The hinter scores the cutoff minus their Hint Bank entries. Difficulty picks the cutoff: Easy{' '}
              {HINTER_BASE_EASY}, Regular {HINTER_BASE}, Hard {HINTER_BASE_HARD}. That is the cutoff for a
              full {ANSWERS_PER_GAME}-answer turn; shorter turns scale it down in proportion, so a{' '}
              {MIN_ANSWERS}-answer turn on Regular plays to {cutoffFor(HINTER_BASE, MIN_ANSWERS)}. Scores can
              go negative.
            </p>
            <p>
              Guessers earn 1 point for every answer they personally land. Guessing more than once on a single
              hint costs 1 point per extra guess.
            </p>
          </section>

          <section>
            <h3 className={styles.heading}>Rerolls and ending a turn</h3>
            <p>
              Stuck on an answer? The hinter can reroll it for a different random one, but each reroll
              permanently burns one of the {BANK_CAP} bank slots. In a small answer pool a rerolled answer can
              come back around; the answer card marks it. Once the bank is full, the hinter can end the turn
              and forfeit the rest. A full bank already scores the cutoff minus {BANK_CAP}, so a stalled turn
              is its own penalty.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
