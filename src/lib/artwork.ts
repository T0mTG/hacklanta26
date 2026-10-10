import * as THREE from 'three'
import type { Artwork, Role } from '../data/types'

export const DEMOS = [
  { name: 'logo_FINAL_v7.svg', url: '/demo/logo_FINAL_v7.svg', title: 'Logo' },
  { name: 'poster_concert.svg', url: '/demo/poster_concert.svg', title: 'Poster' },
  { name: 'app_dashboard_v3.svg', url: '/demo/app_dashboard_v3.svg', title: 'UI mockup' },
  { name: 'illustration_girl.svg', url: '/demo/illustration_girl.svg', title: 'Illustration' },
]
export const QUOTES = [
  'Client requested something more exciting.', 'Maybe next quarter.', 'FINAL_FINAL_v7',
  'They said the first version was better.', 'Rejected but still beautiful.', 'Could you make the logo bigger?',
  'Love it! Can we start over?', "Moved to the 'Archive' folder. Never opened again.",
  'Died doing what it loved: being exported at 72 DPI.',
]
export const ROLES: { role: Role; label: string }[] = [
  { role: 'creature', label: 'creature' }, { role: 'billboard', label: 'billboard' },
  { role: 'house', label: 'house' }, { role: 'doll', label: 'doll' }, { role: 'relic', label: 'relic' },
]
export const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
export const MAX_BYTES = 15 * 1024 * 1024
export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

export function guessRole(name: string, aspect: number): Role {
  if (/draft|wip/i.test(name)) return 'relic'
  if (aspect < 0.65) return 'billboard'
  if (aspect < 0.9) return 'doll'
  if (aspect < 1.25) return 'creature'
  return 'house'
}

function placeholder(): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#F4E9D8' : '#8E7CC3'; g.fillRect(x * 16, y * 16, 16, 16) }
  return c
}

export function validate(file: File): string | null {
  if (!ACCEPT.includes(file.type)) return 'That file type cannot enter the afterlife. Try png, jpg, webp, svg or gif.'
  if (file.size > MAX_BYTES) return 'Too heavy to float. Keep it under 15 MB.'
  return null
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = url
  })
}

export async function makeArtwork(url: string, name: string, role?: Role): Promise<Artwork> {
  let canvas: HTMLCanvasElement, aspect = 1, color = '#8E7CC3'
  try {
    const img = await loadImg(url)
    const w0 = img.naturalWidth || 512, h0 = img.naturalHeight || 512
    aspect = w0 / h0
    const s = 512 / Math.max(w0, h0) > 1 && w0 < 256 && h0 < 256 ? 512 / Math.max(w0, h0) : Math.min(1, 512 / Math.max(w0, h0))
    canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(w0 * s)); canvas.height = Math.max(1, Math.round(h0 * s))
    const g = canvas.getContext('2d')!
    g.drawImage(img, 0, 0, canvas.width, canvas.height)
    try {
      const d = g.getImageData(0, 0, canvas.width, canvas.height).data
      let r = 0, gg = 0, b = 0, n = 0
      for (let i = 0; i < d.length; i += 4 * 37) { if (d[i + 3] > 40) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++ } }
      if (n) color = `rgb(${Math.round(r / n)},${Math.round(gg / n)},${Math.round(b / n)})`
    } catch { /* tainted canvas: keep default color */ }
  } catch {
    canvas = placeholder(); aspect = 1
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  const clean = name.replace(/\.[^.]+$/, '')
  return {
    id: Math.random().toString(36).slice(2, 9), name: clean, texture: tex, aspect,
    role: role ?? guessRole(name, aspect), label: `${clean}: ${pick(QUOTES)}`, color, url,
  }
}
