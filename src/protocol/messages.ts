// Inbound message validation: hand-rolled guards, no dependency. Every message
// crossing the wire is untrusted until it passes through here. The worker runs
// parseClientMessage on each frame and drops or errors on anything that does
// not validate; the reducer then trusts the shape. Version mismatch is its own
// error so a client on an old bundle gets "hard refresh", not a cryptic parse
// failure.

import {
  MAX_GUESS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_WORD_LENGTH,
  PROTOCOL_VERSION,
  fail,
  type ClientMessage,
  type ResolveOutcome,
  type RoomSettings,
} from './types'

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

const isString = (v: unknown): v is string => typeof v === 'string'

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

// A record of non-negative integers keyed by seat id: the overguess-per-player
// shape, and the same guard suits any future counting field.
function isCountRecord(v: unknown): v is Record<string, number> {
  if (!isObject(v)) return false
  for (const value of Object.values(v)) {
    if (!isInt(value) || value < 0) return false
  }
  return true
}

function parseResolveOutcome(v: unknown): ResolveOutcome {
  if (!isObject(v)) fail('bad-message', 'resolve outcome must be an object')
  const outcome: ResolveOutcome = {}
  if ('correctGuesserId' in v && v.correctGuesserId !== undefined) {
    if (!isString(v.correctGuesserId)) fail('bad-message', 'correctGuesserId must be a string')
    outcome.correctGuesserId = v.correctGuesserId
  }
  if ('overguesses' in v && v.overguesses !== undefined) {
    if (!isCountRecord(v.overguesses)) fail('bad-message', 'overguesses must be non-negative integers')
    outcome.overguesses = v.overguesses
  }
  return outcome
}

// Partial settings from an updateSettings message. Only the fields present are
// validated for type; the reducer's validateSettings enforces the value
// ranges after the merge, so bounds live in one place.
function parseSettingsPatch(v: unknown): Partial<RoomSettings> {
  if (!isObject(v)) fail('bad-message', 'settings must be an object')
  const patch: Partial<RoomSettings> = {}
  if ('categoryIds' in v && v.categoryIds !== undefined) {
    if (!Array.isArray(v.categoryIds) || !v.categoryIds.every(isString)) {
      fail('bad-message', 'categoryIds must be strings')
    }
    patch.categoryIds = v.categoryIds
  }
  if ('difficultyBase' in v && v.difficultyBase !== undefined) {
    if (!isInt(v.difficultyBase)) fail('bad-message', 'difficultyBase must be an integer')
    patch.difficultyBase = v.difficultyBase
  }
  if ('answersPerGame' in v && v.answersPerGame !== undefined) {
    if (!isInt(v.answersPerGame)) fail('bad-message', 'answersPerGame must be an integer')
    patch.answersPerGame = v.answersPerGame
  }
  if ('tagValues' in v && v.tagValues !== undefined) {
    if (
      !Array.isArray(v.tagValues) ||
      !v.tagValues.every((t) => isString(t) || typeof t === 'number')
    ) {
      fail('bad-message', 'tagValues must be strings or numbers')
    }
    patch.tagValues = v.tagValues
  }
  if ('onlineMode' in v && v.onlineMode !== undefined) {
    if (v.onlineMode !== 'voice' && v.onlineMode !== 'typed') fail('bad-message', 'unknown online mode')
    patch.onlineMode = v.onlineMode
  }
  return patch
}

function boundedString(v: unknown, max: number, label: string): string {
  if (!isString(v)) fail('bad-message', `${label} must be a string`)
  const s = (v as string).trim()
  if (!s || s.length > max) fail('bad-message', `${label} is 1 to ${max} characters`)
  return v as string
}

// Parses and validates one inbound frame. Throws RoomError on a bad version or
// a malformed body; returns a well-typed ClientMessage the reducer can trust.
// The version check comes first so an out-of-date client is told to refresh
// rather than getting a shape error.
export function parseClientMessage(raw: unknown): ClientMessage {
  if (!isObject(raw)) fail('bad-message', 'a message must be an object')
  if (raw.v !== PROTOCOL_VERSION) {
    fail('bad-version', 'this client is out of date, hard refresh the page')
  }
  if (!isString(raw.type)) fail('bad-message', 'a message needs a type')
  const v = PROTOCOL_VERSION

  switch (raw.type) {
    case 'join': {
      const name = boundedString(raw.name, MAX_NAME_LENGTH, 'name')
      if (!isString(raw.avatar)) fail('bad-message', 'avatar must be a string')
      const msg: ClientMessage = { v, type: 'join', name, avatar: raw.avatar as string }
      if ('spectator' in raw && raw.spectator !== undefined) {
        if (!isBool(raw.spectator)) fail('bad-message', 'spectator must be a boolean')
        msg.spectator = raw.spectator
      }
      if ('token' in raw && raw.token !== undefined) {
        if (!isString(raw.token)) fail('bad-message', 'token must be a string')
        msg.token = raw.token
      }
      return msg
    }
    case 'leave':
      return { v, type: 'leave' }
    case 'requestSnapshot':
      return { v, type: 'requestSnapshot' }
    case 'updateSettings':
      return { v, type: 'updateSettings', settings: parseSettingsPatch(raw.settings) }
    case 'setLocked':
      if (!isBool(raw.locked)) fail('bad-message', 'locked must be a boolean')
      return { v, type: 'setLocked', locked: raw.locked }
    case 'kick':
      if (!isString(raw.seatId)) fail('bad-message', 'seatId must be a string')
      return { v, type: 'kick', seatId: raw.seatId }
    case 'becomeSpectator':
      return { v, type: 'becomeSpectator' }
    case 'becomePlayer':
      return { v, type: 'becomePlayer' }
    case 'start':
      return { v, type: 'start' }
    case 'ready':
      return { v, type: 'ready' }
    case 'skipHinter':
      return { v, type: 'skipHinter' }
    case 'addWord':
      return { v, type: 'addWord', word: boundedString(raw.word, MAX_WORD_LENGTH, 'word') }
    case 'giveHint': {
      if (!Array.isArray(raw.selection) || !raw.selection.every((i: unknown) => isInt(i) && i >= 0)) {
        fail('bad-message', 'selection must be non-negative integers')
      }
      return { v, type: 'giveHint', selection: raw.selection as number[] }
    }
    case 'resolve':
      return { v, type: 'resolve', outcome: parseResolveOutcome(raw.outcome) }
    case 'reroll':
      return { v, type: 'reroll' }
    case 'endTurn':
      return { v, type: 'endTurn' }
    case 'finishTurn':
      return { v, type: 'finishTurn' }
    case 'forceEndTurn':
      return { v, type: 'forceEndTurn' }
    case 'guess': {
      const term = boundedString(raw.term, MAX_GUESS_LENGTH, 'guess')
      // The hint the guess answers (the engine's hintCount it was made against),
      // so an overguess scores against that hint even if the hinter has given a
      // newer one since. The reducer clamps it to the hints that exist.
      if (!isInt(raw.hintIndex) || raw.hintIndex < 0) fail('bad-message', 'hintIndex must be a non-negative integer')
      return { v, type: 'guess', term, hintIndex: raw.hintIndex }
    }
    case 'continueSession':
      return { v, type: 'continueSession' }
    case 'playAgain':
      return { v, type: 'playAgain' }
    case 'resetSession':
      return { v, type: 'resetSession' }
    case 'closeRoom':
      return { v, type: 'closeRoom' }
    default:
      return fail('bad-message', `unknown message type: ${String(raw.type)}`)
  }
}
