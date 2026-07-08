import { describe, expect, it } from 'vitest'
import { PROTOCOL_VERSION, type RoomView } from '../protocol'
import { applyServerMessage, IDLE, type NetState } from './state'

const view = (over: Partial<RoomView> = {}): RoomView => ({
  editionId: 'geography',
  code: 'ABC234',
  phase: 'lobby',
  locked: false,
  hostId: 'seat-1',
  settings: { categoryIds: ['countries'], difficultyBase: 25, answersPerGame: 10, tagValues: [], onlineMode: 'voice' },
  seats: [{ id: 'seat-1', name: 'Ann', avatar: 'fox', role: 'player', connection: 'connected', pending: false }],
  totals: { 'seat-1': 0 },
  you: 'seat-1',
  session: null,
  game: null,
  hinter: null,
  ...over,
})

const v = PROTOCOL_VERSION

describe('applyServerMessage', () => {
  it('moves to joined on welcome, capturing the seat and view', () => {
    const next = applyServerMessage(IDLE, { v, type: 'welcome', seatId: 'seat-1', token: 'tok', view: view() })
    expect(next.status).toBe('joined')
    expect(next.seatId).toBe('seat-1')
    expect(next.view?.code).toBe('ABC234')
  })

  it('replaces the view on a snapshot, keeping the seat', () => {
    const joined: NetState = { status: 'joined', seatId: 'seat-1', view: view(), error: null }
    const next = applyServerMessage(joined, { v, type: 'snapshot', view: view({ locked: true }) })
    expect(next.status).toBe('joined')
    expect(next.seatId).toBe('seat-1')
    expect(next.view?.locked).toBe(true)
  })

  it('treats a reconnect snapshot as the same render path', () => {
    const reconnecting: NetState = { status: 'reconnecting', seatId: 'seat-1', view: view(), error: null }
    const next = applyServerMessage(reconnecting, { v, type: 'snapshot', view: view() })
    expect(next.status).toBe('joined')
  })

  it('routes a pre-welcome error back to the form as a join-error', () => {
    const joining: NetState = { status: 'joining', seatId: null, view: null, error: null }
    const next = applyServerMessage(joining, { v, type: 'error', code: 'name-taken', message: 'that name is taken' })
    expect(next.status).toBe('join-error')
    expect(next.error).toEqual({ code: 'name-taken', message: 'that name is taken' })
  })

  it('keeps the lobby on an error that arrives after joining', () => {
    const joined: NetState = { status: 'joined', seatId: 'seat-1', view: view(), error: null }
    const next = applyServerMessage(joined, { v, type: 'error', code: 'not-host', message: 'only the host' })
    expect(next.status).toBe('joined')
    expect(next.view).not.toBeNull()
    expect(next.error?.code).toBe('not-host')
  })

  it('makes a version mismatch terminal regardless of when it arrives', () => {
    const joined: NetState = { status: 'joined', seatId: 'seat-1', view: view(), error: null }
    const next = applyServerMessage(joined, { v, type: 'error', code: 'bad-version', message: 'hard refresh' })
    expect(next.status).toBe('version')
  })

  it('ends on kicked and roomClosed, dropping the view', () => {
    const joined: NetState = { status: 'joined', seatId: 'seat-1', view: view(), error: null }
    expect(applyServerMessage(joined, { v, type: 'kicked' }).status).toBe('kicked')
    expect(applyServerMessage(joined, { v, type: 'kicked' }).view).toBeNull()
    expect(applyServerMessage(joined, { v, type: 'roomClosed', reason: 'expired' }).status).toBe('room-closed')
  })
})
