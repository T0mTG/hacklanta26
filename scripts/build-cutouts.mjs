// One-off asset script for the Paper Globe: turns drawings into paper cut-outs.
//
//   npm run cutouts                       (installs sharp in scripts/ if needed, then runs this)
//   node scripts/build-cutouts.mjs [--contact <dir>]
//
// Input:  scripts/cutouts.manifest.json  (sheets, and one explicit crop rectangle per element, chosen by eye)
// Output: public/paper/<id>.webp         the cut-out: the drawing, a thin black outline, a white paper border, transparent beyond
//         public/paper/raw/<id>.jpg      the original crop, for elements on the demo shelf (what the fake AI "looks at")
//         src/paper/library.gen.ts       size, anchor, outline polygon and colors of every cut-out
//
// For each element: crop -> find the drawing (flood fill from the edges, treating drawn lines as walls, so everything the lines
// enclose stays and the page around it goes) -> keep the main drawing and its close-by parts -> outline + paper border -> trim.
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { components, contourRings, dilate, distanceTo, erode, floodFromBorder, ringArea, simplifyRing } from './lib/imgmath.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const MANIFEST = path.join(ROOT, 'scripts/cutouts.manifest.json')
const OUT_DIR = path.join(ROOT, 'public/paper')
const RAW_DIR = path.join(OUT_DIR, 'raw')
const LIB_FILE = path.join(ROOT, 'src/paper/library.gen.ts')

const argv = process.argv.slice(2)
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null }
const contactDir = arg('--contact')

const INK = [29, 35, 40] // the black of the outline: soft, not pure black
const PAPER = [255, 253, 246] // the white of the paper border

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const hex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

// ------------------------------------------------------------------ sheets and crops
const sheetCache = new Map()
async function loadSheet(key, def) {
  if (sheetCache.has(key)) return sheetCache.get(key)
  const file = path.join(ROOT, def.file)
  if (!fs.existsSync(file)) throw new Error(`missing source picture for sheet "${key}": ${def.file}`)
  let img = file.endsWith('.svg') ? sharp(file, { density: def.density ?? 192 }) : sharp(file, { limitInputPixels: false })
  if (def.width) img = img.resize({ width: def.width })
  img = def.alpha ? img.ensureAlpha() : img.flatten({ background: '#ffffff' })
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const sheet = { key, def, data, w: info.width, h: info.height, ch: info.channels }
  sheetCache.set(key, sheet)
  return sheet
}

function crop(sheet, rect, pad) {
  const [rx, ry, rw, rh] = rect
  const x0 = Math.max(0, Math.floor(rx - pad)), y0 = Math.max(0, Math.floor(ry - pad))
  const x1 = Math.min(sheet.w, Math.ceil(rx + rw + pad)), y1 = Math.min(sheet.h, Math.ceil(ry + rh + pad))
  const w = x1 - x0, h = y1 - y0
  const rgb = new Uint8Array(w * h * 3), alpha = sheet.ch === 4 ? new Uint8Array(w * h) : null
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y0 + y) * sheet.w + x0 + x) * sheet.ch, d = y * w + x
      rgb[d * 3] = sheet.data[s]; rgb[d * 3 + 1] = sheet.data[s + 1]; rgb[d * 3 + 2] = sheet.data[s + 2]
      if (alpha) alpha[d] = sheet.data[s + 3]
    }
  }
  return { x0, y0, w, h, rgb, alpha }
}

function rotate90(c) {
  const { w, h } = c
  const rgb = new Uint8Array(w * h * 3), alpha = c.alpha ? new Uint8Array(w * h) : null
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = y * w + x, d = x * h + (h - 1 - y)
      rgb[d * 3] = c.rgb[s * 3]; rgb[d * 3 + 1] = c.rgb[s * 3 + 1]; rgb[d * 3 + 2] = c.rgb[s * 3 + 2]
      if (alpha) alpha[d] = c.alpha[s]
    }
  }
  return { ...c, w: h, h: w, rgb, alpha }
}

function borderMedian(c) {
  const px = []
  const take = (x, y) => px.push([c.rgb[(y * c.w + x) * 3], c.rgb[(y * c.w + x) * 3 + 1], c.rgb[(y * c.w + x) * 3 + 2]])
  for (let x = 0; x < c.w; x++) { take(x, 0); take(x, c.h - 1) }
  for (let y = 1; y < c.h - 1; y++) { take(0, y); take(c.w - 1, y) }
  const med = (i) => px.map((p) => p[i]).sort((a, b) => a - b)[px.length >> 1]
  return [med(0), med(1), med(2)]
}

const inPoly = (poly, x, y) => {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// ------------------------------------------------------------------ one element
async function cutOut(el, sheet) {
  const pad = el.pad ?? 14
  const rect = el.rect
  let c = crop(sheet, rect, pad)
  const ox = c.x0, oy = c.y0 // crop origin in sheet pixels, for drop rectangles and polygons
  const turns = ((((el.rot ?? 0) / 90) % 4) + 4) % 4
  const { w: w0, h: h0 } = c
  for (let i = 0; i < turns; i++) c = rotate90(c)
  const { w, h, rgb, alpha } = c
  const N = w * h

  // map a point of the unrotated crop to the rotated one
  const rot = (x, y, tw, th) => { let px = x, py = y, cw = tw, ch = th; for (let i = 0; i < turns; i++) { const nx = ch - 1 - py, ny = px; px = nx; py = ny; const t = cw; cw = ch; ch = t } return [px, py] }

  // 1) the lines: pixels that are not the page
  const bg = el.bg ?? borderMedian(c)
  const mode = el.mode ?? 'bg'
  const thr = el.thr ?? (mode === 'dark' ? 72 : 46)
  const ink = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    if (alpha) { ink[i] = alpha[i] >= 128 ? 1 : 0; continue }
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    if (mode === 'dark') ink[i] = 0.299 * r + 0.587 * g + 0.114 * b < thr ? 1 : 0
    else { const dr = r - bg[0], dg = g - bg[1], db = b - bg[2]; ink[i] = dr * dr + dg * dg + db * db > thr * thr ? 1 : 0 }
  }

  // 2) regions to ignore: drop rectangles and everything outside a polygon count as page.
  //    "page" colors (a blue sky, a green lawn) count as page wherever they are, so pockets of sky between an arm and a body go too.
  const seeds = new Uint8Array(N)
  for (const [pr, pg, pb, tol] of el.page ?? []) {
    for (let i = 0; i < N; i++) {
      const dr = rgb[i * 3] - pr, dg = rgb[i * 3 + 1] - pg, db = rgb[i * 3 + 2] - pb
      if (dr * dr + dg * dg + db * db < tol * tol) { ink[i] = 0; seeds[i] = 1 }
    }
  }
  const toCrop = (sx, sy) => rot(sx - ox, sy - oy, w0, h0)
  for (const [dx, dy, dw, dh] of el.drop ?? []) {
    const [a0, b0] = toCrop(dx, dy), [a1, b1] = toCrop(dx + dw, dy + dh)
    for (let y = Math.max(0, Math.min(b0, b1)); y < Math.min(h, Math.max(b0, b1)); y++)
      for (let x = Math.max(0, Math.min(a0, a1)); x < Math.min(w, Math.max(a0, a1)); x++) { ink[y * w + x] = 0; seeds[y * w + x] = 1 }
  }
  if (el.poly) {
    const poly = el.poly.map(([px, py]) => toCrop(px, py))
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!inPoly(poly, x + 0.5, y + 0.5)) { ink[y * w + x] = 0; seeds[y * w + x] = 1 }
  }

  // 3) the page is everything reachable from the edge without crossing a line (lines widened a little so small gaps stay shut).
  //    In "poly" mode there is no line to follow (a house in a landscape): the polygon itself is the cut.
  const close = mode === 'poly' ? 0 : el.close ?? Math.max(2, Math.round(Math.max(w, h) * 0.008))
  const barrier = mode === 'poly' ? ink : dilate(ink, w, h, close)
  const outside = mode === 'poly' ? seeds : floodFromBorder(barrier, w, h, seeds)
  const filled = new Uint8Array(N)
  for (let i = 0; i < N; i++) filled[i] = outside[i] ? 0 : 1

  // 4) keep the main drawing (and, if asked, every part of a useful size)
  const comps = components(filled, w, h)
  if (!comps.count) throw new Error('nothing found in the crop')
  let main = 0
  for (let i = 1; i < comps.count; i++) if (comps.areas[i] > comps.areas[main]) main = i
  const keep = new Uint8Array(comps.count)
  for (let i = 0; i < comps.count; i++) keep[i] = i === main || (el.parts === 'all' && comps.areas[i] >= comps.areas[main] * 0.02) ? 1 : 0
  const sel = new Uint8Array(N)
  for (let i = 0; i < N; i++) sel[i] = comps.labels[i] >= 0 && keep[comps.labels[i]] ? 1 : 0
  const mask = erode(sel, w, h, close + (el.shrink ?? 0))

  if (process.env.DEBUG_CUT === el.id) {
    const dir = process.env.DEBUG_DIR
    const dump = (name, bin) => sharp(Buffer.from(bin.map((v) => (v ? 255 : 0))), { raw: { width: w, height: h, channels: 1 } }).png().toFile(path.join(dir, `${el.id}-${name}.png`))
    await Promise.all([dump('ink', ink), dump('barrier', barrier), dump('outside', outside), dump('filled', filled), dump('mask', mask)])
    await sharp(Buffer.from(rgb), { raw: { width: w, height: h, channels: 3 } }).png().toFile(path.join(dir, `${el.id}-crop.png`))
  }

  // 5) trim to the drawing and scale to the texture size
  let bx0 = w, by0 = h, bx1 = 0, by1 = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y }
  const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1
  const maxSide = el.max ?? 420
  const s = Math.min(1, maxSide / Math.max(bw, bh))
  const ow = Math.max(4, Math.round(bw * s)), oh = Math.max(4, Math.round(bh * s))
  const outlinePx = el.outline ?? clamp(Math.max(ow, oh) * 0.0065, 1.5, 3)
  const borderPx = el.border ?? clamp(Math.max(ow, oh) * 0.012, 3, 5.5)
  const m = Math.ceil(outlinePx + borderPx) + 3 // room around the drawing for the outline and the border
  const CW = ow + 2 * m, CH = oh + 2 * m

  const subRgb = Buffer.alloc(bw * bh * 3), subMask = Buffer.alloc(bw * bh)
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const si = (by0 + y) * w + bx0 + x, di = y * bw + x
    subRgb[di * 3] = rgb[si * 3]; subRgb[di * 3 + 1] = rgb[si * 3 + 1]; subRgb[di * 3 + 2] = rgb[si * 3 + 2]
    subMask[di] = mask[si] ? 255 : 0
  }
  const scaledRgb = await sharp(subRgb, { raw: { width: bw, height: bh, channels: 3 } }).resize(ow, oh, { kernel: 'lanczos3' }).raw().toBuffer()
  // a touch of blur before the threshold takes the jaggies out of scribbly edges
  const scaledMask = await sharp(subMask, { raw: { width: bw, height: bh, channels: 1 } }).resize(ow, oh, { kernel: 'linear' }).blur(0.9).extractChannel(0).raw().toBuffer()

  // 6) paste into the padded canvas, then outline and border from the distance to the drawing
  const M = new Uint8Array(CW * CH)
  const cr = new Uint8Array(CW * CH * 3).fill(255)
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const si = y * ow + x, di = (y + m) * CW + x + m
    if (scaledMask[si] >= 128) {
      M[di] = 1
      cr[di * 3] = scaledRgb[si * 3]; cr[di * 3 + 1] = scaledRgb[si * 3 + 1]; cr[di * 3 + 2] = scaledRgb[si * 3 + 2]
    }
  }
  const dist = distanceTo(M, CW, CH)
  const E = outlinePx + borderPx
  const rgba = Buffer.alloc(CW * CH * 4)
  for (let i = 0; i < CW * CH; i++) {
    let r, g, b, a
    if (M[i]) {
      r = cr[i * 3]; g = cr[i * 3 + 1]; b = cr[i * 3 + 2]; a = 1
      // page-colored pixels inside the drawing become white paper
      if (!alpha && mode === 'bg') {
        const dr = r - bg[0], dg = g - bg[1], db = b - bg[2]
        if (dr * dr + dg * dg + db * db < 16 * 16) { r = PAPER[0]; g = PAPER[1]; b = PAPER[2] }
      }
    } else {
      const d = dist[i]
      a = clamp(E + 1 - d)
      const k = clamp(outlinePx + 1 - d)
      r = PAPER[0] + (INK[0] - PAPER[0]) * k; g = PAPER[1] + (INK[1] - PAPER[1]) * k; b = PAPER[2] + (INK[2] - PAPER[2]) * k
    }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = Math.round(a * 255)
  }

  // 7) trim the transparent margin
  let tx0 = CW, ty0 = CH, tx1 = 0, ty1 = 0
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (rgba[(y * CW + x) * 4 + 3] > 4) { if (x < tx0) tx0 = x; if (x > tx1) tx1 = x; if (y < ty0) ty0 = y; if (y > ty1) ty1 = y }
  tx0 = Math.max(0, tx0 - 1); ty0 = Math.max(0, ty0 - 1); tx1 = Math.min(CW - 1, tx1 + 1); ty1 = Math.min(CH - 1, ty1 + 1)
  const tw = tx1 - tx0 + 1, th = ty1 - ty0 + 1
  const out = Buffer.alloc(tw * th * 4)
  const alphaF = new Float32Array(tw * th)
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const si = ((y + ty0) * CW + x + tx0) * 4, di = (y * tw + x) * 4
    out[di] = rgba[si]; out[di + 1] = rgba[si + 1]; out[di + 2] = rgba[si + 2]; out[di + 3] = rgba[si + 3]
    alphaF[y * tw + x] = rgba[si + 3] / 255
  }

  // 8) the outline polygon (for the paper edge), where the foot is, and the main colors
  const rings = contourRings(alphaF, tw, th, 0.5)
  if (!rings.length) throw new Error('no outline found')
  let ring = rings[0]
  for (const r of rings) if (Math.abs(ringArea(r)) > Math.abs(ringArea(ring))) ring = r
  let eps = 0.7, poly = simplifyRing(ring, eps)
  while (poly.length > 84 && eps < 12) { eps *= 1.25; poly = simplifyRing(ring, eps) }
  let uv = poly.map(([x, y]) => [clamp((x + 0.5) / tw), clamp(1 - (y + 0.5) / th)])
  if (ringArea(uv) < 0) uv.reverse() // counter-clockwise, so the edge ribbon faces outward

  let sx = 0, sn = 0
  for (let y = Math.floor(th * 0.94); y < th; y++) for (let x = 0; x < tw; x++) if (alphaF[y * tw + x] > 0.5) { sx += x; sn++ }
  const anchor = sn ? clamp(sx / sn / tw, 0.2, 0.8) : 0.5

  const buckets = new Map()
  for (let i = 0; i < tw * th; i++) {
    if (alphaF[i] < 0.99) continue
    const r = out[i * 4], g = out[i * 4 + 1], b = out[i * 4 + 2]
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx === 0 ? 0 : (mx - mn) / mx
    if ((mx > 228 && sat < 0.16) || mx < 55 || (sat < 0.14 && mx > 150)) continue
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
    const k = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, w: 0 }
    k.r += r; k.g += g; k.b += b; k.n++; k.w += 1 + sat * 2
    buckets.set(key, k)
  }
  const colors = []
  for (const k of [...buckets.values()].sort((a, b) => b.w - a.w)) {
    const col = [k.r / k.n, k.g / k.n, k.b / k.n]
    if (colors.every((o) => Math.hypot(o[0] - col[0], o[1] - col[1], o[2] - col[2]) > 70)) colors.push(col)
    if (colors.length === 3) break
  }

  return { rgba: out, w: tw, h: th, anchor, outline: uv, colors: colors.map((c) => hex(...c)), bgEstimate: bg }
}

// the original picture, for the fake AI to look at: the crop with some room around it, on white
async function rawPicture(el, sheet) {
  const [x, y, w, h] = el.rawRect ?? el.rect
  const px = Math.round(Math.max(w, h) * 0.08)
  const x0 = Math.max(0, x - px), y0 = Math.max(0, y - px)
  const x1 = Math.min(sheet.w, x + w + px), y1 = Math.min(sheet.h, y + h + px)
  const side = Math.max(x1 - x0, y1 - y0)
  let img = sharp(sheet.data, { raw: { width: sheet.w, height: sheet.h, channels: sheet.ch } }).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
  if (el.rot) img = img.rotate(el.rot)
  return img.flatten({ background: '#ffffff' }).resize({ width: Math.min(x1 - x0, 560), height: Math.min(y1 - y0, 560), fit: 'inside', withoutEnlargement: side < 560 }).jpeg({ quality: 84 }).toBuffer()
}

// ------------------------------------------------------------------ run
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
fs.mkdirSync(RAW_DIR, { recursive: true })
for (const f of fs.readdirSync(OUT_DIR)) if (f.endsWith('.webp')) fs.rmSync(path.join(OUT_DIR, f)) // stale cut-outs of removed elements
for (const f of fs.readdirSync(RAW_DIR)) if (f.endsWith('.jpg')) fs.rmSync(path.join(RAW_DIR, f))

const PROCESSING = new Set(['sheet', 'rect', 'rawRect', 'pad', 'rot', 'mode', 'thr', 'bg', 'close', 'drop', 'poly', 'page', 'parts', 'shrink', 'max', 'outline', 'border'])
const library = []
const previews = []
let failed = 0
for (const el of manifest.elements) {
  const t0 = performance.now()
  try {
    const sheet = await loadSheet(el.sheet, manifest.sheets[el.sheet])
    const r = await cutOut(el, sheet)
    await sharp(r.rgba, { raw: { width: r.w, height: r.h, channels: 4 } }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(path.join(OUT_DIR, `${el.id}.webp`))
    if (el.shelf) fs.writeFileSync(path.join(RAW_DIR, `${el.id}.jpg`), await rawPicture(el, sheet))
    const entry = { id: el.id, label: el.label, kind: el.kind, face: el.face ?? 'F', w: r.w, h: r.h, anchor: +r.anchor.toFixed(3), colors: r.colors, outline: r.outline.flatMap(([u, v]) => [+u.toFixed(3), +v.toFixed(3)]) }
    for (const [k, v] of Object.entries(el)) if (!(k in entry) && !PROCESSING.has(k)) entry[k] = v
    library.push(entry)
    previews.push({ id: el.id, buf: r.rgba, w: r.w, h: r.h })
    console.log(`${el.id.padEnd(24)} ${String(r.w).padStart(4)}x${String(r.h).padEnd(4)} outline ${String(r.outline.length).padStart(2)} pts  ${Math.round(performance.now() - t0)} ms`)
  } catch (e) {
    failed++
    console.error(`FAILED ${el.id}: ${e.message}`)
  }
}

// the typed library the app imports
const lines = library.map((e) => `  ${JSON.stringify(e)},`)
fs.mkdirSync(path.dirname(LIB_FILE), { recursive: true })
fs.writeFileSync(
  LIB_FILE,
  `// Generated by scripts/build-cutouts.mjs from scripts/cutouts.manifest.json. Do not edit by hand.\n` +
    `// Outline: the cut-out's silhouette as u,v pairs (0..1, v up), counter-clockwise.\n` +
    `import type { CutoutSpec } from './types'\n\nexport const CUTOUTS: CutoutSpec[] = [\n${lines.join('\n')}\n]\n`,
)
console.log(`\n${library.length} cut-outs written, ${failed} failed -> ${path.relative(ROOT, LIB_FILE)}`)

// a contact sheet to check them by eye: every cut-out on a grass-green checker, 7 x 5 per page
if (contactDir) {
  fs.mkdirSync(contactDir, { recursive: true })
  const cell = 250, cols = 7, rows = 5, per = cols * rows
  const checker = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${cell}"><rect width="${cell}" height="${cell}" fill="#b7dc9a"/>` +
      Array.from({ length: 100 }, (_, i) => ((i % 10) + Math.floor(i / 10)) % 2 ? `<rect x="${(i % 10) * 25}" y="${Math.floor(i / 10) * 25}" width="25" height="25" fill="#c6e5ad"/>` : '').join('') + '</svg>',
  )
  for (let page = 0; page * per < previews.length; page++) {
    const group = previews.slice(page * per, page * per + per)
    const comps = []
    let labels = ''
    for (let i = 0; i < group.length; i++) {
      const p = group[i], x = (i % cols) * cell, y = Math.floor(i / cols) * cell
      comps.push({ input: checker, left: x, top: y })
      const k = Math.min((cell - 20) / p.w, (cell - 34) / p.h, 1.6)
      const img = await sharp(p.buf, { raw: { width: p.w, height: p.h, channels: 4 } }).resize(Math.max(1, Math.round(p.w * k)), Math.max(1, Math.round(p.h * k))).png().toBuffer()
      comps.push({ input: img, left: x + Math.round((cell - Math.round(p.w * k)) / 2), top: y + 6 + Math.round((cell - 34 - Math.round(p.h * k)) / 2) })
      labels += `<rect x="${x}" y="${y + cell - 22}" width="${cell}" height="22" fill="#22333b" opacity=".82"/><text x="${x + 6}" y="${y + cell - 7}" font-family="Arial" font-size="13" font-weight="bold" fill="#fff">${p.id}</text>`
    }
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}">${labels}</svg>`), left: 0, top: 0 })
    await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#b7dc9a' } }).composite(comps).jpeg({ quality: 88 }).toFile(path.join(contactDir, `contact-${page + 1}.jpg`))
  }
  console.log('contact sheets ->', contactDir)
}
