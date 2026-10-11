import { CUTOUTS } from './library.gen'
import { FALLBACK_KIND, KINDS } from './kinds'
import type { PaperEntry } from './types'

// Every cut-out with the defaults of its kind filled in: { id, label, kind, shape, behavior, size, ... }
export const LIBRARY: PaperEntry[] = CUTOUTS.map((c) => {
  const k = KINDS[c.kind] ?? FALLBACK_KIND
  if (import.meta.env.DEV && !KINDS[c.kind]) console.warn(`[paper] "${c.id}" has kind "${c.kind}", which is not in kinds.ts`)
  return {
    ...c,
    shape: c.shape ?? k.shape,
    behavior: c.behavior ?? k.behavior,
    size: c.size ?? k.size,
    back: c.back ?? k.back ?? 'mirror',
    cards: c.cards ?? k.cards ?? 2,
    speed: k.speed ?? 0.5,
    radius: k.radius ?? 0.3,
    perch: !!k.perch,
    aspect: c.w / c.h,
    url: `/paper/${c.id}.webp`,
    rawUrl: c.shelf ? `/paper/raw/${c.id}.jpg` : undefined,
  }
})

export const BY_ID = new Map(LIBRARY.map((e) => [e.id, e]))
// a drawing the kid made joins the lookup (it is not in LIBRARY, which is only what ships with the app)
export const registerEntry = (e: PaperEntry) => { BY_ID.set(e.id, e) }
export const entryOf = (id: string) => BY_ID.get(id)

// the pictures a kid can pick from the demo shelf (each one is a drawing of ONE element)
export const SHELF = LIBRARY.filter((e) => e.shelf)

export const byKind = (kind: string) => LIBRARY.filter((e) => e.kind === kind)
