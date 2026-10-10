import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Euler, ExtrudeGeometry,
  IcosahedronGeometry, Matrix4, OctahedronGeometry, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector3,
  type ColorRepresentation,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { hash3f } from './rng'

export type V3 = [number, number, number]

export interface PartOpts {
  p?: V3; r?: V3; s?: number | V3 // position, rotation (radians, XYZ), scale
  outline?: number // thickness of the dark back-face hull, in the part's own units
  jitter?: number // vertex wobble for a hand-cut look
  shade?: number // per-facet brightness variation (default .06)
  faceColor?: (n: Vector3) => ColorRepresentation // color by face normal, e.g. moss on top of rocks
}

const _m = new Matrix4(), _q = new Quaternion(), _e = new Euler(), _p = new Vector3(), _s = new Vector3(), _v = new Vector3()
const _a = new Vector3(), _b = new Vector3(), _n = new Vector3(), _c = new Color()

// Collects primitives into one flat-shaded, vertex-colored geometry (and a matching inflated hull for outlines).
// One Kit per object type keeps the draw count tiny: a whole tree, barn or sheep is a single mesh.
export class Kit {
  private body: BufferGeometry[] = []
  private hull: BufferGeometry[] = []
  private seed: number
  constructor(seed = 1) { this.seed = seed * 101 }

  add(geo: BufferGeometry, color: ColorRepresentation, o: PartOpts = {}) {
    const src = geo.index ? geo.toNonIndexed() : geo
    const pos = Float32Array.from(src.getAttribute('position').array as ArrayLike<number>)
    if (src !== geo) src.dispose()
    geo.dispose()
    const seed = this.seed++

    if (o.jitter) {
      for (let i = 0; i < pos.length; i += 3) {
        // keyed on the (rounded) position so vertices that coincide move together and the surface stays closed
        const [a, b, c] = hash3f(Math.round(pos[i] * 1e3) / 1e3, Math.round(pos[i + 1] * 1e3) / 1e3, Math.round(pos[i + 2] * 1e3) / 1e3, seed)
        pos[i] += (a - 0.5) * 2 * o.jitter
        pos[i + 1] += (b - 0.5) * 2 * o.jitter
        pos[i + 2] += (c - 0.5) * 2 * o.jitter
      }
    }

    let hullPos: Float32Array | null = null
    if (o.outline) {
      let rad = 0
      for (let i = 0; i < pos.length; i += 3) rad = Math.max(rad, Math.hypot(pos[i], pos[i + 1], pos[i + 2]))
      const k = 1 + o.outline / Math.max(rad, 1e-3)
      hullPos = pos.map((x) => x * k)
    }

    const [px, py, pz] = o.p ?? [0, 0, 0]
    const [rx, ry, rz] = o.r ?? [0, 0, 0]
    const sc: V3 = o.s === undefined ? [1, 1, 1] : typeof o.s === 'number' ? [o.s, o.s, o.s] : o.s
    _m.compose(_p.set(px, py, pz), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sc[0], sc[1], sc[2]))
    const apply = (arr: Float32Array) => {
      for (let i = 0; i < arr.length; i += 3) {
        _v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(_m)
        arr[i] = _v.x; arr[i + 1] = _v.y; arr[i + 2] = _v.z
      }
    }
    apply(pos)
    if (hullPos) apply(hullPos)

    const base = new Color(color)
    const shade = o.shade ?? 0.06
    const colors = new Float32Array(pos.length)
    for (let t = 0; t < pos.length; t += 9) {
      let c = base
      if (o.faceColor) {
        _a.set(pos[t + 3] - pos[t], pos[t + 4] - pos[t + 1], pos[t + 5] - pos[t + 2])
        _b.set(pos[t + 6] - pos[t], pos[t + 7] - pos[t + 1], pos[t + 8] - pos[t + 2])
        c = _c.set(o.faceColor(_n.crossVectors(_a, _b).normalize()))
      }
      const s = Math.sin((t + seed * 17) * 12.9898) * 43758.5453
      const f = 1 + (s - Math.floor(s) - 0.5) * shade
      for (let k = 0; k < 3; k++) {
        colors[t + k * 3] = c.r * f; colors[t + k * 3 + 1] = c.g * f; colors[t + k * 3 + 2] = c.b * f
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('color', new BufferAttribute(colors, 3))
    this.body.push(g)
    if (hullPos) {
      const h = new BufferGeometry()
      h.setAttribute('position', new BufferAttribute(hullPos, 3))
      this.hull.push(h)
    }
    return this
  }

  build() {
    const body = mergeGeometries(this.body, false)!
    body.computeVertexNormals() // non-indexed, so these are flat facet normals
    const hull = this.hull.length ? mergeGeometries(this.hull, false)! : null
    this.body.forEach((g) => g.dispose())
    this.hull.forEach((g) => g.dispose())
    return { body, hull }
  }
}

export type Built = ReturnType<Kit['build']>

// Primitive shortcuts, all centered on the origin
export const P = {
  box: (w: number, h: number, d: number) => new BoxGeometry(w, h, d),
  cyl: (rTop: number, rBottom: number, h: number, seg = 6) => new CylinderGeometry(rTop, rBottom, h, seg, 1),
  cone: (r: number, h: number, seg = 6) => new ConeGeometry(r, h, seg, 1),
  ico: (r: number, detail = 1) => new IcosahedronGeometry(r, detail),
  dodeca: (r: number) => new DodecahedronGeometry(r, 0),
  octa: (r: number) => new OctahedronGeometry(r, 0),
  sphere: (r: number, w = 8, h = 6) => new SphereGeometry(r, w, h),
  torus: (r: number, tube: number, radial = 5, tubular = 16, arc = Math.PI * 2) => new TorusGeometry(r, tube, radial, tubular, arc),
  // triangular roof: ridge runs along Z
  prism: (w: number, h: number, d: number) => {
    const s = new Shape()
    s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(0, h / 2); s.closePath()
    const g = new ExtrudeGeometry(s, { depth: d, bevelEnabled: false })
    g.translate(0, 0, -d / 2)
    return g
  },
}
