import { BufferAttribute, BufferGeometry, Color, IcosahedronGeometry, Vector3 } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { clamp, fbm3, noise3, smoothstep } from '../lib/rng'
import { R, WATER_R, arcDistance } from '../lib/sphere'
import { palette } from '../data/theme'
import { FIELDS, PATHS, PLAZA, REGIONS, TWIN_A, TWIN_B } from './regions'

const ang = (x: number, y: number, z: number, c: Vector3) => Math.acos(clamp(x * c.x + y * c.y + z * c.z, -1, 1))
const mask = (a: number, near: number, far: number) => 1 - smoothstep(near, far, a)

const PONDS = [
  { c: REGIONS.lily.dir, r: 0.33, depth: 1.35 },
  { c: REGIONS.duck.dir, r: 0.29, depth: 1.25 },
  { c: REGIONS.lake.dir, r: 0.55, depth: 1.75 },
]
const PEAKS = [
  { c: REGIONS.giggle.dir, r: 0.58, h: 5.8 },
  { c: TWIN_A, r: 0.34, h: 3.1 },
  { c: TWIN_B, r: 0.3, h: 2.6 },
]

// Height above the base radius for a point on the unit sphere. The one function every prop, character and camera asks.
export function heightAt(x: number, y: number, z: number) {
  const hills =
    (fbm3(x * 1.7 + 3.1, y * 1.7 + 1.3, z * 1.7 + 7.7, 3) - 0.5) * 1.15 + (fbm3(x * 5 + 9, y * 5 + 2, z * 5 + 4, 2) - 0.5) * 0.3
  const flat = Math.max(
    mask(ang(x, y, z, REGIONS.plaza.dir), 0.38, 0.62),
    mask(ang(x, y, z, REGIONS.farm.dir), 0.36, 0.56),
    mask(ang(x, y, z, REGIONS.village.dir), 0.34, 0.54),
  )
  let h = hills * (1 - 0.9 * flat)
  h += 1.05 * mask(ang(x, y, z, REGIONS.picnic.dir), 0.1, 0.42) // a plateau on top, so the picnic blanket sits flat
  for (const p of PEAKS) {
    const t = ang(x, y, z, p.c) / p.r
    if (t < 1) {
      const k = Math.pow(1 - t, 1.5)
      h += p.h * k + (fbm3(x * 7 + 2, y * 7, z * 7 + 5, 2) - 0.5) * 1.3 * k
    }
  }
  for (const p of PONDS) {
    const t = ang(x, y, z, p.c) / (p.r * (0.86 + 0.3 * noise3(x * 6 + 1, y * 6 + 4, z * 6 + 2)))
    if (t < 1) {
      const bowl = 1 - smoothstep(0.45, 1, t)
      h = h * (1 - bowl) - p.depth * bowl
    }
  }
  return h
}

// 1 right at a pond's edge, fading to 0 a few steps inland. Shore plants use this so they grow only where there is a shore:
// flat meadow sits only ~0.5 above the water level, so a plain height test would count every lawn as a beach.
export function shoreness(d: Vector3) {
  let s = 0
  for (const p of PONDS) s = Math.max(s, 1 - smoothstep(0.78, 1.25, ang(d.x, d.y, d.z, p.c) / p.r))
  return s
}

export const surfaceRadius = (d: Vector3) => R + heightAt(d.x, d.y, d.z)
export const isLand = (d: Vector3, margin = 0.18) => surfaceRadius(d) > WATER_R + margin
export function surface(d: Vector3, lift = 0, out = new Vector3()) {
  return out.copy(d).multiplyScalar(surfaceRadius(d) + lift)
}

const _e1 = new Vector3(), _e2 = new Vector3(), _s = new Vector3(), _ref = new Vector3()
// Rise over run around a point: 0.3 is a gentle hill, 0.8 is a cliff
export function slopeAt(d: Vector3, h0 = heightAt(d.x, d.y, d.z)) {
  const delta = 0.02
  _ref.set(0, 1, 0)
  if (Math.abs(d.y) > 0.9) _ref.set(1, 0, 0)
  _e1.crossVectors(d, _ref).normalize()
  _e2.crossVectors(d, _e1)
  _s.copy(d).addScaledVector(_e1, delta).normalize()
  const a = heightAt(_s.x, _s.y, _s.z) - h0
  _s.copy(d).addScaledVector(_e2, delta).normalize()
  const b = heightAt(_s.x, _s.y, _s.z) - h0
  return Math.hypot(a, b) / (delta * R)
}

const C = {
  dark: new Color(palette.grassDark), mid: new Color(palette.grass), light: new Color(palette.grassLight),
  sand: new Color(palette.sand), sandWet: new Color(palette.sandWet), dirt: new Color(palette.dirt),
  rock: new Color(palette.rock), mountain: new Color(palette.mountain), snow: new Color(palette.snow),
  seabed: new Color('#6cc2ad'), seabedDeep: new Color('#3f9c9c'),
  wheat: new Color('#e4c25c'), sunflower: new Color('#c8d86c'), lawn: new Color('#b4e07c'),
}

// Biome color for one terrain vertex (written into `out`)
export function terrainColor(d: Vector3, r: number, slope: number, out: Color) {
  const { x, y, z } = d
  const n1 = fbm3(x * 3.2 + 5, y * 3.2 + 1, z * 3.2 + 9, 3)
  const n2 = fbm3(x * 10 + 2, y * 10 + 8, z * 10 + 3, 2)
  out.copy(C.dark).lerp(C.mid, smoothstep(0.28, 0.58, n1)).lerp(C.light, smoothstep(0.62, 0.85, n2) * 0.4)

  for (const f of FIELDS) {
    if (ang(x, y, z, f.c) > 0.5) continue
    const u = x * f.e.x + y * f.e.y + z * f.e.z, v = x * f.n.x + y * f.n.y + z * f.n.z
    const m = (1 - smoothstep(f.hu * 0.75, f.hu, Math.abs(u))) * (1 - smoothstep(f.hv * 0.75, f.hv, Math.abs(v)))
    if (m > 0) out.lerp(f.kind === 'wheat' ? C.wheat : C.sunflower, m * 0.85)
  }

  const ap = ang(x, y, z, PLAZA)
  out.lerp(C.lawn, mask(ap, 0.15, 0.34) * 0.6)
  if (ap < 0.32) out.lerp(C.dirt, (1 - smoothstep(0.012, 0.03, Math.abs(ap - 0.215))) * 0.85)

  let pd = 9
  for (const [a, b] of PATHS) pd = Math.min(pd, arcDistance(d, a, b))
  pd += (noise3(x * 30, y * 30, z * 30) - 0.5) * 0.012
  out.lerp(C.dirt, (1 - smoothstep(0.018, 0.034, pd)) * 0.9)

  const alt = r - R
  out.lerp(C.mountain, Math.max(smoothstep(1.9, 3.2, alt), smoothstep(0.55, 0.9, slope)) * 0.9)
  out.lerp(C.rock, smoothstep(3.6, 4.4, alt) * 0.85)
  out.lerp(C.snow, smoothstep(4.5 + (n2 - 0.5) * 0.5, 5.1, alt))

  const above = r - WATER_R
  out.lerp(C.sand, (1 - smoothstep(0.02, 0.4, above)) * 0.95)
  if (above < 0) out.copy(C.sandWet).lerp(C.seabed, smoothstep(0, 0.35, -above)).lerp(C.seabedDeep, smoothstep(0.3, 1.2, -above))
  return out
}

function unitSphere(detail: number) {
  let g: BufferGeometry = new IcosahedronGeometry(1, detail)
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  g = mergeVertices(g, 1e-4)
  return g
}

// The planet: displaced icosphere with biome vertex colors and flat facets
export function buildPlanetGeometry(detail: number) {
  const g = unitSphere(detail)
  const pos = g.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const v = new Vector3(), c = new Color()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const h = heightAt(v.x, v.y, v.z)
    const r = R + h
    terrainColor(v, r, slopeAt(v, h), c)
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r)
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new BufferAttribute(colors, 3))
  const flat = g.toNonIndexed()
  // a whisper of per-facet brightness so the low-poly cuts read even where the color is smooth
  const col = flat.getAttribute('color') as BufferAttribute
  for (let t = 0; t < col.count / 3; t++) {
    const s = Math.sin(t * 12.9898) * 43758.5453
    const f = 1 + ((s - Math.floor(s)) - 0.5) * 0.06
    for (let k = 0; k < 3; k++) col.setXYZ(t * 3 + k, col.getX(t * 3 + k) * f, col.getY(t * 3 + k) * f, col.getZ(t * 3 + k) * f)
  }
  flat.computeVertexNormals()
  return flat
}

// Water exists only where the ground dips below WATER_R. We keep just those triangles so the foam shader gets a dense mesh
// exactly where it matters, with each vertex carrying its depth for shoreline foam and color.
export function buildWaterGeometry(detail: number) {
  const g = unitSphere(detail)
  const pos = g.getAttribute('position')
  const index = g.getIndex()!
  const v = new Vector3()
  const depth = new Float32Array(pos.count).fill(-1)
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    let near = false
    for (const p of PONDS) if (ang(v.x, v.y, v.z, p.c) < p.r * 1.45) { near = true; break }
    if (near) depth[i] = WATER_R - (R + heightAt(v.x, v.y, v.z))
    pos.setXYZ(i, v.x * WATER_R, v.y * WATER_R, v.z * WATER_R)
  }
  const keep: number[] = []
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t), b = index.getX(t + 1), c = index.getX(t + 2)
    if (Math.max(depth[a], depth[b], depth[c]) > -0.2) keep.push(a, b, c)
  }
  const position = new Float32Array(keep.length * 3), aDepth = new Float32Array(keep.length)
  keep.forEach((vi, i) => {
    position[i * 3] = pos.getX(vi); position[i * 3 + 1] = pos.getY(vi); position[i * 3 + 2] = pos.getZ(vi)
    aDepth[i] = depth[vi]
  })
  const out = new BufferGeometry()
  out.setAttribute('position', new BufferAttribute(position, 3))
  out.setAttribute('aDepth', new BufferAttribute(aDepth, 1))
  return out
}
