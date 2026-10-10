import { Vector3 } from 'three'
import { LITE } from '../lib/env'
import { clamp, fbm3, lerp, rng, smoothstep } from '../lib/rng'
import { R, WATER_R, angleBetween, arcDistance, fibonacciSphere, offsetDir } from '../lib/sphere'
import { FIELDS, PATHS, PLAZA, REGIONS, type RegionId } from './regions'
import { heightAt, shoreness, slopeAt } from './terrain'
import { yawToward, type Spot } from './place'

export type TreeKind = 'round' | 'pine' | 'bonsai' | 'cherry' | 'autumn'
export interface TreeSpot extends Spot { kind: TreeKind }
export interface FlowerSpot extends Spot { hue: number }
export type StructureKind = 'cottage' | 'barn' | 'windmill' | 'bench' | 'sign' | 'haystack' | 'tractor' | 'well' | 'boat' | 'sailboat' | 'blanket' | 'rainbow'
export interface Structure { kind: StructureKind; dir: Vector3; yaw: number; scale: number; variant: number; onWater?: boolean }
// A solid circle on the ground: `r` is in world units
export interface Obstacle { d: Vector3; r: number }

export interface World {
  trees: TreeSpot[]; bushes: Spot[]; rocks: Spot[]; flowers: FlowerSpot[]; tufts: Spot[]
  wheat: Spot[]; sunflowers: Spot[]; mushrooms: Spot[]; lilies: Spot[]; lotus: Spot[]; fence: Spot[]
  structures: Structure[]
  obstacles: Obstacle[] // things the kid and the animals cannot walk through
}

export const FLOWER_COLORS = ['#f6a6b8', '#fbf5e6', '#f2c14e', '#c9b6f2', '#9ad4f5', '#ee6c4d']

const mask = (a: number, near: number, far: number) => 1 - smoothstep(near, far, a)

export function pathDist(d: Vector3) {
  let pd = 9
  for (const [a, b] of PATHS) pd = Math.min(pd, arcDistance(d, a, b))
  return pd
}

function inField(d: Vector3, margin: number) {
  for (const f of FIELDS) {
    if (angleBetween(d, f.c) > 0.5) continue
    const u = d.dot(f.e), v = d.dot(f.n)
    if (Math.abs(u) < f.hu + margin && Math.abs(v) < f.hv + margin) return true
  }
  return false
}

function generate(): World {
  const rand = rng(20261010)
  const K = LITE ? 0.55 : 1
  const hard: Obstacle[] = [] // blocks walking
  const soft: Obstacle[] = [] // only keeps plants and props from overlapping
  const blocked = (d: Vector3, r: number) => {
    for (const list of [hard, soft]) {
      for (const o of list) {
        const lim = (o.r + r) / R
        if (2 - 2 * d.dot(o.d) < lim * lim) return true
      }
    }
    return false
  }
  const jitter = (d: Vector3, amt: number) => d.set(d.x + (rand() - 0.5) * amt, d.y + (rand() - 0.5) * amt, d.z + (rand() - 0.5) * amt).normalize()

  // ---------- structures ----------
  const structures: Structure[] = []
  const put = (
    reg: RegionId, u: number, v: number, kind: StructureKind, r: number,
    o: { face?: Vector3; yaw?: number; scale?: number; variant?: number; onWater?: boolean; keep?: number } = {},
  ) => {
    const dir = offsetDir(REGIONS[reg].dir, u, v)
    const yaw = o.yaw ?? yawToward(dir, o.face ?? REGIONS[reg].dir)
    structures.push({ kind, dir, yaw, scale: o.scale ?? 1, variant: o.variant ?? 0, onWater: o.onWater })
    if (r > 0) hard.push({ d: dir, r })
    if (o.keep) soft.push({ d: dir, r: o.keep })
    return dir
  }
  const south = (reg: RegionId, u: number, v: number) => offsetDir(REGIONS[reg].dir, u, v - 0.6)

  put('plaza', 0.09, -0.2, 'sign', 0.5, { face: offsetDir(PLAZA, 0.09, -0.6) })
  put('plaza', -0.25, 0.04, 'bench', 0.8)
  put('plaza', 0.25, 0.04, 'bench', 0.8)
  put('plaza', 0.0, 0.27, 'bench', 0.8)

  put('farm', -0.05, -0.04, 'barn', 2.3, { face: south('farm', -0.05, -0.04), keep: 3 })
  put('farm', 0.34, -0.04, 'windmill', 1.3, { keep: 2.2 })
  put('farm', -0.2, 0.1, 'haystack', 0.8)
  put('farm', -0.16, 0.17, 'haystack', 0.8, { variant: 1 })
  put('farm', 0.02, -0.25, 'tractor', 1.1, { yaw: 1.2 })

  put('village', -0.17, 0.09, 'cottage', 1.6, { variant: 0, keep: 2.4 })
  put('village', 0.16, 0.12, 'cottage', 1.6, { variant: 1, keep: 2.4 })
  put('village', 0.0, -0.18, 'cottage', 1.6, { variant: 2, keep: 2.4 })
  put('village', 0.0, 0.0, 'well', 0.8)

  put('picnic', 0.03, -0.03, 'blanket', 0, { yaw: 0.5, keep: 2.2 })
  // a rainbow gate over the path that leads to the pond
  put('lily', -0.37, 0.0, 'rainbow', 0, { face: PLAZA, keep: 1.8 })
  put('duck', 0.02, 0.0, 'boat', 0, { yaw: 0.8, onWater: true })
  put('lake', 0.05, -0.05, 'sailboat', 0, { yaw: -0.6, onWater: true })

  // ---------- fence around the paddock ----------
  const fence: Spot[] = []
  {
    const c = offsetDir(REGIONS.farm.dir, 0.2, -0.14)
    const hu = 0.13, hv = 0.09, step = 0.05
    const add = (u: number, v: number, yaw: number) => fence.push({ dir: offsetDir(c, u, v), yaw, scale: 1, tint: 1 })
    for (let u = -hu; u <= hu + 1e-6; u += step) { add(u, -hv, Math.PI / 2); add(u, hv, Math.PI / 2) }
    for (let v = -hv + step; v < hv - 1e-6; v += step) { if (Math.abs(v) > 0.03) add(-hu, v, 0); add(hu, v, 0) }
  }

  // ---------- trees ----------
  const trees: TreeSpot[] = []
  const planted: { d: Vector3; cos: number }[] = []
  const plant = (t: TreeSpot, minD: number) => {
    trees.push(t)
    planted.push({ d: t.dir, cos: Math.cos(minD) })
    hard.push({ d: t.dir, r: 0.34 * t.scale })
  }
  plant({ kind: 'round', dir: offsetDir(REGIONS.picnic.dir, -0.12, 0.07), yaw: 0.3, scale: 1.8, tint: 1 }, 0.2)

  // How much a spot should stay open lawn: the plaza and every pond, farm, village, meadow and the picnic hill keep a clearing
  // around them, so there is always room to put a drawing down. Real forest is left to the pine woods, the cherry grove and the hills.
  const openness = (d: Vector3) =>
    Math.max(
      mask(angleBetween(d, REGIONS.farm.dir), 0.28, 0.44), mask(angleBetween(d, REGIONS.village.dir), 0.26, 0.42),
      mask(angleBetween(d, REGIONS.meadow.dir), 0.3, 0.5), mask(angleBetween(d, REGIONS.picnic.dir), 0.2, 0.36),
      mask(angleBetween(d, REGIONS.lily.dir), 0.36, 0.5), mask(angleBetween(d, REGIONS.duck.dir), 0.36, 0.5),
      mask(angleBetween(d, REGIONS.lake.dir), 0.42, 0.58),
    )

  for (const p0 of fibonacciSphere(Math.round(13000 * K))) {
    const d = jitter(p0.clone(), 0.02)
    const h = heightAt(d.x, d.y, d.z)
    const above = R + h - WATER_R
    if (above < 0.3) continue
    if (slopeAt(d, h) > 0.66) continue
    const aPlaza = angleBetween(d, PLAZA)
    if (aPlaza < 0.34 || pathDist(d) < 0.06 || inField(d, 0.03)) continue
    const wPines = mask(angleBetween(d, REGIONS.pines.dir), 0.14, 0.5)
    const wCherry = mask(angleBetween(d, REGIONS.cherry.dir), 0.12, 0.46)
    const wMtn = Math.max(mask(angleBetween(d, REGIONS.giggle.dir), 0.3, 0.6), mask(angleBetween(d, REGIONS.twins.dir), 0.2, 0.5)) * (1 - smoothstep(3.0, 4.2, h))
    const wRing = smoothstep(0.34, 0.4, aPlaza) * (1 - smoothstep(0.42, 0.55, aPlaza))
    const shore = shoreness(d)
    const cluster = smoothstep(0.38, 0.6, fbm3(d.x * 2.6 + 11, d.y * 2.6 + 3, d.z * 2.6 + 6, 3))
    // lone trees come in small clumps with big gaps between; woods are nearly continuous with only a few clearings
    const grove = Math.max(wPines, wCherry, wMtn)
    // low ground right at the water is for sand and reeds; woods may creep a little closer than lone trees
    if (above < lerp(0.42, 0.3, grove)) continue
    const patch = lerp(0.2 + 0.8 * cluster, 0.72 + 0.28 * cluster, smoothstep(0.15, 0.6, grove))
    const p = clamp(0.035 + 1.3 * wPines + 1.3 * wCherry + 0.7 * wMtn + 0.1 * wRing + 0.2 * shore) * patch * (1 - 0.9 * openness(d))
    if (rand() > p) continue
    // lone trees stand well apart; trees in a grove crowd together
    const minD = lerp(0.17, 0.088, smoothstep(0.1, 0.6, Math.max(wPines, wCherry, wMtn * 0.8)))
    const c = Math.cos(minD)
    if (planted.some((q) => d.dot(q.d) > Math.min(c, q.cos)) || blocked(d, 0.7)) continue
    let kind: TreeKind = 'round'
    if (wPines > 0.35 || (wMtn > 0.2 && h > 0.8)) kind = 'pine'
    else if (wCherry > 0.35) kind = rand() < 0.85 ? 'cherry' : 'round'
    else if (shore > 0.45 && rand() < 0.5) kind = 'bonsai'
    else if (wRing > 0.3) kind = rand() < 0.55 ? 'cherry' : 'round'
    else if (rand() < 0.12) kind = 'autumn'
    const scale = (kind === 'pine' ? 0.9 : 0.8) + rand() * 0.55
    plant({ kind, dir: d, yaw: rand() * Math.PI * 2, scale, tint: 0.88 + rand() * 0.24 }, minD)
  }

  // ---------- bushes (walk-through) ----------
  // Undergrowth lives at the foot of trees, so meadows stay clear and groves feel like groves.
  const bushes: Spot[] = []
  for (const t of trees) {
    if (t.kind === 'bonsai' || rand() > (t.kind === 'pine' || t.kind === 'cherry' ? 0.9 : 0.45)) continue
    // a few tries around the trunk, so even a tight wood gets some undergrowth
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2, rr = 0.07 + rand() * 0.05
      const d = offsetDir(t.dir, Math.cos(a) * rr, Math.sin(a) * rr)
      const h = heightAt(d.x, d.y, d.z)
      if (R + h - WATER_R < 0.4 || slopeAt(d, h) > 0.6 || h > 3.2) continue
      if (angleBetween(d, PLAZA) < 0.34 || pathDist(d) < 0.05 || inField(d, 0.03)) continue
      if (bushes.some((q) => d.dot(q.dir) > 0.9982) || blocked(d, 0.3)) continue
      soft.push({ d, r: 0.3 })
      bushes.push({ dir: d, yaw: rand() * 6.28, scale: 0.7 + rand() * 0.8, tint: 0.88 + rand() * 0.24 })
      break
    }
  }

  // ---------- rocks ----------
  const rocks: Spot[] = []
  for (const p0 of fibonacciSphere(Math.round(5000 * K))) {
    const d = jitter(p0.clone(), 0.03)
    const h = heightAt(d.x, d.y, d.z)
    const above = R + h - WATER_R
    if (above < 0.3 || angleBetween(d, PLAZA) < 0.34 || pathDist(d) < 0.04 || inField(d, 0.02)) continue
    const slope = slopeAt(d, h)
    const wMtn = Math.max(mask(angleBetween(d, REGIONS.giggle.dir), 0.2, 0.62), mask(angleBetween(d, REGIONS.twins.dir), 0.1, 0.55))
    const p = 0.004 + 0.13 * wMtn + 0.08 * smoothstep(0.35, 0.7, slope) + 0.05 * shoreness(d)
    if (rand() > p || blocked(d, 0.7)) continue
    const scale = 0.4 + rand() * rand() * 1.0 + wMtn * 0.45
    hard.push({ d, r: 0.5 * scale })
    rocks.push({ dir: d, yaw: rand() * 6.28, scale, tint: 0.9 + rand() * 0.2 })
  }

  // ---------- crops ----------
  const wheat: Spot[] = [], sunflowers: Spot[] = []
  for (const f of FIELDS) {
    const step = (f.kind === 'wheat' ? 0.0078 : 0.034) * (LITE ? 1.35 : 1)
    for (let u = -f.hu; u <= f.hu; u += step) {
      for (let v = -f.hv; v <= f.hv; v += step) {
        const edge = Math.max(Math.abs(u) / f.hu, Math.abs(v) / f.hv)
        if (edge > 0.82 && rand() < (edge - 0.82) * 4) continue
        const d = offsetDir(f.c, u + (rand() - 0.5) * step * 0.9, v + (rand() - 0.5) * step * 0.9, new Vector3(), f)
        if (R + heightAt(d.x, d.y, d.z) - WATER_R < 0.35 || pathDist(d) < 0.036 || blocked(d, 0.2)) continue
        const s: Spot = { dir: d, yaw: rand() * 6.28, scale: 0.8 + rand() * 0.5, tint: 0.88 + rand() * 0.24 }
        ;(f.kind === 'wheat' ? wheat : sunflowers).push(s)
      }
    }
  }

  // ---------- flowers, grass tufts, mushrooms ----------
  const flowers: FlowerSpot[] = []
  for (const p0 of fibonacciSphere(Math.round(24000 * K))) {
    const d = jitter(p0.clone(), 0.02)
    const h = heightAt(d.x, d.y, d.z)
    const above = R + h - WATER_R
    if (above < 0.45 || h > 2.4) continue
    const aPlaza = angleBetween(d, PLAZA)
    const p = 0.06 + 0.7 * mask(angleBetween(d, REGIONS.meadow.dir), 0.1, 0.5) + 0.5 * smoothstep(0.2, 0.3, aPlaza) * (1 - smoothstep(0.32, 0.5, aPlaza)) +
      0.2 * (1 - smoothstep(0.55, 1.6, above)) + 0.3 * mask(angleBetween(d, REGIONS.picnic.dir), 0.1, 0.4)
    if (rand() > p || slopeAt(d, h) > 0.55 || pathDist(d) < 0.036 || inField(d, 0.01) || blocked(d, 0.18)) continue
    flowers.push({ dir: d, yaw: rand() * 6.28, scale: 0.8 + rand() * 0.6, tint: 1, hue: Math.floor(rand() * FLOWER_COLORS.length) })
  }

  const tufts: Spot[] = []
  for (const p0 of fibonacciSphere(Math.round(6500 * K))) {
    const d = jitter(p0.clone(), 0.03)
    const h = heightAt(d.x, d.y, d.z)
    if (R + h - WATER_R < 0.42 || h > 2.6) continue
    const cluster = smoothstep(0.3, 0.7, fbm3(d.x * 4 + 3, d.y * 4 + 7, d.z * 4 + 5, 2))
    if (rand() > 0.25 + 0.6 * cluster || pathDist(d) < 0.034 || inField(d, 0) || blocked(d, 0.12)) continue
    tufts.push({ dir: d, yaw: rand() * 6.28, scale: 0.7 + rand() * 0.8, tint: 0.85 + rand() * 0.3 })
  }

  const mushrooms: Spot[] = []
  const shroomTrees = trees.filter((t) => t.kind === 'pine' || t.kind === 'cherry')
  for (let i = 0; i < Math.round(60 * K) && shroomTrees.length; i++) {
    const t = shroomTrees[Math.floor(rand() * shroomTrees.length)]
    const a = rand() * 6.28, rad = 0.035 + rand() * 0.03
    const d = offsetDir(t.dir, Math.cos(a) * rad, Math.sin(a) * rad)
    if (R + heightAt(d.x, d.y, d.z) - WATER_R < 0.5 || pathDist(d) < 0.04 || blocked(d, 0.25)) continue
    mushrooms.push({ dir: d, yaw: rand() * 6.28, scale: 0.7 + rand() * 0.7, tint: 1 })
  }

  // ---------- lily pads ----------
  const lilies: Spot[] = [], lotus: Spot[] = []
  const pondIds: RegionId[] = ['lily', 'duck', 'lake']
  const perPond: Record<string, number> = {}
  for (const p0 of fibonacciSphere(Math.round(12000 * K))) {
    const d = p0.clone()
    const id = pondIds.find((i) => angleBetween(d, REGIONS[i].dir) < 0.45)
    if (!id || (perPond[id] ?? 0) >= (id === 'lake' ? 12 : 9)) continue
    const depth = WATER_R - (R + heightAt(d.x, d.y, d.z))
    if (depth < 0.3 || depth > 1.0 || rand() > 0.1) continue
    if (lilies.some((l) => d.dot(l.dir) > 0.9975)) continue
    const pad: Spot = { dir: d, yaw: rand() * 6.28, scale: 0.7 + rand() * 0.5, tint: 0.92 + rand() * 0.16 }
    lilies.push(pad)
    if (rand() < 0.45) lotus.push(pad)
    perPond[id] = (perPond[id] ?? 0) + 1
  }

  if (import.meta.env.DEV) {
    console.info(`[world] trees ${trees.length}, bushes ${bushes.length}, rocks ${rocks.length}, flowers ${flowers.length}, tufts ${tufts.length}, wheat ${wheat.length}, sunflowers ${sunflowers.length}, mushrooms ${mushrooms.length}, lilies ${lilies.length}`)
  }
  return { trees, bushes, rocks, flowers, tufts, wheat, sunflowers, mushrooms, lilies, lotus, fence, structures, obstacles: hard }
}

let cache: World | null = null
export const getWorld = () => (cache ??= generate())
