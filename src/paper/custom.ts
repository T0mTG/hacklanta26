import type { PaperCustom } from '../data/types'
import type { DrawnCutout } from './draw/cutout'
import { FALLBACK_KIND, KINDS } from './kinds'
import { registerEntry } from './library'
import type { PaperScene } from './PaperScene'
import { loadCutouts, loadedCutout } from './textures'
import type { Face, PaperEntry } from './types'

// Things the kid drew on the whiteboard are cut-outs like the library's, only made on the spot. They become a PaperEntry (the same
// record the library's cut-outs are), live in the kid's saved data, and are stood up again from it on the next visit.

export const newCustomId = () => `mine-${Math.random().toString(36).slice(2, 8)}`

export interface Answer { kind: string; label: string; face: Face }

export function entryFromDrawing(cut: DrawnCutout, a: Answer, id = newCustomId()): PaperEntry {
  const k = KINDS[a.kind] ?? FALLBACK_KIND
  return {
    id, label: a.label, kind: KINDS[a.kind] ? a.kind : 'thing', face: a.face,
    w: cut.w, h: cut.h, anchor: cut.anchor, colors: cut.colors, outline: cut.outline,
    rawFit: cut.rawFit, rawSize: cut.pictureSize,
    shape: k.shape, behavior: k.behavior, size: k.size, back: k.back ?? 'mirror', cards: k.cards ?? 2, speed: k.speed ?? 0.5, radius: k.radius ?? 0.3, perch: !!k.perch,
    aspect: cut.w / cut.h, url: cut.cutUrl, custom: true,
    ...(k.shape === 'building' ? { eave: cut.eave, roof: cut.roof } : {}),
  }
}

export const saveOfEntry = (e: PaperEntry): PaperCustom => ({
  kind: e.kind, label: e.label, face: e.face, w: e.w, h: e.h, anchor: e.anchor, colors: e.colors, outline: e.outline, url: e.url,
  eave: e.eave, roof: e.roof, rawFit: e.rawFit, rawSize: e.rawSize,
})

export function entryFromSave(id: string, c: PaperCustom): PaperEntry {
  const k = KINDS[c.kind] ?? FALLBACK_KIND
  return {
    id, label: c.label, kind: c.kind, face: c.face,
    w: c.w, h: c.h, anchor: c.anchor, colors: c.colors, outline: c.outline,
    rawFit: c.rawFit, rawSize: c.rawSize,
    shape: k.shape, behavior: k.behavior, size: k.size, back: k.back ?? 'mirror', cards: k.cards ?? 2, speed: k.speed ?? 0.5, radius: k.radius ?? 0.3, perch: !!k.perch,
    aspect: c.w / c.h, url: c.url, custom: true, eave: c.eave, roof: c.roof,
  }
}

// Make an entry usable: known by id, its picture loaded as a texture and handed to the scene (if there is one yet)
export async function prepareEntry(e: PaperEntry, scene: PaperScene | null) {
  registerEntry(e)
  await loadCutouts([e])
  const tex = loadedCutout(e.id)
  if (tex && scene) scene.addTexture(e.id, tex)
  return !!tex
}
