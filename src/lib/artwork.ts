import type { Artwork } from '../data/types'

const MAX_BYTES = 15 * 1024 * 1024
const MAX_SIDE = 800 // longest side kept for uploads: crisp on screen, small enough to remember in localStorage
const OK_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp', 'image/avif']
const OK_EXT = /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i

// A friendly message when the file cannot be used, or null when it is fine
export function checkFile(file: File): string | null {
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    return 'That is a phone-photo format we cannot open yet. Share it as a JPG or PNG and try again!'
  }
  const okType = OK_TYPES.includes(file.type) || (file.type === '' && OK_EXT.test(file.name))
  if (!okType) return "Oops! That doesn't look like a picture. Try a JPG, PNG or WEBP."
  if (file.size === 0) return 'That file is empty. Try another picture!'
  if (file.size > MAX_BYTES) return 'That picture is too big! Try one under 15 MB.'
  return null
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => rej(new Error('decode failed'))
    img.src = url
  })
}

interface Decoded { source: CanvasImageSource; w: number; h: number; close?: () => void }

// SVGs go through <img>. Everything else uses createImageBitmap, which respects the rotation stored in phone photos.
async function decode(blob: Blob): Promise<Decoded> {
  if (blob.type !== 'image/svg+xml' && 'createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
      return { source: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() }
    } catch { /* fall back to <img> below */ }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    await img.decode?.().catch(() => {})
    return { source: img, w: img.naturalWidth || 800, h: img.naturalHeight || 600 }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export interface Processed { dataUrl: string; aspect: number; palette: string[] }

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
const FALLBACK_PALETTE = ['#4a5a62', '#9aa7ab', '#e6e1d4']

// The crayon colors of a drawing: skips the paper and the black outlines, prefers vivid buckets, keeps them distinct
function paletteOf(data: Uint8ClampedArray) {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number; w: number }>()
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    if (max > 232 && sat < 0.14) continue // paper
    if (max < 45) continue // ink
    if (sat < 0.12 && max > 140) continue // grey paper shadows
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
    const k = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, w: 0 }
    k.r += r; k.g += g; k.b += b; k.n++; k.w += 1 + sat * 2
    buckets.set(key, k)
  }
  const ranked = [...buckets.values()].sort((a, b) => b.w - a.w)
  const out: { r: number; g: number; b: number }[] = []
  for (const k of ranked) {
    const c = { r: k.r / k.n, g: k.g / k.n, b: k.b / k.n }
    if (out.every((o) => Math.hypot(o.r - c.r, o.g - c.g, o.b - c.b) > 70)) out.push(c)
    if (out.length === 4) break
  }
  const colors = out.map((c) => hex(c.r, c.g, c.b))
  return colors.length >= 2 ? colors : FALLBACK_PALETTE
}

// Decode, shrink, flatten onto white, read the palette. `keepData` also returns a JPEG data URL we can remember.
export async function processBlob(blob: Blob, keepData: boolean): Promise<Processed> {
  const d = await decode(blob)
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(d.w, d.h))
    const w = Math.max(1, Math.round(d.w * scale)), h = Math.max(1, Math.round(d.h * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(d.source, 0, 0, w, h)

    const small = document.createElement('canvas')
    const s = 56 / Math.max(w, h)
    small.width = Math.max(1, Math.round(w * s)); small.height = Math.max(1, Math.round(h * s))
    const sctx = small.getContext('2d', { willReadFrequently: true })!
    sctx.drawImage(canvas, 0, 0, small.width, small.height)
    let palette = FALLBACK_PALETTE
    try { palette = paletteOf(sctx.getImageData(0, 0, small.width, small.height).data) } catch { /* tainted: keep fallback */ }

    return { dataUrl: keepData ? canvas.toDataURL('image/jpeg', 0.8) : '', aspect: d.w / d.h, palette }
  } finally {
    d.close?.()
  }
}

export async function processUrl(url: string, keepData = false): Promise<Processed> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('fetch failed')
  return processBlob(await res.blob(), keepData)
}

// "my-cool_dog.PNG" -> "My Cool Dog"; camera names like IMG_1234 become "My Drawing"
export function titleFromName(name: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!base || /^\d+$/.test(base) || /^(img|dsc|dscn|image|photo|screenshot|scan|pic|picture)[\s\d]*$/i.test(base)) return 'My Drawing'
  return base.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 28)
}

export const makeId = () => Math.random().toString(36).slice(2, 9)

export function buildArtwork(a: Pick<Artwork, 'title' | 'artist' | 'story' | 'src' | 'aspect' | 'palette' | 'kind'>): Artwork {
  return { ...a, id: makeId(), at: Date.now(), notes: [], dir: [0, 1, 0], yaw: 0 }
}
