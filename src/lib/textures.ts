import { SRGBColorSpace, Texture } from 'three'
import type { Artwork } from '../data/types'

const cache = new Map<string, Texture>()

// Soft checkerboard shown for a moment while the real picture loads
function placeholder() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? '#fbf5e6' : '#f1e3c4'
    g.fillRect(x * 16, y * 16, 16, 16)
  }
  return c
}

// One texture per drawing, created on first use. It starts as the placeholder and swaps in the picture when it has loaded.
export function getTexture(art: Pick<Artwork, 'id' | 'src'>): Texture {
  const hit = cache.get(art.id)
  if (hit) return hit
  const tex = new Texture()
  tex.image = placeholder()
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  cache.set(art.id, tex)
  const img = new Image()
  img.onload = () => {
    tex.image = img
    tex.needsUpdate = true
  }
  img.onerror = () => { /* keep the placeholder */ }
  img.src = art.src
  return tex
}

export function forgetTexture(id: string) {
  cache.get(id)?.dispose()
  cache.delete(id)
}
