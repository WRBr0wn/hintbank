import { useState, type CSSProperties } from 'react'
import { EDITIONS, editionById, gamePath, type Edition } from '../editions'
import EditionTileBody from '../components/EditionTileBody'
import { lookupRoom } from '../net'
import { ROOM_CODE_LENGTH, isRoomCode, normalizeRoomCode } from '../protocol'
import styles from './Menu.module.css'
import tiles from '../components/EditionTiles.module.css'

const tileAccent = (e: Edition) =>
  e.look ? ({ '--tile-accent': e.look.accent } as CSSProperties) : undefined

// The join-a-room box: a code from any edition resolves here (the pre-join
// lookup) and forwards to that edition's game page with the code prefilled,
// so "right code, wrong edition page" cannot happen. Invalid or dead codes
// get an inline error; the join handshake on the game page still owns every
// other error.
function JoinBox() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function go() {
    const c = normalizeRoomCode(code)
    if (!isRoomCode(c)) {
      setError(`A room code is ${ROOM_CODE_LENGTH} letters and numbers.`)
      return
    }
    setBusy(true)
    setError(null)
    const found = await lookupRoom(c)
    setBusy(false)
    if (!found.ok) {
      setError(found.reason === 'not-found' ? 'No room with that code.' : 'Could not reach the server.')
      return
    }
    if (!found.joinable) {
      setError('That room is locked.')
      return
    }
    // An edition this build does not know cannot be routed; treat it like a
    // dead code rather than a broken link.
    if (!editionById(found.editionId)) {
      setError('No room with that code.')
      return
    }
    window.location.href = `${gamePath(found.editionId)}?room=${c}`
  }

  return (
    <div className={styles.joinRow}>
      <p className={styles.joinLabel}>Have a room code?</p>
      <div className={styles.joinControls}>
        <input
          className={styles.joinCode}
          value={code}
          maxLength={ROOM_CODE_LENGTH}
          placeholder="CODE"
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))
            setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && !busy && go()}
        />
        <button type="button" className={styles.joinGo} disabled={busy || code.length !== ROOM_CODE_LENGTH} onClick={go}>
          {busy ? 'Looking…' : 'Join'}
        </button>
      </div>
      {error && <p className={styles.joinError}>{error}</p>}
    </div>
  )
}

// Live editions link to their own game page; soon editions render disabled, the
// same tile pattern the randomizer selector uses.
export default function Menu() {
  return (
    <div className={styles.menu}>
      <p className={styles.tagline}>One hinter, a bank of 40 words, and everyone else guessing.</p>
      <p className={styles.lead}>Choose an edition</p>
      <div className={tiles.grid}>
        {EDITIONS.map((e) => {
          if (e.status !== 'live') {
            return (
              <div key={e.id} className={tiles.tileSoon} style={tileAccent(e)} aria-disabled="true">
                <EditionTileBody edition={e} />
              </div>
            )
          }
          return (
            <a key={e.id} className={tiles.tile} style={tileAccent(e)} href={gamePath(e.id)}>
              <EditionTileBody edition={e} />
            </a>
          )
        })}
      </div>
      <JoinBox />
    </div>
  )
}
