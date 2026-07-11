import { useEffect, useState, type CSSProperties } from 'react'
import { EDITIONS, editionById, gamePath, type Edition } from '../editions'
import EditionTileBody from '../components/EditionTileBody'
import CodeInput from '../components/CodeInput'
import { lookupRoom, type RoomLookupResult } from '../net'
import { ROOM_CODE_LENGTH, isRoomCode, normalizeRoomCode } from '../protocol'
import { badCodeMessage, codeStatus, lookupVerdict, noRoomMessage } from './joinFlow'
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

  // A full-length code resolves live, same as the multiplayer entry form; the
  // result is keyed by the code it answered so edits drop stale verdicts by
  // derivation. Advisory: a failed lookup says nothing and blocks nothing.
  const [lookedUp, setLookedUp] = useState<{ code: string; result: RoomLookupResult } | null>(null)
  useEffect(() => {
    const c = code.trim()
    if (c.length !== ROOM_CODE_LENGTH || !isRoomCode(c)) return
    let stale = false
    lookupRoom(c).then((result) => {
      if (!stale) setLookedUp({ code: c, result })
    })
    return () => {
      stale = true
    }
  }, [code])
  const resolved = lookedUp?.code === code.trim() ? lookedUp.result : null
  const verdict = lookupVerdict(code, resolved, (id) => editionById(id)?.displayName ?? null)
  // Editing the code clears the attempt error directly (below), so the slot
  // needs no dismissal bookkeeping here.
  const status = codeStatus(error, null, verdict)

  async function go() {
    const c = normalizeRoomCode(code)
    if (!isRoomCode(c)) {
      setError(badCodeMessage)
      return
    }
    setBusy(true)
    setError(null)
    // The live lookup usually already answered for this exact code.
    const found = resolved ?? (await lookupRoom(c))
    setBusy(false)
    if (!found.ok) {
      setError(found.reason === 'not-found' ? noRoomMessage : 'Could not reach the server.')
      return
    }
    if (!found.joinable) {
      setError('That room is locked.')
      return
    }
    // An edition this build does not know cannot be routed; treat it like a
    // dead code rather than a broken link.
    if (!editionById(found.editionId)) {
      setError(noRoomMessage)
      return
    }
    window.location.href = `${gamePath(found.editionId)}?room=${c}`
  }

  return (
    <div className={styles.joinRow}>
      <p className={styles.joinLabel}>Have a room code?</p>
      <div className={styles.joinControls}>
        <CodeInput
          value={code}
          inputClassName={styles.joinCode}
          onChange={(c) => {
            setCode(c)
            setError(null)
          }}
          onEnter={() => !busy && go()}
        />
        <button type="button" className={styles.joinGo} disabled={busy || code.length !== ROOM_CODE_LENGTH} onClick={go}>
          {busy ? 'Looking…' : 'Join'}
        </button>
      </div>
      {status && (
        <p className={status.kind === 'error' ? styles.joinError : styles.joinVerdict}>{status.text}</p>
      )}
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
