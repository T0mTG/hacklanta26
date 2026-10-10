import { GLOBE_PARAM } from '../lib/env'

// Two planets share one codebase: the same terrain, camera, sky, clouds and UI kit. A "world variant" is everything that is
// different: what stands on the ground, how the terrain is colored, and which saved data belongs to it.
export type GlobeId = 'toy' | 'paper'

export interface VariantInfo {
  id: GlobeId
  name: string
  blurb: string
  terrain: 'toy' | 'paper' // which color palette the ground gets
  storageKey: string // the saved planet lives under its own localStorage key
}

export const VARIANTS: Record<GlobeId, VariantInfo> = {
  toy: { id: 'toy', name: 'Toy Globe', blurb: 'Easels and tiny toy people', terrain: 'toy', storageKey: 'doodle-planet:v1' },
  paper: { id: 'paper', name: 'Paper Globe', blurb: 'Every drawing cut out and standing up', terrain: 'paper', storageKey: 'doodle-planet:paper:v1' },
}

export const GLOBE_KEY = 'doodle-planet:globe' // the globe you used last, so a reload stays on it

const isGlobe = (v: string | null | undefined): v is GlobeId => v === 'toy' || v === 'paper'

// ?globe=paper wins, then whatever you picked last time, then the toy globe
export function initialGlobe(): GlobeId {
  if (isGlobe(GLOBE_PARAM)) return GLOBE_PARAM
  try {
    const saved = localStorage.getItem(GLOBE_KEY)
    if (isGlobe(saved)) return saved
  } catch { /* storage may be blocked */ }
  return 'toy'
}

export function rememberGlobe(g: GlobeId) {
  try { localStorage.setItem(GLOBE_KEY, g) } catch { /* ignore */ }
}
