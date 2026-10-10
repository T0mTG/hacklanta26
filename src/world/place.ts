import { Color, Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'
import { basisQuat, tangentize } from '../lib/sphere'
import type { Built } from '../lib/kit'
import { MAT } from './materials'
import { surfaceRadius } from './terrain'

export interface Spot { dir: Vector3; yaw: number; scale: number; tint: number }

const _n = new Vector3(), _t = new Vector3(), _c = new Vector3(), _f = new Vector3(), _q = new Quaternion(), _p = new Vector3(), _s = new Vector3()

export function northAt(d: Vector3, out = new Vector3()) {
  out.set(0, 1, 0)
  if (Math.abs(d.y) > 0.95) out.set(1, 0, 0)
  return tangentize(out, d)
}

// Heading (radians, 0 = north, positive turns toward the west) that points from one spot toward another
export function yawToward(from: Vector3, to: Vector3) {
  northAt(from, _n)
  _t.copy(to).addScaledVector(from, -to.dot(from))
  if (_t.lengthSq() < 1e-10) return 0
  _t.normalize()
  return Math.atan2(from.dot(_c.crossVectors(_n, _t)), _n.dot(_t))
}

// Orientation standing on the planet at `dir`, facing `yaw`
export function frameFor(dir: Vector3, yaw: number, out = new Quaternion()) {
  northAt(dir, _f).applyAxisAngle(dir, yaw)
  return basisQuat(dir, _f, out)
}

export function placeMatrix(dir: Vector3, yaw = 0, scale: number | [number, number, number] = 1, lift = 0, out = new Matrix4(), radius?: number) {
  frameFor(dir, yaw, _q)
  _p.copy(dir).multiplyScalar((radius ?? surfaceRadius(dir)) + lift)
  if (typeof scale === 'number') _s.set(scale, scale, scale)
  else _s.set(scale[0], scale[1], scale[2])
  return out.compose(_p, _q, _s)
}

interface InstanceOpts {
  shadow?: boolean // cast shadows (small plants skip it to keep the shadow pass cheap)
  lift?: number // raise above the ground
  radius?: number // use a fixed radius instead of the terrain, e.g. WATER_R for lily pads
  color?: (s: Spot) => Color // per-instance color, multiplies the vertex colors; default is a gray tint for variety
}

// One InstancedMesh for the body plus one for the outline hull, sharing the same instance matrices
export function instancedGroup(built: Built, spots: Spot[], opts: InstanceOpts = {}) {
  const g = new Group()
  if (!spots.length) return g
  const m = new Matrix4(), col = new Color()
  const make = (geo: Built['body'], mat: typeof MAT.body | typeof MAT.hull, cast: boolean, tint: boolean) => {
    const im = new InstancedMesh(geo, mat, spots.length)
    spots.forEach((s, i) => {
      placeMatrix(s.dir, s.yaw, s.scale, opts.lift ?? 0, m, opts.radius)
      im.setMatrixAt(i, m)
      if (tint) im.setColorAt(i, opts.color ? opts.color(s) : col.setScalar(s.tint))
    })
    im.instanceMatrix.needsUpdate = true
    im.frustumCulled = false // instances cover the whole planet; the base geometry's bounds would wrongly cull them
    im.castShadow = cast
    im.receiveShadow = true
    return im
  }
  g.add(make(built.body, MAT.body, opts.shadow ?? true, true))
  if (built.hull) g.add(make(built.hull, MAT.hull, false, false))
  return g
}
