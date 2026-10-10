import { player } from '../entities/playerState'
import { R, angleBetween } from '../lib/sphere'
import { paperItems, type PaperItem } from './items'
import type { PaperEntry } from './types'

// What can be tapped, looked at and carried: everything with a character of its own. Tufts of grass, ferns and lily pads are
// scenery, so they are left out (they would only ever be "the nearest thing" by accident).
const SCENERY = new Set(['grass', 'fern', 'lilypad', 'reeds'])
export const tappable = (e: PaperEntry) => !SCENERY.has(e.kind)

// The nearest thing the kid could look at, within a few steps. Bigger things are noticed from a little farther away.
export function nearestPaperItem(): string | null {
  let best: PaperItem | null = null, bd = Infinity
  for (const it of paperItems.values()) {
    it.near = false
    if (it.uid === 'player' || it.hidden || !tappable(it.entry)) continue
    const d = angleBetween(player.dir, it.dir) * R - it.entry.size * it.scale * 0.35
    if (d < 3.2 && d < bd) { bd = d; best = it }
  }
  if (best) best.near = true
  return best ? best.uid : null
}
