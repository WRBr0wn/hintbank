// Server-side name screening at the point of acceptance. Player-typed text
// reaches other screens in exactly one place (the roster), so this is the only
// content filter the system needs; guesses are selections from the term pool
// and never need screening. The list is deliberately tiny: it catches
// drive-bys, and the host's kick and room lock handle everything a list
// cannot. Keeping it narrow is also what avoids Scunthorpe-style false
// positives (MULTIPLAYER.md, Content filtering).

// Normalize before matching: lowercase, strip diacritics, fold common leet
// substitutions, drop everything but letters, then collapse runs of a repeated
// letter so "niiiigger" and "n i g g e r" reduce to the same core.
export function normalizeName(raw: string): string {
  const leet: Record<string, string> = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '8': 'b',
    '@': 'a',
    $: 's',
    '!': 'i',
  }
  const folded = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .split('')
    .map((c) => leet[c] ?? c)
    .join('')
  return folded.replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1')
}

// Stored in normalized form so a match is a straight substring test against the
// same normalization the input goes through. Short, substring-prone words are
// left out on purpose so ordinary names pass.
const DENY = ['nigger', 'nigga', 'faggot', 'retard', 'chink', 'spic', 'kike', 'tranny'].map(normalizeName)

// A name is refused when its normalized form contains a denied token. The
// caller answers with a "pick another name" error and keeps the seat unmade.
export function nameAllowed(raw: string): boolean {
  const normalized = normalizeName(raw)
  return !DENY.some((token) => normalized.includes(token))
}
