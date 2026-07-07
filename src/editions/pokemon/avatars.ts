import type { PlayerAvatar } from '../../types'
import { EMOJI_AVATARS } from '../../avatars'
import pokemon from './data/pokemon.json'

const base = import.meta.env.BASE_URL

// The creator photos are Pokemon-space people, so they belong to this edition's
// set, not the platform's. The files live with the other edition assets.
const CREATORS: PlayerAvatar[] = [
  { kind: 'image', src: `${base}editions/pokemon/avatars/zanegames.jpg`, label: 'ZaneGames' },
  { kind: 'image', src: `${base}editions/pokemon/avatars/peebr.jpg`, label: 'Peebr' },
  { kind: 'image', src: `${base}editions/pokemon/avatars/cush.jpg`, label: 'Cush' },
  { kind: 'image', src: `${base}editions/pokemon/avatars/bailey.jpg`, label: 'Bailey' },
  { kind: 'image', src: `${base}editions/pokemon/avatars/chrispiche.jpg`, label: 'Chris Piché' },
  { kind: 'image', src: `${base}editions/pokemon/avatars/deliciousjames.jpg`, label: 'Delicious James' },
  { kind: 'image', src: `${base}editions/pokemon/avatars/scarecrow.jpg`, label: 'Scarecrow' },
]

// A handful of recognizable mascots. The full sprite set is bundled in
// public/editions/pokemon/sprites; this is just the picker subset. Each carries
// its measured artwork box from the edition data, so small mascots render at
// the same visual size as big ones instead of a flat crop.
const boxByDex = new Map(pokemon.map((p) => [p.dexNumber, p.box]))
const MASCOTS: PlayerAvatar[] = (
  [
    [1, 'Bulbasaur'],
    [3, 'Venusaur'],
    [4, 'Charmander'],
    [6, 'Charizard'],
    [7, 'Squirtle'],
    [9, 'Blastoise'],
    [25, 'Pikachu'],
    [39, 'Jigglypuff'],
    [94, 'Gengar'],
    [133, 'Eevee'],
    [143, 'Snorlax'],
    [150, 'Mewtwo'],
    [155, 'Cyndaquil'],
    [196, 'Espeon'],
    [197, 'Umbreon'],
    [390, 'Chimchar'],
    [393, 'Piplup'],
    [724, 'Decidueye'],
    [448, 'Lucario'],
    [573, 'Cinccino'],
    [658, 'Greninja'],
    [680, 'Doublade'],
    [909, 'Fuecoco']
  ] as [number, string][]
).map(([dex, label]) => ({
  kind: 'image',
  src: `${base}editions/pokemon/sprites/${dex}.png`,
  label,
  box: boxByDex.get(dex),
  bare: true,
}))

// The same spread the picker has always shown: neutral emoji, then the
// creators, then the mascots.
export const AVATARS: PlayerAvatar[] = [...EMOJI_AVATARS, ...CREATORS, ...MASCOTS]
