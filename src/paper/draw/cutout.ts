import { components, contourRings, dilate, distanceTo, erode, floodFromBorder, ringArea, simplifyRing } from './imgmath'

// A drawing made on the whiteboard, turned into a paper cut-out. This is the same job scripts/build-cutouts.mjs does for the library's
// pictures, but the board makes it easy: the ink is on a clean white background, so the lines of the drawing are exactly the strokes the
// kid made. Find the shape (everything the lines enclose, with small gaps closed), add the thin black outline and the white paper
// border, trim, and trace the silhouette.

const INK = [29, 35, 40] // the black of the outline: soft, not pure black
const PAPER = [255, 253, 246] // the white of the paper border
const MAX_SIDE = 448 // the biggest cut-out texture, as in the library
const MIN_INK = 0.0009 // less ink than this (a share of the board) is not a drawing yet

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

export interface DrawnCutout {
  picture: string // the drawing on white, cropped around the shape (a JPEG data URL): what the AI "looks at" and what the kid sees again later
  pictureSize: [number, number]
  cutUrl: string // the cut-out itself (a data URL, with transparency)
  w: number; h: number // the cut-out's size in pixels
  anchor: number // where the foot is along the width, 0..1
  outline: number[] // silhouette as u,v pairs (v up), counter-clockwise
  colors: string[] // the drawing's main colors
  rawFit: [number, number, number, number] // where the cut-out sits in the picture: x, y, width, height, 0..1, y down
  eave: number // for a house: where the walls end and the roof starts, as a share of the height (a guess from the shape)
  roof: string // for a house: the color of the folded paper roof (a guess from the top of the drawing)
}

const canvasOf = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h))
  return c
}

// webp when the browser can write it (smaller), otherwise whatever it falls back to (png)
const dataUrlOf = (c: HTMLCanvasElement) => c.toDataURL('image/webp', 0.92)

export function makeCutout(ink: HTMLCanvasElement): DrawnCutout | null {
  const bctx = ink.getContext('2d')
  if (!bctx) return null
  const BW = ink.width, BH = ink.height
  const board = bctx.getImageData(0, 0, BW, BH).data

  // 1) where the ink is on the board
  let x0 = BW, y0 = BH, x1 = -1, y1 = -1, count = 0
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      if (board[(y * BW + x) * 4 + 3] <= 56) continue
      count++
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    }
  }
  if (x1 < 0 || count / (BW * BH) < MIN_INK) return null
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1

  // 2) a working copy of the drawing at the cut-out's size, with an empty margin all around it (so the flood fill can start from the edge)
  const s = Math.min(1, MAX_SIDE / Math.max(bw, bh))
  const pad = Math.max(20, Math.round(Math.max(bw, bh) * 0.05))
  const cx0 = x0 - pad, cy0 = y0 - pad // the working area's corner, in board pixels (can be outside the board)
  const W = Math.ceil((bw + 2 * pad) * s), H = Math.ceil((bh + 2 * pad) * s)
  const work = canvasOf(W, H)
  const wctx = work.getContext('2d', { willReadFrequently: true })!
  wctx.imageSmoothingQuality = 'high'
  wctx.drawImage(ink, cx0, cy0, bw + 2 * pad, bh + 2 * pad, 0, 0, W, H)
  const px = wctx.getImageData(0, 0, W, H).data
  const N = W * H

  // the lines of the drawing, and the drawing over paper
  const lines = new Uint8Array(N)
  const rgb = new Uint8Array(N * 3)
  for (let i = 0; i < N; i++) {
    const a = px[i * 4 + 3] / 255
    lines[i] = px[i * 4 + 3] > 56 ? 1 : 0
    rgb[i * 3] = px[i * 4] * a + PAPER[0] * (1 - a)
    rgb[i * 3 + 1] = px[i * 4 + 1] * a + PAPER[1] * (1 - a)
    rgb[i * 3 + 2] = px[i * 4 + 2] * a + PAPER[2] * (1 - a)
  }

  // 3) the shape: everything the lines enclose, with small gaps in the lines closed (kids' outlines are rarely shut)
  const close = Math.max(3, Math.round(Math.max(W, H) * 0.022))
  const outside = floodFromBorder(dilate(lines, W, H, close), W, H)
  const filled = new Uint8Array(N)
  for (let i = 0; i < N; i++) filled[i] = outside[i] ? 0 : 1

  // keep the main drawing and any other part of a useful size (a stray dot or a smudge does not widen the cut-out)
  const comps = components(filled, W, H)
  if (!comps.count) return null
  let main = 0
  for (let i = 1; i < comps.count; i++) if (comps.areas[i] > comps.areas[main]) main = i
  const sel = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    const c = comps.labels[i]
    sel[i] = c >= 0 && (c === main || comps.areas[c] >= comps.areas[main] * 0.04) ? 1 : 0
  }
  let mask = erode(sel, W, H, close)
  let any = false
  for (let i = 0; i < N && !any; i++) if (mask[i]) any = true
  if (!any) mask = sel // a very thin drawing (one line): keep the widened shape rather than nothing

  // 4) trim to the shape
  let bx0 = W, by0 = H, bx1 = -1, by1 = -1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y }
  if (bx1 < 0) return null
  const ow = bx1 - bx0 + 1, oh = by1 - by0 + 1
  const outlinePx = clamp(Math.max(ow, oh) * 0.0065, 1.5, 3)
  const borderPx = clamp(Math.max(ow, oh) * 0.012, 3, 5.5)
  const m = Math.ceil(outlinePx + borderPx) + 3 // room around the drawing for the outline and the border
  const CW = ow + 2 * m, CH = oh + 2 * m

  // 5) the shape pasted into a padded canvas, then the outline and the border from the distance to the shape
  const M = new Uint8Array(CW * CH)
  const cr = new Uint8Array(CW * CH * 3).fill(255)
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const si = (by0 + y) * W + bx0 + x, di = (y + m) * CW + x + m
      if (!mask[si]) continue
      M[di] = 1
      cr[di * 3] = rgb[si * 3]; cr[di * 3 + 1] = rgb[si * 3 + 1]; cr[di * 3 + 2] = rgb[si * 3 + 2]
    }
  }
  const dist = distanceTo(M, CW, CH)
  const E = outlinePx + borderPx
  const rgba = new Uint8ClampedArray(CW * CH * 4)
  for (let i = 0; i < CW * CH; i++) {
    let r: number, g: number, b: number, a: number
    if (M[i]) {
      r = cr[i * 3]; g = cr[i * 3 + 1]; b = cr[i * 3 + 2]; a = 1
    } else {
      const d = dist[i]
      a = clamp(E + 1 - d)
      const k = clamp(outlinePx + 1 - d)
      r = PAPER[0] + (INK[0] - PAPER[0]) * k; g = PAPER[1] + (INK[1] - PAPER[1]) * k; b = PAPER[2] + (INK[2] - PAPER[2]) * k
    }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = Math.round(a * 255)
  }

  // 6) trim the transparent margin
  let tx0 = CW, ty0 = CH, tx1 = 0, ty1 = 0
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (rgba[(y * CW + x) * 4 + 3] > 4) { if (x < tx0) tx0 = x; if (x > tx1) tx1 = x; if (y < ty0) ty0 = y; if (y > ty1) ty1 = y }
  tx0 = Math.max(0, tx0 - 1); ty0 = Math.max(0, ty0 - 1); tx1 = Math.min(CW - 1, tx1 + 1); ty1 = Math.min(CH - 1, ty1 + 1)
  const tw = tx1 - tx0 + 1, th = ty1 - ty0 + 1
  const out = new Uint8ClampedArray(tw * th * 4)
  const alphaF = new Float32Array(tw * th)
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const si = ((y + ty0) * CW + x + tx0) * 4, di = (y * tw + x) * 4
      out[di] = rgba[si]; out[di + 1] = rgba[si + 1]; out[di + 2] = rgba[si + 2]; out[di + 3] = rgba[si + 3]
      alphaF[y * tw + x] = rgba[si + 3] / 255
    }
  }

  // 7) the outline polygon (for the paper edge), where the foot is, the main colors
  const rings = contourRings(alphaF, tw, th, 0.5)
  if (!rings.length) return null
  let ring = rings[0]
  for (const r of rings) if (Math.abs(ringArea(r)) > Math.abs(ringArea(ring))) ring = r
  let eps = 0.7, poly = simplifyRing(ring, eps)
  while (poly.length > 84 && eps < 12) { eps *= 1.25; poly = simplifyRing(ring, eps) }
  const uv: [number, number][] = poly.map(([x, y]) => [clamp((x + 0.5) / tw), clamp(1 - (y + 0.5) / th)])
  if (ringArea(uv) < 0) uv.reverse() // counter-clockwise, so the edge ribbon faces outward

  let sx = 0, sn = 0
  for (let y = Math.floor(th * 0.94); y < th; y++) for (let x = 0; x < tw; x++) if (alphaF[y * tw + x] > 0.5) { sx += x; sn++ }
  const anchor = sn ? clamp(sx / sn / tw, 0.2, 0.8) : 0.5

  const buckets = new Map<number, { r: number; g: number; b: number; n: number; w: number }>()
  const roofBuckets = new Map<number, { r: number; g: number; b: number; n: number }>()
  for (let i = 0; i < tw * th; i++) {
    if (alphaF[i] < 0.99) continue
    const r = out[i * 4], g = out[i * 4 + 1], b = out[i * 4 + 2]
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx === 0 ? 0 : (mx - mn) / mx
    if ((mx > 228 && sat < 0.16) || mx < 55 || (sat < 0.14 && mx > 150)) continue
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
    const k = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, w: 0 }
    k.r += r; k.g += g; k.b += b; k.n++; k.w += 1 + sat * 2
    buckets.set(key, k)
    if (i / tw < th * 0.4) { // the top of the drawing: a house's roof
      const q = roofBuckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
      q.r += r; q.g += g; q.b += b; q.n++
      roofBuckets.set(key, q)
    }
  }
  const colors: string[] = []
  const picked: number[][] = []
  for (const k of [...buckets.values()].sort((a, b) => b.w - a.w)) {
    const col = [k.r / k.n, k.g / k.n, k.b / k.n]
    if (picked.every((o) => Math.hypot(o[0] - col[0], o[1] - col[1], o[2] - col[2]) > 70)) { picked.push(col); colors.push(hex(col[0], col[1], col[2])) }
    if (colors.length === 3) break
  }
  let roof = '#c9683a'
  let roofN = 0
  for (const q of roofBuckets.values()) if (q.n > roofN) { roofN = q.n; roof = hex(q.r / q.n, q.g / q.n, q.b / q.n) }

  // for a house: the walls end where the shape first reaches nearly its full width (a roof narrows toward the top)
  const widths: number[] = []
  let maxW = 1
  for (let y = 0; y < th; y++) {
    let n = 0
    for (let x = 0; x < tw; x++) if (alphaF[y * tw + x] > 0.5) n++
    widths.push(n); if (n > maxW) maxW = n
  }
  let eaveRow = 0
  while (eaveRow < th - 1 && widths[eaveRow] < maxW * 0.85) eaveRow++
  const eave = clamp(1 - eaveRow / th, 0.38, 0.82)

  // 8) the cut-out as an image
  const cut = canvasOf(tw, th)
  cut.getContext('2d')!.putImageData(new ImageData(out, tw, th), 0, 0)
  const cutUrl = dataUrlOf(cut)

  // 9) the picture for the AI screen and for looking at later: the board around the cut-out on white, at a friendly shape
  // where the cut-out sits on the board, in board pixels
  const cutX = cx0 + (bx0 + tx0 - m) / s, cutY = cy0 + (by0 + ty0 - m) / s, cutW = tw / s, cutH = th / s
  const margin = Math.max(cutW, cutH) * 0.12
  let rx = cutX - margin, ry = cutY - margin, rw = cutW + 2 * margin, rh = cutH + 2 * margin
  const aspect = rw / rh
  if (aspect < 0.66) { const nw = rh * 0.66; rx -= (nw - rw) / 2; rw = nw } else if (aspect > 1.6) { const nh = rw / 1.6; ry -= (nh - rh) / 2; rh = nh }
  const k = Math.min(1, 480 / Math.max(rw, rh))
  const pw = Math.max(1, Math.round(rw * k)), ph = Math.max(1, Math.round(rh * k))
  const pic = canvasOf(pw, ph)
  const pctx = pic.getContext('2d')!
  pctx.fillStyle = '#ffffff'
  pctx.fillRect(0, 0, pw, ph)
  pctx.imageSmoothingQuality = 'high'
  pctx.drawImage(ink, rx, ry, rw, rh, 0, 0, pw, ph)
  const picture = pic.toDataURL('image/jpeg', 0.85)
  const rawFit: [number, number, number, number] = [(cutX - rx) / rw, (cutY - ry) / rh, cutW / rw, cutH / rh]

  return {
    picture, pictureSize: [pw, ph], cutUrl, w: tw, h: th, anchor,
    outline: uv.flatMap(([u, v]) => [+u.toFixed(3), +v.toFixed(3)]),
    colors: colors.length ? colors : ['#7f8c8d'], rawFit, eave: +eave.toFixed(2), roof,
  }
}
