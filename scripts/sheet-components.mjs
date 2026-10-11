// Dev tool: finds the separate drawings on a sticker sheet and renders a numbered contact sheet, so crops can be picked by eye.
//   node scripts/sheet-components.mjs <image> <out-prefix> [bg=white|cream|auto] [workWidth=1900] [dilate=9] [minArea=250]
// Writes <out-prefix>.json (boxes in ORIGINAL pixels) and <out-prefix>.jpg (labelled overview). Analysis only: the real
// cut-outs come from scripts/cutouts.manifest.json, which stores explicit rectangles.
import sharp from 'sharp'
import fs from 'node:fs'

const [, , file, outPrefix, bgMode = 'auto', workW = '1900', dil = '9', minArea = '250'] = process.argv
if (!file || !outPrefix) { console.error('usage: node sheet-components.mjs <image> <out-prefix> [bg] [workWidth] [dilate] [minArea]'); process.exit(1) }

const meta = await sharp(file, { limitInputPixels: false }).metadata()
const scale = Math.min(1, Number(workW) / meta.width)
const W = Math.round(meta.width * scale), H = Math.round(meta.height * scale)
const { data, info } = await sharp(file, { limitInputPixels: false }).flatten({ background: '#ffffff' }).resize(W, H).raw().toBuffer({ resolveWithObject: true })
const ch = info.channels

// background colour: the median of the four corner patches
const patch = []
for (const [cx, cy] of [[4, 4], [W - 12, 4], [4, H - 12], [W - 12, H - 12]]) {
  for (let y = cy; y < cy + 8; y++) for (let x = cx; x < cx + 8; x++) patch.push([data[(y * W + x) * ch], data[(y * W + x) * ch + 1], data[(y * W + x) * ch + 2]])
}
const med = (i) => patch.map((p) => p[i]).sort((a, b) => a - b)[patch.length >> 1]
let bg = [med(0), med(1), med(2)]
if (bgMode === 'white') bg = [255, 255, 255]
console.log('size', meta.width, meta.height, 'work', W, H, 'bg', bg)

// ink = clearly different from the background
const ink = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) {
  const dr = data[i * ch] - bg[0], dg = data[i * ch + 1] - bg[1], db = data[i * ch + 2] - bg[2]
  ink[i] = dr * dr + dg * dg + db * db > 38 * 38 ? 1 : 0
}

// separable max filter = dilation by a square of radius r
function dilate(src, r) {
  const tmp = new Uint8Array(W * H), out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    let last = -1e9
    const row = y * W
    // forward: distance since last 1
    const near = new Int32Array(W)
    for (let x = 0; x < W; x++) { if (src[row + x]) last = x; near[x] = x - last }
    last = 1e9
    for (let x = W - 1; x >= 0; x--) { if (src[row + x]) last = x; near[x] = Math.min(near[x], last - x) }
    for (let x = 0; x < W; x++) tmp[row + x] = near[x] <= r ? 1 : 0
  }
  for (let x = 0; x < W; x++) {
    const near = new Int32Array(H)
    let last = -1e9
    for (let y = 0; y < H; y++) { if (tmp[y * W + x]) last = y; near[y] = y - last }
    last = 1e9
    for (let y = H - 1; y >= 0; y--) { if (tmp[y * W + x]) last = y; near[y] = Math.min(near[y], last - y) }
    for (let y = 0; y < H; y++) out[y * W + x] = near[y] <= r ? 1 : 0
  }
  return out
}
const merged = dilate(ink, Number(dil))

// connected components over the merged mask (8-neighbourhood), boxes measured on the raw ink
const label = new Int32Array(W * H).fill(-1)
const comps = []
const stack = []
for (let s = 0; s < W * H; s++) {
  if (!merged[s] || label[s] !== -1) continue
  const id = comps.length
  const c = { id, x0: W, y0: H, x1: 0, y1: 0, area: 0 }
  stack.push(s); label[s] = id
  while (stack.length) {
    const p = stack.pop()
    const x = p % W, y = (p / W) | 0
    if (ink[p]) { c.area++; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
      const q = ny * W + nx
      if (merged[q] && label[q] === -1) { label[q] = id; stack.push(q) }
    }
  }
  comps.push(c)
}
// small bits that sit inside a bigger drawing's box (eyes, spots, stripes) belong to it
const bigFirst = comps.filter((c) => c.area > 0).sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0))
const roots = []
for (const c of bigFirst) {
  const host = roots.find((r) => {
    const ix = Math.min(r.x1, c.x1) - Math.max(r.x0, c.x0), iy = Math.min(r.y1, c.y1) - Math.max(r.y0, c.y0)
    return ix > 0 && iy > 0 && (ix * iy) / ((c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1)) > 0.8
  })
  if (host) { host.area += c.area } else roots.push(c)
}
const keep = roots.filter((c) => c.area >= Number(minArea)).sort((a, b) => (Math.round(a.y0 / 160) - Math.round(b.y0 / 160)) || (a.x0 - b.x0))
keep.forEach((c, i) => { c.n = i })

const out = keep.map((c) => ({
  n: c.n, area: c.area,
  x: Math.round(c.x0 / scale), y: Math.round(c.y0 / scale),
  w: Math.round((c.x1 - c.x0 + 1) / scale), h: Math.round((c.y1 - c.y0 + 1) / scale),
}))
fs.writeFileSync(`${outPrefix}.json`, JSON.stringify({ file, width: meta.width, height: meta.height, bg, components: out }, null, 1))
console.log('components', keep.length, 'of', comps.length)

// labelled overview
const esc = (s) => String(s)
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`
for (const c of keep) {
  const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1
  svg += `<rect x="${c.x0 - 2}" y="${c.y0 - 2}" width="${w + 4}" height="${h + 4}" fill="none" stroke="#e0115f" stroke-width="2"/>`
  const lw = String(c.n).length * 11 + 8
  svg += `<rect x="${c.x0 - 2}" y="${c.y0 - 2}" width="${lw}" height="18" fill="#e0115f"/><text x="${c.x0 + 2}" y="${c.y0 + 12}" font-family="Arial" font-weight="bold" font-size="14" fill="#fff">${esc(c.n)}</text>`
}
svg += '</svg>'
const base = await sharp(data, { raw: { width: W, height: H, channels: ch } }).jpeg({ quality: 70 }).toBuffer()
await sharp(base).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: 88 }).toFile(`${outPrefix}.jpg`)
console.log('wrote', `${outPrefix}.jpg`)
