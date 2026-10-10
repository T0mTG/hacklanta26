// Dev tool: splits an image into a grid of zoomed tiles so a big overview can be inspected piece by piece.
//   node scripts/tile.mjs <image> <out-prefix> [cols=2] [rows=2] [tileWidth=1800] [overlap=40]
import sharp from 'sharp'

const [, , file, prefix, cols = '2', rows = '2', tw = '1800', overlap = '40'] = process.argv
const m = await sharp(file, { limitInputPixels: false }).metadata()
const C = Number(cols), Rr = Number(rows), ov = Number(overlap)
const cw = Math.ceil(m.width / C), ch = Math.ceil(m.height / Rr)
for (let r = 0; r < Rr; r++) {
  for (let c = 0; c < C; c++) {
    const left = Math.max(0, c * cw - ov), top = Math.max(0, r * ch - ov)
    const width = Math.min(m.width - left, cw + ov * (c > 0 ? 2 : 1)), height = Math.min(m.height - top, ch + ov * (r > 0 ? 2 : 1))
    const out = `${prefix}_${r}${c}.jpg`
    await sharp(file, { limitInputPixels: false }).extract({ left, top, width, height }).resize({ width: Math.min(Number(tw), width * 3) }).jpeg({ quality: 86 }).toFile(out)
    console.log(out, { left, top, width, height })
  }
}
