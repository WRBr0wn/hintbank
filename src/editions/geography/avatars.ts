import type { PlayerAvatar } from '../../types'

// Country flags spread across all six continents, so any group finds theirs or
// a favorite. Ordered by continent: Africa, Asia, Europe, North America,
// South America, Oceania.
export const AVATARS: PlayerAvatar[] = [
  '🇪🇬', '🇳🇬', '🇰🇪', '🇿🇦', '🇲🇦',
  '🇯🇵', '🇮🇳', '🇨🇳', '🇰🇷', '🇹🇭', '🇵🇭',
  '🇬🇧', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇬🇷', '🇸🇪', '🇺🇦',
  '🇺🇸', '🇨🇦', '🇲🇽', '🇯🇲', '🇨🇷',
  '🇧🇷', '🇦🇷', '🇨🇴', '🇵🇪', '🇨🇱',
  '🇦🇺', '🇳🇿', '🇫🇯',
].map((value) => ({ kind: 'emoji', value }))
