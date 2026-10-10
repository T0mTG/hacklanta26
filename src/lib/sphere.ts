import { Matrix4, Quaternion, Vector3 } from 'three'
import { clamp } from './rng'

// Planet radius and the surface of every pond. Terrain height is added to R; anything below WATER_R is under water.
export const R = 12
export const WATER_R = 11.45

const _x = new Vector3(), _axis = new Vector3(), _m = new Matrix4(), _t = new Vector3()

export function latLon(latDeg: number, lonDeg: number, out = new Vector3()) {
  const la = (latDeg * Math.PI) / 180, lo = (lonDeg * Math.PI) / 180
  return out.set(Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo))
}

// Angle between two unit vectors, in radians. On this planet 1 rad is 12 world units of walking.
export const angleBetween = (a: Vector3, b: Vector3) => Math.acos(clamp(a.dot(b), -1, 1))

// Removes the part of `v` along `up` and renormalizes: turns any vector into a heading on the ground.
export function tangentize(v: Vector3, up: Vector3) {
  v.addScaledVector(up, -v.dot(up))
  if (v.lengthSq() < 1e-8) {
    v.set(0, 1, 0).addScaledVector(up, -up.y)
    if (v.lengthSq() < 1e-8) v.set(1, 0, 0).addScaledVector(up, -up.x)
  }
  return v.normalize()
}

// Orientation whose +Y is `up` and +Z is `fwd`, so a model built facing +Z stands on the planet.
export function basisQuat(up: Vector3, fwd: Vector3, out = new Quaternion()) {
  _x.crossVectors(up, fwd).normalize()
  _m.makeBasis(_x, up, fwd)
  return out.setFromRotationMatrix(_m)
}

// Walks `pos` along its heading `fwd` by `ang` radians on a great circle. `fwd` is carried along (parallel transport),
// so there are no poles and no seams anywhere on the planet.
export function stepOnSphere(pos: Vector3, fwd: Vector3, ang: number) {
  _axis.crossVectors(pos, fwd)
  if (_axis.lengthSq() < 1e-10) return
  _axis.normalize()
  pos.applyAxisAngle(_axis, ang)
  fwd.applyAxisAngle(_axis, ang)
}

// Spherical interpolation of two unit vectors
export function slerpDir(a: Vector3, b: Vector3, t: number, out: Vector3) {
  const d = clamp(a.dot(b), -1, 1)
  const th = Math.acos(d)
  if (th < 1e-5) return out.copy(b)
  _t.copy(b).addScaledVector(a, -d)
  if (_t.lengthSq() < 1e-10) _t.set(0, 1, 0).addScaledVector(a, -a.y).normalize()
  else _t.normalize()
  return out.copy(a).multiplyScalar(Math.cos(th * t)).addScaledVector(_t, Math.sin(th * t))
}

// Local east/north frame at a point (north is toward +Y where possible)
export function frameAt(c: Vector3) {
  const e = new Vector3(0, 1, 0).cross(c)
  if (e.lengthSq() < 1e-8) e.set(1, 0, 0)
  e.normalize()
  const n = new Vector3().crossVectors(c, e).normalize()
  return { e, n }
}

// Point `u` radians east and `v` radians north of `c` (exact on the sphere)
export function offsetDir(c: Vector3, u: number, v: number, out = new Vector3(), frame = frameAt(c)) {
  const d = Math.hypot(u, v)
  if (d < 1e-9) return out.copy(c)
  return out
    .copy(c).multiplyScalar(Math.cos(d))
    .addScaledVector(frame.e, (u / d) * Math.sin(d))
    .addScaledVector(frame.n, (v / d) * Math.sin(d))
    .normalize()
}

// Distance in radians from `p` to the great-circle arc a-b
export function arcDistance(p: Vector3, a: Vector3, b: Vector3) {
  const n = _axis.crossVectors(a, b)
  if (n.lengthSq() < 1e-10) return angleBetween(p, a)
  n.normalize()
  const side = p.dot(n)
  _t.copy(p).addScaledVector(n, -side)
  const l = _t.length()
  if (l > 1e-8) {
    _t.multiplyScalar(1 / l)
    // projected point lies between a and b when it is on the correct side of both endpoints
    const sa = _x.crossVectors(a, _t).dot(n), sb = _x.crossVectors(_t, b).dot(n)
    if (sa >= 0 && sb >= 0) return Math.asin(clamp(Math.abs(side), 0, 1))
  }
  return Math.min(angleBetween(p, a), angleBetween(p, b))
}

// Evenly spread points over the sphere
export function fibonacciSphere(n: number) {
  const pts: Vector3[] = []
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2
    const r = Math.sqrt(1 - y * y)
    pts.push(new Vector3(Math.cos(ga * i) * r, y, Math.sin(ga * i) * r))
  }
  return pts
}
