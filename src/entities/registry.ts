import { Vector3 } from 'three'
import type { Artwork } from '../data/types'

// Live state of one easel. The store only keeps what must be remembered (where it was left); everything that changes
// every frame lives here so React never re-renders for it.
export interface EaselRT {
  id: string
  dir: Vector3 // unit direction from the planet's center
  yaw: number
  lift: number // height above the ground (carried or falling)
  scale: number // eased: small when idle, bigger when the kid is near
  near: boolean; hover: boolean; dragging: boolean
  top: Vector3 // world position above the easel, where labels attach
  spawnAt: number // performance.now() when the drop starts, 0 for none
  landedAt: number // performance.now() when it touched down, 0 until then
  cheerUntil: number // watchers cheer until this time
}

export const easels = new Map<string, EaselRT>()

export function rtFor(art: Pick<Artwork, 'id' | 'dir' | 'yaw'>): EaselRT {
  let r = easels.get(art.id)
  if (!r) {
    r = {
      id: art.id, dir: new Vector3(...art.dir).normalize(), yaw: art.yaw, lift: 0, scale: 0.85,
      near: false, hover: false, dragging: false, top: new Vector3(), spawnAt: 0, landedAt: 0, cheerUntil: 0,
    }
    easels.set(art.id, r)
  }
  return r
}
