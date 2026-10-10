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

export const onLand = (d: Vector3, margin = 0.12) => surfaceRadius(d) > WATER_R + margin
export const inWater = (d: Vector3, margin = 0.3) => surfaceRadius(d) < WATER_R - margin
