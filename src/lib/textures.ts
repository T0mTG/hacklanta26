import { useEffect, useState } from 'react'
import { CanvasTexture, SRGBColorSpace, Texture } from 'three'
import type { Artwork } from '../data/types'

const cache = new Map<string, Texture>()
let fallback: Texture | null = null

// Soft checkerboard shown for a moment while the real picture loads
function placeholder() {
  if (fallback) return fallback
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? '#fbf5e6' : '#f1e3c4'
    g.fillRect(x * 16, y * 16, 16, 16)
  }
  fallback = new CanvasTexture(c)
  fallback.colorSpace = SRGBColorSpace
  return fallback
}

// A texture is only created once its image has fully loaded. Swapping the image of a texture the GPU already holds
// is not supported when the size changes, so we never do that: the placeholder is its own texture.
export function loadTexture(art: Pick<Artwork, 'id' | 'src'>): Promise<Texture> {
  const hit = cache.get(art.id)
  if (hit) return Promise.resolve(hit)
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = async () => {
      await img.decode?.().catch(() => {})
      const tex = new Texture(img)
      tex.colorSpace = SRGBColorSpace
      tex.anisotropy = 8
      tex.needsUpdate = true
      cache.set(art.id, tex)
      res(tex)
    }
    img.onerror = () => rej(new Error('texture failed'))
    img.src = art.src
  })
}

// The drawing's texture for rendering: the placeholder first, the real picture as soon as it is ready
export function useArtTexture(art: Pick<Artwork, 'id' | 'src'>) {
  const [tex, setTex] = useState<Texture>(() => cache.get(art.id) ?? placeholder())
  useEffect(() => {
    let alive = true
    loadTexture(art).then((t) => { if (alive) setTex(t) }).catch(() => {})
    return () => { alive = false }
  }, [art.id, art.src]) // eslint-disable-line react-hooks/exhaustive-deps
  return tex
}

export function forgetTexture(id: string) {
  cache.get(id)?.dispose()
  cache.delete(id)
}
