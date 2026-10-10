import { BufferAttribute, BufferGeometry, Color } from 'three'
import { rng } from '../lib/rng'
import type { PaperEntry } from './types'

// Vertex layout of every paper mesh:
//   position, normal, uv (the picture), color (paper edge, cardboard, plain backs; white on picture faces)
//   aInfo = u, v (where this vertex sits on its card, 0..1, v up), solid (0 picture, 1 plain paper, 2 picture shape in plain color), card angle
// The shader bends and sways cards from u, v and the angle, so crossed cards can move together and the cardboard stays put.

const PAPER_EDGE = new Color('#f4efe2')
const KRAFT_TOP = new Color('#d3ab72')
const KRAFT_SIDE = new Color('#a98150')

class Builder {
  pos: number[] = []; nor: number[] = []; uv: number[] = []; col: number[] = []; info: number[] = []; idx: number[] = []
  get count() { return this.pos.length / 3 }
  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number, c: Color, iu: number, iv: number, solid: number, ang: number) {
    this.pos.push(x, y, z); this.nor.push(nx, ny, nz); this.uv.push(u, v); this.col.push(c.r, c.g, c.b); this.info.push(iu, iv, solid, ang)
    return this.count - 1
  }
  tri(a: number, b: number, c: number) { this.idx.push(a, b, c) }
  quad(a: number, b: number, c: number, d: number) { this.idx.push(a, b, c, a, c, d) }
  build() {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3))
    g.setAttribute('normal', new BufferAttribute(new Float32Array(this.nor), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(this.uv), 2))
    g.setAttribute('color', new BufferAttribute(new Float32Array(this.col), 3))
    g.setAttribute('aInfo', new BufferAttribute(new Float32Array(this.info), 4))
    g.setIndex(new BufferAttribute(this.count > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx), 1))
    g.computeBoundingSphere()
    return g
  }
}

// ---------------------------------------------------------------- polygon helpers (u, v space)
type Pt = [number, number]
const toPoints = (outline: number[]): Pt[] => {
  const pts: Pt[] = []
  for (let i = 0; i < outline.length; i += 2) pts.push([outline[i], outline[i + 1]])
  return pts
}

function inPoly(poly: Pt[], x: number, y: number) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Liang-Barsky: does the segment touch the rectangle?
function segTouchesRect(ax: number, ay: number, bx: number, by: number, x0: number, y0: number, x1: number, y1: number) {
  let t0 = 0, t1 = 1
  const dx = bx - ax, dy = by - ay
  const p = [-dx, dx, -dy, dy], q = [ax - x0, x1 - ax, ay - y0, y1 - ay]
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false }
    else {
      const r = q[i] / p[i]
      if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r }
      else { if (r < t0) return false; if (r < t1) t1 = r }
    }
  }
  return true
}

// Does the drawing's silhouette reach into this grid cell? Cells it misses are left out, so a tree does not pay for its empty corners.
function cellTouches(poly: Pt[], x0: number, y0: number, x1: number, y1: number) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
  if (inPoly(poly, mx, my) || inPoly(poly, x0, y0) || inPoly(poly, x1, y0) || inPoly(poly, x1, y1) || inPoly(poly, x0, y1)) return true
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    if (segTouchesRect(a[0], a[1], b[0], b[1], x0, y0, x1, y1)) return true
  }
  return false
}

// Douglas-Peucker on a closed outline, down to at most `max` points: the paper edge does not need every wobble of the crayon
function perpDist(p: Pt, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy)
  if (len < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / len
}
function dp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts
  let best = -1, bi = 0
  for (let i = 1; i < pts.length - 1; i++) { const d = perpDist(pts[i], pts[0], pts[pts.length - 1]); if (d > best) { best = d; bi = i } }
  if (best <= eps) return [pts[0], pts[pts.length - 1]]
  return dp(pts.slice(0, bi + 1), eps).slice(0, -1).concat(dp(pts.slice(bi), eps))
}
function simplifyClosed(poly: Pt[], max: number): Pt[] {
  if (poly.length <= max) return poly
  const half = poly.length >> 1
  let eps = 0.004, out = poly
  for (let k = 0; k < 14 && out.length > max; k++, eps *= 1.4) {
    const a = dp(poly.slice(0, half + 1), eps), b = dp(poly.slice(half).concat([poly[0]]), eps)
    out = a.slice(0, -1).concat(b.slice(0, -1))
  }
  return out
}

// ---------------------------------------------------------------- parts
export interface CardDims { w: number; h: number }
export function cardDims(e: Pick<PaperEntry, 'size' | 'aspect'>): CardDims {
  return e.aspect >= 1 ? { w: e.size, h: e.size / e.aspect } : { w: e.size * e.aspect, h: e.size }
}

interface CardSpec {
  e: PaperEntry
  w: number; h: number
  anchor: number // 0..1 along the width, where x = 0
  y0: number // the card's bottom edge height (above a cardboard base, or minus half the height for cards that float)
  angle: number // turn about the up axis, for crossed cards and house walls
  tx?: number; tz?: number // where the card stands
  thick: number
  cols: number; rows: number
  edgePoints?: number // how many points the paper edge may have
}

// One card: the face as a grid (so it can bend), and a ribbon of paper edge around the silhouette
function addCard(b: Builder, s: CardSpec, poly: Pt[]) {
  const { w, h, anchor, y0, angle, thick } = s
  const c = Math.cos(angle), sn = Math.sin(angle)
  const tx = s.tx ?? 0, tz = s.tz ?? 0
  // card space (x right, y up, z toward the front face) -> object space
  const px = (x: number, z: number) => x * c + z * sn + tx
  const pz = (x: number, z: number) => -x * sn + z * c + tz
  const nx = sn, nz = c // the front normal

  const white = new Color(1, 1, 1)
  const rows = s.rows, cols = s.cols
  const grid: number[] = []
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = i / cols, v = j / rows
      const x = (u - anchor) * w, y = y0 + v * h
      grid.push(b.vertex(px(x, 0), y, pz(x, 0), nx, 0, nz, u, v, white, u, v, 0, angle))
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!cellTouches(poly, i / cols, j / rows, (i + 1) / cols, (j + 1) / rows)) continue
      const a = grid[j * (cols + 1) + i], bb = grid[j * (cols + 1) + i + 1], cc = grid[(j + 1) * (cols + 1) + i + 1], d = grid[(j + 1) * (cols + 1) + i]
      b.quad(a, bb, cc, d)
    }
  }

  // the paper edge: a ribbon around the outline, as thick as the paper
  poly = simplifyClosed(poly, s.edgePoints ?? 44)
  const n = poly.length
  const ht = thick / 2
  for (let k = 0; k < n; k++) {
    const [u0, v0] = poly[k], [u1, v1] = poly[(k + 1) % n]
    const x0 = (u0 - anchor) * w, y0p = y0 + v0 * h, x1 = (u1 - anchor) * w, y1p = y0 + v1 * h
    const ex = x1 - x0, ey = y1p - y0p
    const len = Math.hypot(ex, ey)
    if (len < 1e-6) continue
    const ox = ey / len, oy = -ex / len // outward for a counter-clockwise outline
    const onx = ox * c, onz = -ox * sn
    const a = b.vertex(px(x0, ht), y0p, pz(x0, ht), onx, oy, onz, 0, 0, PAPER_EDGE, u0, v0, 1, angle)
    const bb = b.vertex(px(x1, ht), y1p, pz(x1, ht), onx, oy, onz, 0, 0, PAPER_EDGE, u1, v1, 1, angle)
    const cc = b.vertex(px(x1, -ht), y1p, pz(x1, -ht), onx, oy, onz, 0, 0, PAPER_EDGE, u1, v1, 1, angle)
    const d = b.vertex(px(x0, -ht), y0p, pz(x0, -ht), onx, oy, onz, 0, 0, PAPER_EDGE, u0, v0, 1, angle)
    b.tri(a, cc, bb); b.tri(a, d, cc)
  }
}

// A small cardboard disc the cut-out stands on
function addBase(b: Builder, cx: number, cz: number, rx: number, rz: number, height: number, seed: number, segs = 9) {
  const r = rng(seed)
  const ring: [number, number][] = []
  for (let k = 0; k < segs; k++) {
    const a = (k / segs) * Math.PI * 2, j = 0.93 + r() * 0.14
    ring.push([cx + Math.cos(a) * rx * j, cz + Math.sin(a) * rz * j])
  }
  const top = b.vertex(cx, height, cz, 0, 1, 0, 0, 0, KRAFT_TOP, 0, 0, 1, 0)
  const topRing = ring.map(([x, z]) => b.vertex(x, height, z, 0, 1, 0, 0, 0, KRAFT_TOP, 0, 0, 1, 0))
  for (let k = 0; k < segs; k++) b.tri(top, topRing[(k + 1) % segs], topRing[k])
  for (let k = 0; k < segs; k++) {
    const [x0, z0] = ring[k], [x1, z1] = ring[(k + 1) % segs]
    const mx = (x0 + x1) / 2 - cx, mz = (z0 + z1) / 2 - cz, ml = Math.hypot(mx, mz) || 1
    const a = b.vertex(x0, height, z0, mx / ml, 0, mz / ml, 0, 0, KRAFT_SIDE, 0, 0, 1, 0)
    const bb = b.vertex(x1, height, z1, mx / ml, 0, mz / ml, 0, 0, KRAFT_SIDE, 0, 0, 1, 0)
    const cc = b.vertex(x1, 0, z1, mx / ml, 0, mz / ml, 0, 0, KRAFT_SIDE, 0, 0, 1, 0)
    const d = b.vertex(x0, 0, z0, mx / ml, 0, mz / ml, 0, 0, KRAFT_SIDE, 0, 0, 1, 0)
    b.tri(a, bb, cc); b.tri(a, cc, d)
  }
}

// A box, used for the posts at the corners of a house and its cardboard plate
function addBox(b: Builder, cx: number, y0: number, cz: number, sx: number, sy: number, sz: number, topColor: Color, sideColor: Color) {
  const x0 = cx - sx / 2, x1 = cx + sx / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, y1 = y0 + sy
  const face = (c: Color, n: [number, number, number], p: [number, number, number][]) => {
    const ids = p.map(([x, y, z]) => b.vertex(x, y, z, n[0], n[1], n[2], 0, 0, c, 0, 0, 1, 0))
    b.quad(ids[0], ids[1], ids[2], ids[3])
  }
  face(topColor, [0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]])
  face(sideColor, [0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])
  face(sideColor, [0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]])
  face(sideColor, [1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]])
  face(sideColor, [-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]])
}

// ---------------------------------------------------------------- whole elements
const gridFor = (w: number, h: number, even = false) => {
  let cols = Math.min(12, Math.max(2, Math.ceil(w / 0.18))), rows = Math.min(14, Math.max(3, Math.ceil(h / 0.17)))
  if (even) { cols += cols % 2; rows += rows % 2 }
  return { cols, rows }
}
const thicknessFor = (size: number) => 0.012 + 0.005 * size
export const baseHeight = (e: PaperEntry) => (e.size < 1 ? 0.03 : 0.045)

export interface RoofSpec { eave: number; color: string }
export const roofOf = (e: PaperEntry & { eave?: number; roof?: string }): RoofSpec => ({ eave: e.eave ?? 0.62, color: e.roof ?? '#c9683a' })

// Plants: the same cut-out two or three times, crossed, on a cardboard base
function buildPlant(e: PaperEntry, withBase = true) {
  const { w, h } = cardDims(e)
  const poly = toPoints(e.outline)
  const b = new Builder()
  const bh = withBase ? baseHeight(e) : 0
  const { cols, rows } = gridFor(w, h)
  for (let k = 0; k < e.cards; k++) {
    addCard(b, { e, w, h, anchor: e.anchor, y0: bh * 0.7, angle: (k * Math.PI) / e.cards, thick: thicknessFor(e.size), cols, rows }, poly)
  }
  if (withBase) {
    const r = Math.min(0.5, Math.max(0.1, 0.3 * Math.min(w, 1.4)))
    addBase(b, 0, 0, r, r * 0.9, bh, e.id.length * 7 + 3)
  }
  return b.build()
}

// A single card standing on a small oval tab (people and animals that walk) or with its middle at the origin (birds, fish, insects)
function buildCard(e: PaperEntry, mode: 'stand' | 'center' | 'float') {
  const { w, h } = cardDims(e)
  const poly = toPoints(e.outline)
  const b = new Builder()
  const even = e.behavior === 'bird' || e.behavior === 'insect' || e.behavior === 'fish'
  const { cols, rows } = gridFor(w, h, even)
  if (mode === 'stand') {
    const bh = baseHeight(e)
    addCard(b, { e, w, h, anchor: e.anchor, y0: bh * 0.7, angle: 0, thick: thicknessFor(e.size), cols, rows }, poly)
    const rx = Math.min(0.32, Math.max(0.08, w * 0.3))
    addBase(b, 0, 0, rx, rx * 0.5, bh, e.id.length * 11 + 5, 8)
  } else if (mode === 'float') {
    // a boat or a swan sits on the water: its foot is at the origin and there is no cardboard under it
    addCard(b, { e, w, h, anchor: 0.5, y0: 0, angle: 0, thick: thicknessFor(e.size), cols, rows }, poly)
  } else {
    addCard(b, { e, w, h, anchor: 0.5, y0: -h / 2, angle: 0, thick: thicknessFor(e.size), cols, rows }, poly)
  }
  return b.build()
}

// Four cards standing as a box, with a folded paper roof, little posts in the corners and a cardboard plate
function buildHouse(e: PaperEntry & { eave?: number; roof?: string }) {
  const { w, h } = cardDims(e)
  const poly = toPoints(e.outline)
  const b = new Builder()
  const d = w * 0.72
  const bh = 0.05
  const t = thicknessFor(e.size) * 1.4
  const { cols, rows } = gridFor(w, h)
  const wall = (width: number, angle: number, x: number, z: number) =>
    addCard(b, { e, w: width, h, anchor: 0.5, y0: bh, angle, tx: x, tz: z, thick: t, cols: Math.max(2, Math.round(cols * (width / w))), rows }, poly)
  wall(w, 0, 0, d / 2)
  wall(w, Math.PI, 0, -d / 2)
  wall(d, Math.PI / 2, w / 2, 0)
  wall(d, -Math.PI / 2, -w / 2, 0)

  const roof = roofOf(e)
  const eaveY = bh + roof.eave * h
  // the roof peaks where the drawing's silhouette is tallest near the middle
  let topMid = 0
  for (const [u, v] of poly) if (Math.abs(u - 0.5) < 0.12) topMid = Math.max(topMid, v)
  const apexY = bh + Math.max(roof.eave + 0.06, Math.min(1, topMid || 1) * 0.96) * h
  const rc = new Color(roof.color)
  const hx = w / 2 - t * 0.4, hz = d / 2 - t * 0.4
  const corners: [number, number][] = [[-hx, hz], [hx, hz], [hx, -hz], [-hx, -hz]]
  for (let k = 0; k < 4; k++) {
    const [x0, z0] = corners[k], [x1, z1] = corners[(k + 1) % 4]
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2
    // slope normal: up and outward
    const ox = mx, oz = mz, ol = Math.hypot(ox, oz) || 1
    const rise = apexY - eaveY, run = Math.hypot(mx, mz) || 1
    const nn = Math.hypot(rise, run)
    const nxx = (ox / ol) * (rise / nn), nyy = run / nn, nzz = (oz / ol) * (rise / nn)
    const a = b.vertex(x0, eaveY, z0, nxx, nyy, nzz, 0, 0, rc, 0, 0, 1, 0)
    const bb = b.vertex(x1, eaveY, z1, nxx, nyy, nzz, 0, 0, rc, 0, 0, 1, 0)
    const c = b.vertex(0, apexY, 0, nxx, nyy, nzz, 0, 0, rc, 0, 0, 1, 0)
    b.tri(a, bb, c) // wound so the slope faces outward
  }
  const post = new Color('#efe7d4'), postSide = new Color('#e3d9c2')
  for (const [x, z] of corners) addBox(b, x * 1.0 + Math.sign(x) * t * 0.4, bh, z + Math.sign(z) * t * 0.4, t * 1.6, (eaveY - bh) * 0.985, t * 1.6, post, postSide)
  addBox(b, 0, 0, 0, w + 0.5, bh, d + 0.5, new Color('#d3ab72'), new Color('#a98150'))
  return b.build()
}

// A card lying flat (a lily pad on the water)
function buildFlat(e: PaperEntry) {
  const { w, h } = cardDims(e)
  const poly = toPoints(e.outline)
  const b = new Builder()
  const { cols, rows } = gridFor(w, h)
  addCard(b, { e, w, h, anchor: 0.5, y0: -h / 2, angle: 0, thick: 0.014, cols, rows }, poly)
  const g = b.build()
  g.rotateX(-Math.PI / 2) // the picture faces up
  return g
}

// Everything the entry needs as one geometry, whatever it is
export function buildEntryGeometry(e: PaperEntry): BufferGeometry {
  switch (e.shape) {
    case 'plant': return buildPlant(e, e.kind !== 'rainbow')
    case 'building': return buildHouse(e)
    case 'flat': return buildFlat(e)
    default: {
      const floats = e.behavior === 'bird' || e.behavior === 'insect' || e.behavior === 'fish'
      return buildCard(e, floats ? 'center' : e.behavior === 'floater' ? 'float' : 'stand')
    }
  }
}
