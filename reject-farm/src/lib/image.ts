const cache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = cache.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('image failed to load'))
      img.src = src
    })
    cache.set(src, p)
  }
  return p
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** Reads a dropped or picked file, or returns null if it isn't an image. */
export async function readArtFile(file: File | undefined): Promise<string | null> {
  if (!file || !file.type.startsWith('image/')) return null
  try {
    const src = await fileToDataUrl(file)
    await loadImage(src)
    return src
  } catch {
    return null
  }
}

export interface Prepared {
  src: string
  /** width divided by height, after trimming */
  aspect: number
  /** the picture sat on a plain backdrop that can be cut away */
  hasBackdrop: boolean
  /** whether the backdrop was cut away in `src` */
  cut: boolean
}

/**
 * Gets artwork ready to walk around: shrinks it, optionally cuts away a plain
 * backdrop (the white of a sheet of paper, say), and trims the empty margin so
 * its feet touch the ground. Nothing is ever added to the picture.
 */
export async function prepareArt(source: string, cut: boolean | 'auto', max = 512): Promise<Prepared> {
  const img = await loadImage(source)
  const scale = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max))
  const w = Math.max(1, Math.round((img.naturalWidth || max) * scale))
  const h = Math.max(1, Math.round((img.naturalHeight || max) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  const image = ctx.getImageData(0, 0, w, h)
  const px = image.data

  // look round the border: is it already see-through, and if not, is it one flat colour?
  const border: number[] = []
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1)
  let seeThrough = false
  let r = 0, g = 0, b = 0
  for (const i of border) {
    if (px[i * 4 + 3] < 245) seeThrough = true
    r += px[i * 4]
    g += px[i * 4 + 1]
    b += px[i * 4 + 2]
  }
  r /= border.length
  g /= border.length
  b /= border.length
  const far = (i: number) => Math.hypot(px[i * 4] - r, px[i * 4 + 1] - g, px[i * 4 + 2] - b) / 1.732
  let spread = 0
  for (const i of border) spread += far(i)
  const hasBackdrop = !seeThrough && spread / border.length < 24
  const doCut = cut === 'auto' ? hasBackdrop : cut && hasBackdrop

  if (doCut) {
    // flood in from the border, so a white belly inside an outline is left alone
    const gone = new Uint8Array(w * h)
    const stack = border.filter((i) => far(i) < 44)
    for (const i of stack) gone[i] = 1
    while (stack.length) {
      const i = stack.pop()!
      const x = i % w
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (n < 0 || n >= w * h || gone[n] || far(n) >= 44) continue
        gone[n] = 1
        stack.push(n)
      }
    }
    for (let i = 0; i < w * h; i++) {
      if (gone[i]) px[i * 4 + 3] = 0
      else if (gone[i - 1] || gone[i + 1] || gone[i - w] || gone[i + w]) {
        // soften the cut edge, so no pale fringe is left behind
        px[i * 4 + 3] *= Math.max(0.3, Math.min(1, (far(i) - 30) / 60))
      }
    }
    ctx.putImageData(image, 0, 0)
  }

  // trim to what's actually there
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] < 14) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < x0 || y1 < y0) {
    // cutting left nothing: the whole picture was "backdrop", so keep it whole
    return cut === false ? { src: canvas.toDataURL('image/png'), aspect: w / h, hasBackdrop, cut: false } : prepareArt(source, false, max)
  }
  const tw = x1 - x0 + 1
  const th = y1 - y0 + 1
  const out = document.createElement('canvas')
  out.width = tw
  out.height = th
  out.getContext('2d')!.drawImage(canvas, x0, y0, tw, th, 0, 0, tw, th)
  let src = out.toDataURL('image/webp', 0.92)
  if (!src.startsWith('data:image/webp')) src = out.toDataURL('image/png')
  return { src, aspect: tw / th, hasBackdrop, cut: doCut }
}
