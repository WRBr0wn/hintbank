import type { Edition } from '../editions'
import tiles from './EditionTiles.module.css'

// The inside of an edition tile, shared by the main menu (buttons) and the
// randomizer selector (links) so the cover composition cannot drift between
// them. The wrapper element and its behavior stay with the caller.
export default function EditionTileBody({ edition }: { edition: Edition }) {
  return (
    <>
      <span className={tiles.art} aria-hidden="true">
        {edition.look?.icon ? (
          <img className={tiles.icon} src={import.meta.env.BASE_URL + edition.look.icon} alt="" />
        ) : (
          <span className={tiles.monogram}>{edition.displayName[0]}</span>
        )}
      </span>
      <span className={tiles.name}>
        {edition.displayName}
        {edition.status !== 'live' && <span className={tiles.soon}>soon</span>}
      </span>
      <span className={tiles.tagline}>{edition.tagline}</span>
    </>
  )
}
