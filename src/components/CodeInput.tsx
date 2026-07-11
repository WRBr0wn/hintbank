import { useState } from 'react'
import { ROOM_CODE_LENGTH } from '../protocol'
import styles from './CodeInput.module.css'

// A room-code field that never shows the code: masked from the first character
// (the lobby chip's rule, extended to the join path), with a press-and-hold
// peek beside it. Hold to show, release to hide, the same deliberate grammar
// as Online: One Device's answer peek; never a toggle that can be left on.
export default function CodeInput({
  value,
  inputClassName,
  onChange,
  onEnter,
}: {
  value: string
  // The caller's own input styling, so the field sits in each form natively.
  inputClassName: string
  onChange: (code: string) => void
  onEnter?: () => void
}) {
  const [peeking, setPeeking] = useState(false)

  return (
    <div className={styles.wrap}>
      <input
        className={inputClassName}
        type={peeking ? 'text' : 'password'}
        value={value}
        maxLength={ROOM_CODE_LENGTH}
        placeholder="CODE"
        autoCapitalize="characters"
        // A code, not a credential: keeps password managers from offering to
        // save it while the field stays masked.
        autoComplete="one-time-code"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s+/g, ''))}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      />
      {/* Pointer events cover mouse, touch, and pen; leave and cancel re-cover
          if the press slides off, so it can never stay stuck revealed. */}
      <button
        type="button"
        className={styles.peek}
        aria-label="Hold to show the code"
        title="Hold to show the code"
        onPointerDown={() => setPeeking(true)}
        onPointerUp={() => setPeeking(false)}
        onPointerLeave={() => setPeeking(false)}
        onPointerCancel={() => setPeeking(false)}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setPeeking(true)}
        onKeyUp={() => setPeeking(false)}
        onBlur={() => setPeeking(false)}
      >
        Peek
      </button>
    </div>
  )
}
