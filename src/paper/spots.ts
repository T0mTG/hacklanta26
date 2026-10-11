import { Vector3 } from 'three'
import { rng } from '../lib/rng'
import { angleBetween, fibonacciSphere, offsetDir } from '../lib/sphere'
import { blockedAt, onLand } from '../world/collide'
import { isLand, slopeAt } from '../world/terrain'
import { paperItems } from './items'

// Room for new things. The world is full, but it is meant to be full of trees, houses and rocks you walk around, with open lawn
// between them: a new element from the kid's drawing needs a bit of free ground, the same way an easel did on the Toy Globe.

// Is there room for something with this radius at `d`? Solid things block; flowers and grass do not.
export function roomAt(d: Vector3, radius: number, ignoreUid?: string) {
  return isLand(d, 0.45) && slopeAt(d) < 0.4 && !blockedAt(d, radius + 0.15, ignoreUid)
}

// The nearest free spot to `near`, searching in widening rings. Returns null only if the whole planet is full.
export function findPaperSpot(near: Vector3, radius = 0.5, o: { ignoreUid?: string; avoid?: Vector3[]; avoidGap?: number } = {}) {
  const rand = rng(Math.floor(Math.abs(near.x * 977 + near.y * 613 + near.z * 331)))
  const rings = [0, 0.05, 0.1, 0.16, 0.24, 0.34, 0.46, 0.6, 0.8, 1.05, 1.4, 1.9, 2.5]
  for (const radiusRad of rings) {
    const n = radiusRad === 0 ? 1 : Math.max(16, Math.round(radiusRad * 44))
    const a0 = rand() * Math.PI * 2
    for (let k = 0; k < n; k++) {
      const a = a0 + (k / n) * Math.PI * 2
      const d = offsetDir(near, Math.cos(a) * radiusRad, Math.sin(a) * radiusRad)
      if (!roomAt(d, radius, o.ignoreUid)) continue
      if ((o.avoid ?? []).some((p) => angleBetween(d, p) < (o.avoidGap ?? 0.1))) continue
      return d
    }
  }
  return null
}

// How many things of a given size could still be put down, packed one by one? The number to watch when adding trees or houses.
export function paperCapacity(gap = 0.1, clear = 0.8) {
  const pts = fibonacciSphere(9000)
  const good = pts.filter((d) => onLand(d, 0.45) && slopeAt(d) < 0.35 && !blockedAt(d, clear))
  const chosen: Vector3[] = []
  for (const d of good) if (chosen.every((c) => angleBetween(d, c) > gap)) chosen.push(d)
  return { openShare: +(good.length / pts.length).toFixed(3), capacity: chosen.length, items: paperItems.size }
}
