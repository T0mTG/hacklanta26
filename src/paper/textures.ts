import { SRGBColorSpace, Texture, TextureLoader } from 'three'
import type { PaperEntry } from './types'

const loader = new TextureLoader()
const cache = new Map<string, Promise<Texture>>()

// The cut-out's picture as a texture. Loaded once per cut-out and kept; the world waits for the ones it needs.
export function loadCutout(e: Pick<PaperEntry, 'id' | 'url'>): Promise<Texture> {
  let p = cache.get(e.id)
  if (!p) {
    p = new Promise<Texture>((res, rej) => {
      loader.load(
        e.url,
        (t) => {
          t.colorSpace = SRGBColorSpace
          t.anisotropy = 4
          res(t)
        },
        undefined,
        () => rej(new Error(`cut-out ${e.id} failed to load`)),
      )
    })
    cache.set(e.id, p)
  }
  return p
}

export const loadedCutout = (id: string) => textures.get(id)
const textures = new Map<string, Texture>()

// Load many at once; the ones that fail are skipped so one missing file never blocks the planet.
export async function loadCutouts(entries: Pick<PaperEntry, 'id' | 'url'>[]) {
  await Promise.all(
    entries.map((e) =>
      loadCutout(e).then((t) => { textures.set(e.id, t) }).catch((err) => { if (import.meta.env.DEV) console.warn(err.message) }),
    ),
  )
}
