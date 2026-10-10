import type { Vector3 } from 'three'
import { R, WATER_R } from '../lib/sphere'
import { getWorld } from './layout'
import { surfaceRadius } from './terrain'

// Things that move (easels, for now) register a circle here so walkers go around them
export const dynamicObstacles = new Map<string, { d: Vector3; r: number }>()

// Is a circle of radius `r` (world units) at `d` touching a tree, rock, building or easel?
export function blockedAt(d: Vector3, r = 0.25, ignore?: string) {
  for (const o of getWorld().obstacles) {
    const lim = (o.r + r) / R
    if (2 - 2 * d.dot(o.d) < lim * lim) return true
  }
  for (const [id, o] of dynamicObstacles) {
    if (id === ignore) continue
    const lim = (o.r + r) / R
    if (2 - 2 * d.dot(o.d) < lim * lim) return true
  }
  return false
}

// Is the step `from` -> `to` stopped by something solid? Only if it goes deeper into an obstacle: anything that already
// overlaps (a spawn point, an easel dropped next to you) can always walk away, so nobody is ever stuck.
export function stepBlocked(from: Vector3, to: Vector3, r = 0.25, ignore?: string) {
  const deeper = (o: { d: Vector3; r: number }) => {
    const lim = (o.r + r) / R
    const dTo = 2 - 2 * to.dot(o.d)
    return dTo < lim * lim && dTo < 2 - 2 * from.dot(o.d)
  }
  for (const o of getWorld().obstacles) if (deeper(o)) return true
  for (const [id, o] of dynamicObstacles) if (id !== ignore && deeper(o)) return true
  return false
}

export const onLand = (d: Vector3, margin = 0.12) => surfaceRadius(d) > WATER_R + margin
export const inWater = (d: Vector3, margin = 0.3) => surfaceRadius(d) < WATER_R - margin
