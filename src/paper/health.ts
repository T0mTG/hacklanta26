import { R, angleBetween } from '../lib/sphere'
import { blockedAt, inWater, onLand } from '../world/collide'
import { GroundLife } from './life'
import { paperItems } from './items'
import { PaperScene } from './PaperScene'

// Dev tool: run the world for a while and look for creatures that got stuck, never moved, or ended up where they should not be
// (a sheep in the pond, a duck on the lawn, something inside a tree). `sim(seconds, hz)` steps the simulation without real time.
//   __paperHealth(120)
export function paperHealth(sim: (seconds: number, hz: number) => void, seconds = 90) {
  PaperScene.updateAll = true
  const walkers = [...paperItems.values()].filter((i) => i.life instanceof GroundLife)
  const track = walkers.map((it) => ({ it, w: (it.life as GroundLife).walker, last: it.dir.clone(), path: 0, maxStuck: 0, bad: new Set<string>() }))
  for (let s = 0; s < seconds; s++) {
    sim(1, 20)
    for (const t of track) {
      t.path += angleBetween(t.last, t.w.dir) * R
      t.last.copy(t.w.dir)
      t.maxStuck = Math.max(t.maxStuck, t.w.stuck)
      const swims = t.it.entry.behavior === 'floater'
      if (swims ? !inWater(t.w.dir, 0) : !onLand(t.w.dir, 0)) t.bad.add(swims ? 'left the water' : 'in the water')
      if (!swims && blockedAt(t.w.dir, 0)) t.bad.add('inside something solid')
    }
  }
  PaperScene.updateAll = false
  const slow = track.filter((t) => t.path < 2.5 && t.it.entry.speed > 0.15)
  return {
    seconds,
    walkers: track.length,
    barelyMoved: slow.map((t) => `${t.it.uid} ${t.it.entry.id} (${t.path.toFixed(1)} units)`),
    stuck: track.filter((t) => t.maxStuck > 2).map((t) => `${t.it.uid} ${t.it.entry.id} (${t.maxStuck.toFixed(1)} s)`),
    wrongPlace: track.filter((t) => t.bad.size).map((t) => `${t.it.uid} ${t.it.entry.id}: ${[...t.bad].join(', ')}`),
    averageDistance: +(track.reduce((a, t) => a + t.path, 0) / Math.max(1, track.length)).toFixed(1),
  }
}
