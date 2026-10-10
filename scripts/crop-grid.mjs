// Dev tool: shows a region of a manifest sheet with a labelled coordinate grid, so crop rectangles, drop rectangles and polygons
// can be read off exactly.   node scripts/crop-grid.mjs <sheet> <x> <y> <w> <h> <out.png> [grid=50] [zoom=auto]
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const [, , sheetKey, X, Y, Wd, Ht, out, gridArg = '50', zoomArg] = process.argv
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/cutouts.manifest.json'), 'utf8'))
const def = manifest.sheets[sheetKey]
const file = path.join(ROOT, def.file)
let img = file.endsWith('.svg') ? sharp(file, { density: 192 }) : sharp(file, { limitInputPixels: false })
if (def.width) img = img.resize({ width: def.width })
const full = await img.clone().flatten({ background: '#ffffff' }).png().toBuffer()
const meta = await sharp(full).metadata()
const x = +X, y = +Y, w = Math.min(+Wd, meta.width - +X), h = Math.min(+Ht, meta.height - +Y), grid = +gridArg
const zoom = zoomArg ? +zoomArg : Math.min(4, 1700 / Math.max(w, h))
const base = await sharp(full).extract({ left: x, top: y, width: w, height: h }).resize({ width: Math.round(w * zoom) }).png().toBuffer()
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * zoom)}" height="${Math.round(h * zoom)}">`
for (let gx = Math.ceil(x / grid) * grid; gx < x + w; gx += grid) {
  const px = (gx - x) * zoom
  svg += `<line x1="${px}" y1="0" x2="${px}" y2="${h * zoom}" stroke="#e0115f" stroke-width="1" opacity=".55"/><text x="${px + 3}" y="14" font-family="Arial" font-size="14" font-weight="bold" fill="#e0115f">${gx}</text>`
}
for (let gy = Math.ceil(y / grid) * grid; gy < y + h; gy += grid) {
  const py = (gy - y) * zoom
  svg += `<line x1="0" y1="${py}" x2="${w * zoom}" y2="${py}" stroke="#0b6fe0" stroke-width="1" opacity=".55"/><text x="3" y="${py - 3}" font-family="Arial" font-size="14" font-weight="bold" fill="#0b6fe0">${gy}</text>`
}
svg += '</svg>'
await sharp(base).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(out)
console.log('wrote', out)
