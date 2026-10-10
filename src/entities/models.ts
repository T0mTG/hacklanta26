import { Kit, P, type Built, type V3 } from '../lib/kit'
import type { Look } from './looks'

const PI = Math.PI
const once = <T,>(fn: () => T) => {
  let v: T | undefined
  return () => (v ??= fn())
}

// ---------------------------------------------------------------- easel
// Model space: ground at y = 0, the picture faces +Z. The board hangs on the frame leaning back a touch.
export const EASEL = once(() => {
  const wood = '#c88a54', dark = '#a96d3b'
  const k = new Kit(200)
  for (const s of [-1, 1]) k.add(P.box(0.07, 1.3, 0.07), wood, { p: [s * 0.4, 0.64, 0.12], r: [-0.14, 0, s * 0.03] })
  k.add(P.box(0.07, 1.25, 0.07), dark, { p: [0, 0.6, -0.5], r: [0.5, 0, 0] })
  k.add(P.box(0.92, 0.05, 0.17), '#d9a066', { p: [0, 0.34, 0.1] })
  k.add(P.box(0.86, 0.06, 0.1), dark, { p: [0, 1.3, -0.02] })
  k.add(P.box(0.8, 0.05, 0.05), dark, { p: [0, 0.75, -0.12] })
  for (const [x, c] of [[-0.3, '#ee6c4d'], [-0.1, '#f2c14e'], [0.1, '#6fb8e8'], [0.3, '#8fd694']] as [number, string][]) {
    k.add(P.sphere(0.04, 5, 4), c, { p: [x, 0.385, 0.12], s: [1, 0.55, 1], shade: 0 })
  }
  const board = new Kit(201)
  board.add(P.box(1.0, 0.8, 0.04), '#fffdf6', { outline: 0.03, shade: 0.02 })
  return { frame: k.build(), board: board.build() }
})

// where the picture sits on the board, and where the little sticky notes are pinned (x, y, tilt)
export const BOARD_FIT = { w: 0.9, h: 0.7 }
export const NOTE_SPOTS: [number, number, number][] = [[-0.4, 0.3, 0.2], [0.42, 0.32, -0.15], [-0.43, -0.28, -0.2], [0.4, -0.3, 0.18], [0.02, 0.38, 0.08], [0.02, -0.38, -0.1]]

// ---------------------------------------------------------------- people
// Four meshes per person: the upper body (torso, head, face, hair) never moves relative to itself, arms and legs hang from pivots.
export interface PersonParts { body: Built; arm: Built; leg: Built }
const personCache = new Map<string, PersonParts>()

export function buildPerson(look: Look): PersonParts {
  const key = JSON.stringify(look)
  const hit = personCache.get(key)
  if (hit) return hit
  const seed = personCache.size * 11 + 400
  const b = new Kit(seed)
  if (look.skirt) {
    b.add(P.box(0.28, 0.24, 0.17), look.top, { p: [0, 0.48, 0] })
    b.add(P.cyl(0.13, 0.23, 0.22, 7), look.bottom, { p: [0, 0.31, 0] })
  } else b.add(P.box(0.3, 0.3, 0.18), look.top, { p: [0, 0.45, 0] })
  b.add(P.ico(0.17, 1), look.skin, { p: [0, 0.77, 0], s: [1, 0.96, 1], shade: 0.03 })
  for (const x of [-0.065, 0.065]) b.add(P.sphere(0.022, 5, 4), '#22333b', { p: [x, 0.79, 0.15], shade: 0 })
  for (const x of [-0.105, 0.105]) b.add(P.sphere(0.03, 5, 4), '#f6a6b8', { p: [x, 0.735, 0.12], s: [1, 0.7, 0.5], shade: 0 })
  b.add(P.box(0.05, 0.012, 0.01), '#b8584f', { p: [0, 0.715, 0.162], shade: 0 })

  const cap = () => b.add(P.ico(0.185, 1), look.hair, { p: [0, 0.8, -0.02], s: [1, 0.8, 1.04], shade: 0.04 })
  switch (look.style) {
    case 'cap': cap(); break
    case 'spiky':
      cap()
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * PI * 2
        b.add(P.cone(0.05, 0.13, 4), look.hair, { p: [Math.cos(a) * 0.09, 0.94, Math.sin(a) * 0.09 - 0.02], r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4] })
      }
      break
    case 'bun': cap(); b.add(P.sphere(0.07, 6, 5), look.hair, { p: [0, 0.96, -0.07] }); break
    case 'pigtails':
      cap()
      for (const x of [-0.18, 0.18]) b.add(P.sphere(0.06, 5, 4), look.hair, { p: [x, 0.72, -0.03] })
      break
    case 'messy':
      cap()
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * PI * 2
        b.add(P.dodeca(0.065), look.hair, { p: [Math.cos(a) * 0.13, 0.87 + (i % 2) * 0.03, Math.sin(a) * 0.13 - 0.03], jitter: 0.012 })
      }
      b.add(P.dodeca(0.08), look.hair, { p: [0, 0.97, -0.03], jitter: 0.012 })
      break
    case 'hat':
      b.add(P.ico(0.18, 1), look.hair, { p: [0, 0.79, -0.02], s: [1, 0.7, 1] })
      b.add(P.cyl(0.27, 0.27, 0.025, 10), '#e8cf86', { p: [0, 0.9, 0] })
      b.add(P.cyl(0.12, 0.15, 0.1, 8), '#e8cf86', { p: [0, 0.96, 0] })
      b.add(P.cyl(0.152, 0.152, 0.03, 8), '#d9534f', { p: [0, 0.93, 0] })
      break
    default: break
  }
  if (look.glasses) {
    for (const x of [-0.065, 0.065]) b.add(P.torus(0.034, 0.007, 4, 10), '#22333b', { p: [x, 0.79, 0.165], shade: 0 })
    b.add(P.box(0.03, 0.008, 0.008), '#22333b', { p: [0, 0.79, 0.168], shade: 0 })
  }
  if (look.pack) {
    b.add(P.box(0.22, 0.26, 0.1), look.pack, { p: [0, 0.46, -0.14], outline: 0.015 })
    b.add(P.box(0.14, 0.1, 0.03), '#fbf5e6', { p: [0, 0.42, -0.2] })
  }
  if (look.scarf) b.add(P.torus(0.12, 0.035, 5, 10), look.scarf, { p: [0, 0.62, 0], r: [PI / 2, 0, 0] })

  const arm = new Kit(seed + 1)
  arm.add(P.box(0.085, 0.24, 0.085), look.top, { p: [0, -0.12, 0] })
  arm.add(P.sphere(0.045, 5, 4), look.skin, { p: [0, -0.26, 0], shade: 0.02 })
  const leg = new Kit(seed + 2)
  leg.add(P.box(0.11, 0.26, 0.11), look.skirt ? look.skin : look.bottom, { p: [0, -0.13, 0] })
  leg.add(P.box(0.125, 0.06, 0.17), '#3a3a46', { p: [0, -0.285, 0.02] })
  const parts = { body: b.build(), arm: arm.build(), leg: leg.build() }
  personCache.set(key, parts)
  return parts
}

export const PERSON_PIVOTS = { hip: [0.075, 0.3, 0] as V3, shoulder: [0.19, 0.58, 0] as V3 }

// ---------------------------------------------------------------- animals
// Quadrupeds are a body plus two leg pairs that swing in a trot (diagonal legs together), and an optional tail.
export interface Quad { body: Built; legsA: Built; legsB: Built; hip: number; stride: number; tail?: { built: Built; pivot: V3; wag: number } }

function legPair(seed: number, pairs: [number, number][], len: number, rTop: number, rBot: number, color: string, hoof?: string) {
  const k = new Kit(seed)
  for (const [x, z] of pairs) {
    k.add(P.cyl(rTop, rBot, len, 4), color, { p: [x, -len / 2, z] })
    if (hoof) k.add(P.cyl(rBot * 1.15, rBot * 1.15, 0.05, 4), hoof, { p: [x, -len + 0.025, z] })
  }
  return k.build()
}

export const SHEEP = once((): Quad => {
  const b = new Kit(300)
  b.add(P.ico(0.3, 1), '#f7f3e8', { p: [0, 0.4, 0], s: [1, 0.85, 1.22], jitter: 0.03, shade: 0.05 })
  for (const [x, y, z] of [[0, 0.64, 0.05], [0.15, 0.6, -0.2], [-0.15, 0.6, -0.2], [0.17, 0.54, 0.2], [-0.17, 0.54, 0.2]]) b.add(P.ico(0.13, 0), '#fffaf0', { p: [x, y, z], jitter: 0.02 })
  b.add(P.ico(0.125, 1), '#4a4a52', { p: [0, 0.48, 0.4], s: [0.9, 1, 1.1] })
  for (const x of [-0.12, 0.12]) b.add(P.box(0.08, 0.04, 0.12), '#4a4a52', { p: [x, 0.52, 0.34], r: [0, 0, x > 0 ? -0.5 : 0.5] })
  for (const x of [-0.05, 0.05]) b.add(P.sphere(0.018, 4, 3), '#f6efe0', { p: [x, 0.52, 0.5], shade: 0 })
  b.add(P.ico(0.07, 0), '#fffaf0', { p: [0, 0.46, -0.36] })
  const a = legPair(301, [[-0.13, 0.2], [0.13, -0.2]], 0.27, 0.04, 0.035, '#4a4a52')
  const c = legPair(302, [[0.13, 0.2], [-0.13, -0.2]], 0.27, 0.04, 0.035, '#4a4a52')
  return { body: b.build(), legsA: a, legsB: c, hip: 0.27, stride: 0.55 }
})

export const COW = once((): Quad => {
  const b = new Kit(310)
  b.add(P.ico(0.42, 1), '#fbf5e6', { p: [0, 0.62, 0], s: [0.68, 0.62, 1.12], jitter: 0.02, shade: 0.04 })
  for (const [x, y, z, sx] of [[0.25, 0.7, 0.12, 0.45], [-0.25, 0.62, -0.2, 0.45], [0.0, 0.9, -0.12, 1.1], [-0.24, 0.72, 0.25, 0.4]]) {
    b.add(P.ico(0.17, 0), '#2c2c34', { p: [x, y, z], s: [sx, 0.9, 1.15], jitter: 0.015 })
  }
  b.add(P.box(0.26, 0.26, 0.3), '#fbf5e6', { p: [0, 0.74, 0.6] })
  b.add(P.box(0.2, 0.12, 0.1), '#f6a6b8', { p: [0, 0.66, 0.76] })
  for (const x of [-0.07, 0.07]) b.add(P.sphere(0.02, 4, 3), '#22333b', { p: [x, 0.8, 0.74], shade: 0 })
  for (const x of [-0.1, 0.1]) {
    b.add(P.cone(0.03, 0.1, 4), '#f0e0b0', { p: [x, 0.93, 0.56] })
    b.add(P.box(0.1, 0.05, 0.07), '#2c2c34', { p: [x * 1.9, 0.82, 0.55], r: [0, 0, x > 0 ? -0.4 : 0.4] })
  }
  b.add(P.box(0.04, 0.3, 0.04), '#fbf5e6', { p: [0, 0.6, -0.55], r: [0.15, 0, 0] })
  b.add(P.sphere(0.05, 4, 3), '#2c2c34', { p: [0, 0.44, -0.58] })
  const a = legPair(311, [[-0.17, 0.32], [0.17, -0.32]], 0.4, 0.055, 0.05, '#fbf5e6', '#3a3a46')
  const c = legPair(312, [[0.17, 0.32], [-0.17, -0.32]], 0.4, 0.055, 0.05, '#fbf5e6', '#3a3a46')
  return { body: b.build(), legsA: a, legsB: c, hip: 0.42, stride: 0.45 }
})

export const CAT = once((): Quad => {
  const orange = '#f0a04a'
  const b = new Kit(320)
  b.add(P.ico(0.12, 1), orange, { p: [0, 0.2, 0], s: [0.85, 0.85, 1.5], shade: 0.04 })
  for (const z of [-0.08, 0.02]) b.add(P.box(0.2, 0.025, 0.04), '#d9822b', { p: [0, 0.31, z] })
  b.add(P.ico(0.07, 0), '#fff3e0', { p: [0, 0.17, 0.13] })
  b.add(P.ico(0.1, 1), orange, { p: [0, 0.3, 0.2] })
  for (const x of [-0.06, 0.06]) {
    b.add(P.cone(0.04, 0.09, 3), orange, { p: [x, 0.4, 0.19], r: [0, 0, x > 0 ? -0.2 : 0.2] })
    b.add(P.sphere(0.017, 4, 3), '#22333b', { p: [x * 0.65, 0.32, 0.29], shade: 0 })
  }
  b.add(P.sphere(0.014, 4, 3), '#f08aa0', { p: [0, 0.285, 0.3], shade: 0 })
  const a = legPair(321, [[-0.06, 0.12], [0.06, -0.12]], 0.14, 0.025, 0.022, orange)
  const c = legPair(322, [[0.06, 0.12], [-0.06, -0.12]], 0.14, 0.025, 0.022, orange)
  const t = new Kit(323)
  t.add(P.cyl(0.02, 0.025, 0.14, 4), orange, { p: [0, 0.06, -0.03], r: [-0.3, 0, 0] })
  t.add(P.cyl(0.02, 0.02, 0.12, 4), orange, { p: [0, 0.17, -0.09], r: [-0.9, 0, 0] })
  t.add(P.sphere(0.025, 4, 3), '#fff3e0', { p: [0, 0.21, -0.17] })
  return { body: b.build(), legsA: a, legsB: c, hip: 0.14, stride: 0.7, tail: { built: t.build(), pivot: [0, 0.2, -0.17], wag: 0.35 } }
})

export const DOG = once((): Quad => {
  const gold = '#e5b24d'
  const b = new Kit(330)
  b.add(P.ico(0.18, 1), gold, { p: [0, 0.3, 0], s: [0.8, 0.85, 1.55], shade: 0.04 })
  b.add(P.ico(0.13, 1), gold, { p: [0, 0.42, 0.3] })
  b.add(P.box(0.1, 0.08, 0.12), '#d99a3a', { p: [0, 0.38, 0.42] })
  b.add(P.sphere(0.03, 4, 3), '#22333b', { p: [0, 0.395, 0.485], shade: 0 })
  for (const x of [-0.1, 0.1]) {
    b.add(P.box(0.06, 0.14, 0.04), '#b8801f', { p: [x, 0.42, 0.28], r: [0, 0, x > 0 ? -0.3 : 0.3] })
    b.add(P.sphere(0.018, 4, 3), '#22333b', { p: [x * 0.6, 0.45, 0.4], shade: 0 })
  }
  b.add(P.torus(0.1, 0.02, 4, 10), '#ee6c4d', { p: [0, 0.35, 0.22], r: [PI / 2.4, 0, 0] })
  const a = legPair(331, [[-0.09, 0.2], [0.09, -0.2]], 0.2, 0.04, 0.035, gold)
  const c = legPair(332, [[0.09, 0.2], [-0.09, -0.2]], 0.2, 0.04, 0.035, gold)
  const t = new Kit(333)
  t.add(P.box(0.04, 0.04, 0.2), gold, { p: [0, 0.05, -0.08], r: [0.7, 0, 0] })
  return { body: b.build(), legsA: a, legsB: c, hip: 0.2, stride: 0.6, tail: { built: t.build(), pivot: [0, 0.34, -0.28], wag: 0.6 } }
})

export const RABBIT = once(() => {
  const k = new Kit(340)
  k.add(P.ico(0.13, 1), '#f3eee6', { p: [0, 0.15, 0], s: [0.9, 0.9, 1.3], shade: 0.04 })
  k.add(P.ico(0.09, 1), '#f3eee6', { p: [0, 0.24, 0.15] })
  for (const x of [-0.04, 0.04]) {
    k.add(P.box(0.035, 0.2, 0.02), '#f3eee6', { p: [x, 0.4, 0.12], r: [-0.15, 0, x > 0 ? -0.08 : 0.08] })
    k.add(P.box(0.018, 0.14, 0.01), '#f6a6b8', { p: [x, 0.4, 0.13], r: [-0.15, 0, x > 0 ? -0.08 : 0.08], shade: 0 })
    k.add(P.sphere(0.015, 4, 3), '#22333b', { p: [x * 1.1, 0.26, 0.22], shade: 0 })
  }
  k.add(P.sphere(0.045, 5, 4), '#ffffff', { p: [0, 0.17, -0.18] })
  k.add(P.sphere(0.014, 4, 3), '#f08aa0', { p: [0, 0.23, 0.245], shade: 0 })
  return k.build()
})

export const DUCK = once(() => {
  const k = new Kit(350)
  k.add(P.ico(0.13, 1), '#f7d84a', { p: [0, 0.1, 0], s: [1, 0.85, 1.35], shade: 0.04 })
  k.add(P.ico(0.08, 1), '#f7d84a', { p: [0, 0.2, 0.14] })
  k.add(P.cone(0.035, 0.08, 4), '#f29a3c', { p: [0, 0.19, 0.235], r: [PI / 2, 0, 0] })
  for (const x of [-0.11, 0.11]) k.add(P.ico(0.07, 0), '#e8c53a', { p: [x, 0.12, -0.02], s: [0.4, 0.6, 1] })
  for (const x of [-0.04, 0.04]) k.add(P.sphere(0.014, 4, 3), '#22333b', { p: [x, 0.22, 0.2], shade: 0 })
  k.add(P.cone(0.04, 0.09, 3), '#f7d84a', { p: [0, 0.16, -0.17], r: [-0.8, 0, 0] })
  return k.build()
})
