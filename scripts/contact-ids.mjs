// Dev tool: a contact sheet of just the named cut-outs, bigger than the full-library sheets, for checking fixes.
//   node scripts/contact-ids.mjs <out.jpg> <id> <id> ... [--cell=300]
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const out = args.shift()
const cellArg = args.find((a) => a.startsWith('--cell='))
const cell = cellArg ? +cellArg.split('=')[1] : 300
const ids = args.filter((a) => !a.startsWith('--'))
const cols = Math.min(ids.length, Math.max(1, Math.floor(1800 / cell))), rows = Math.ceil(ids.length / cols)
const checker = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${cell}"><rect width="${cell}" height="${cell}" fill="#b7dc9a"/>` +
    Array.from({ length: 144 }, (_, i) => ((i % 12) + Math.floor(i / 12)) % 2 ? `<rect x="${(i % 12) * cell / 12}" y="${Math.floor(i / 12) * cell / 12}" width="${cell / 12}" height="${cell / 12}" fill="#c6e5ad"/>` : '').join('') + '</svg>',
)
const comps = []
let labels = ''
for (let i = 0; i < ids.length; i++) {
  const x = (i % cols) * cell, y = Math.floor(i / cols) * cell
  comps.push({ input: checker, left: x, top: y })
  const buf = await sharp(path.join(ROOT, 'public/paper', `${ids[i]}.webp`)).toBuffer()
  const m = await sharp(buf).metadata()
  const k = Math.min((cell - 16) / m.width, (cell - 34) / m.height, 2)
  const w = Math.max(1, Math.round(m.width * k)), h = Math.max(1, Math.round(m.height * k))
  comps.push({ input: await sharp(buf).resize(w, h).png().toBuffer(), left: x + Math.round((cell - w) / 2), top: y + 6 + Math.round((cell - 34 - h) / 2) })
  labels += `<rect x="${x}" y="${y + cell - 22}" width="${cell}" height="22" fill="#22333b" opacity=".82"/><text x="${x + 6}" y="${y + cell - 7}" font-family="Arial" font-size="13" font-weight="bold" fill="#fff">${ids[i]}</text>`
}
comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}">${labels}</svg>`), left: 0, top: 0 })
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#b7dc9a' } }).composite(comps).jpeg({ quality: 88 }).toFile(out)
console.log('wrote', out)
