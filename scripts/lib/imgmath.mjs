// Small image-math helpers for the cut-out script: distance transform, flood fill, labelling, contour tracing.
// Everything works on flat typed arrays (index = y * w + x), no dependencies.

const INF = 1e12

// 1D squared distance transform of f (Felzenszwalb and Huttenlocher), written into d
function edt1d(f, n, d, v, z) {
  let k = 0
  v[0] = 0; z[0] = -INF; z[1] = INF
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q; z[k] = s; z[k + 1] = INF
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
  }
}

// Distance (in pixels) from every pixel to the nearest pixel where feature[i] is non-zero
export function distanceTo(feature, w, h) {
  const n = Math.max(w, h)
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1)
  const grid = new Float64Array(w * h)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = feature[y * w + x] ? 0 : INF
    edt1d(f, h, d, v, z)
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y]
  }
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x]
    edt1d(f, w, d, v, z)
    for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x])
  }
  return out
}

// Pixels within r of a set pixel
export function dilate(mask, w, h, r) {
  const dist = distanceTo(mask, w, h)
  const out = new Uint8Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = dist[i] <= r ? 1 : 0
  return out
}

// Set pixels that are farther than r from every unset pixel
export function erode(mask, w, h, r) {
  const inv = new Uint8Array(w * h)
  for (let i = 0; i < inv.length; i++) inv[i] = mask[i] ? 0 : 1
  const dist = distanceTo(inv, w, h)
  const out = new Uint8Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = mask[i] && dist[i] > r ? 1 : 0
  return out
}

// Everything reachable from the image border (or from `seeds`) without crossing a barrier pixel. 4-connected.
export function floodFromBorder(barrier, w, h, seeds) {
  const seen = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let head = 0, tail = 0
  const push = (i) => { if (!seen[i] && !barrier[i]) { seen[i] = 1; queue[tail++] = i } }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  if (seeds) for (let i = 0; i < seeds.length; i++) if (seeds[i]) push(i)
  while (head < tail) {
    const i = queue[head++]
    const x = i % w, y = (i / w) | 0
    if (x > 0) push(i - 1)
    if (x < w - 1) push(i + 1)
    if (y > 0) push(i - w)
    if (y < h - 1) push(i + w)
  }
  return seen
}

// Connected components of a binary mask (8-connected): { labels, count, areas, boxes }
export function components(mask, w, h) {
  const labels = new Int32Array(w * h).fill(-1)
  const areas = [], boxes = []
  const stack = new Int32Array(w * h)
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || labels[s] !== -1) continue
    const id = areas.length
    let sp = 0, area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0
    stack[sp++] = s; labels[s] = id
    while (sp) {
      const p = stack[--sp]
      const x = p % w, y = (p / w) | 0
      area++
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= w) continue
          const q = ny * w + nx
          if (mask[q] && labels[q] === -1) { labels[q] = id; stack[sp++] = q }
        }
      }
    }
    areas.push(area); boxes.push([x0, y0, x1, y1])
  }
  return { labels, count: areas.length, areas, boxes }
}

// Closed rings along the `level` crossing of a scalar field, by marching squares. The field is padded with zeros first so every ring closes.
// Points are in pixel-center coordinates of the original field (x right, y down).
export function contourRings(values, w, h, level) {
  const W = w + 2, H = h + 2
  const v = new Float32Array(W * H)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) v[(y + 1) * W + x + 1] = values[y * w + x]
  const nodes = new Map() // edge id -> { key, x, y, links: [neighbouring nodes] }
  const hKey = (x, y) => `h${x},${y}`, vKey = (x, y) => `v${x},${y}`
  const node = (key, x, y) => { let n = nodes.get(key); if (!n) { n = { key, x, y, links: [] }; nodes.set(key, n) } return n }
  const lerpT = (a, b) => (level - a) / (b - a)
  const link = (a, b) => { a.links.push(b); b.links.push(a) }
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const tl = v[y * W + x], tr = v[y * W + x + 1], br = v[(y + 1) * W + x + 1], bl = v[(y + 1) * W + x]
      const c = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0)
      if (c === 0 || c === 15) continue
      const top = () => node(hKey(x, y), x + lerpT(tl, tr), y)
      const bottom = () => node(hKey(x, y + 1), x + lerpT(bl, br), y + 1)
      const left = () => node(vKey(x, y), x, y + lerpT(tl, bl))
      const right = () => node(vKey(x + 1, y), x + 1, y + lerpT(tr, br))
      switch (c) {
        case 1: case 14: link(left(), bottom()); break
        case 2: case 13: link(bottom(), right()); break
        case 3: case 12: link(left(), right()); break
        case 4: case 11: link(top(), right()); break
        case 6: case 9: link(top(), bottom()); break
        case 7: case 8: link(top(), left()); break
        case 5: case 10: {
          const centre = (tl + tr + br + bl) / 4 >= level
          // c=5 has tr and bl set; c=10 has tl and br set
          const joined = (c === 5) === centre
          if (joined) { link(top(), left()); link(bottom(), right()) } else { link(top(), right()); link(left(), bottom()) }
          break
        }
        default: break
      }
    }
  }
  const rings = []
  const used = new Set()
  for (const start of nodes.values()) {
    if (used.has(start.key) || start.links.length !== 2) continue
    const ring = []
    let prev = null, cur = start
    do {
      used.add(cur.key)
      ring.push([cur.x - 1, cur.y - 1]) // undo the padding
      const next = cur.links.find((n) => n !== prev) ?? cur.links[0]
      prev = cur; cur = next
    } while (cur !== start && !used.has(cur.key))
    if (ring.length > 3) rings.push(ring)
  }
  return rings
}

export function ringArea(ring) {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i], [x1, y1] = ring[(i + 1) % ring.length]
    a += x0 * y1 - x1 * y0
  }
  return a / 2
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / len
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts
  let best = -1, bi = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1])
    if (d > best) { best = d; bi = i }
  }
  if (best <= eps) return [pts[0], pts[pts.length - 1]]
  const a = rdp(pts.slice(0, bi + 1), eps), b = rdp(pts.slice(bi), eps)
  return a.slice(0, -1).concat(b)
}

// Douglas-Peucker for a closed ring: split at the two points farthest apart so neither end is arbitrary
export function simplifyRing(ring, eps) {
  if (ring.length < 8) return ring
  let ai = 0, bi = 0, best = -1
  const a0 = ring[0]
  for (let i = 1; i < ring.length; i++) { const d = Math.hypot(ring[i][0] - a0[0], ring[i][1] - a0[1]); if (d > best) { best = d; bi = i } }
  best = -1
  for (let i = 0; i < ring.length; i++) { const d = Math.hypot(ring[i][0] - ring[bi][0], ring[i][1] - ring[bi][1]); if (d > best) { best = d; ai = i } }
  const lo = Math.min(ai, bi), hi = Math.max(ai, bi)
  const first = ring.slice(lo, hi + 1), second = ring.slice(hi).concat(ring.slice(0, lo + 1))
  return rdp(first, eps).slice(0, -1).concat(rdp(second, eps).slice(0, -1))
}
