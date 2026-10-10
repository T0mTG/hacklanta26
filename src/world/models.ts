import { SphereGeometry, type Vector3 } from 'three'
import { Kit, P, type Built } from '../lib/kit'

const PI = Math.PI
const once = <T,>(fn: () => T) => {
  let v: T | undefined
  return () => (v ??= fn())
}

// ---------------------------------------------------------------- trees
function roundTree(seed: number, canopy: [string, string, string, string], trunk: string): Built {
  const k = new Kit(seed)
  k.add(P.cyl(0.09, 0.15, 0.9, 5), trunk, { p: [0, 0.45, 0], shade: 0.1 })
  k.add(P.dodeca(0.62), canopy[0], { p: [0, 1.28, 0], jitter: 0.07, outline: 0.055, r: [0.3, 0.5, 0] })
  k.add(P.dodeca(0.46), canopy[1], { p: [0.38, 1.06, 0.14], jitter: 0.06, outline: 0.05, r: [0.6, 0.1, 0.2] })
  k.add(P.dodeca(0.5), canopy[2], { p: [-0.33, 1.1, -0.12], jitter: 0.06, outline: 0.05, r: [0.1, 0.9, 0.4] })
  k.add(P.dodeca(0.4), canopy[3], { p: [0.04, 1.72, 0.04], jitter: 0.05, outline: 0.05 })
  return k.build()
}

function pineTree(): Built {
  const k = new Kit(4)
  k.add(P.cyl(0.08, 0.12, 0.5, 5), '#6e4e34', { p: [0, 0.25, 0] })
  k.add(P.cone(0.7, 0.9, 7), '#2f7d4f', { p: [0, 0.82, 0], jitter: 0.04, outline: 0.05 })
  k.add(P.cone(0.56, 0.85, 7), '#37895a', { p: [0, 1.3, 0], jitter: 0.04, outline: 0.05 })
  k.add(P.cone(0.4, 0.8, 7), '#3f9763', { p: [0, 1.76, 0], jitter: 0.03, outline: 0.045 })
  return k.build()
}

// flat-topped pine, like the ones on the reference island
function bonsaiTree(): Built {
  const k = new Kit(5)
  k.add(P.cyl(0.07, 0.14, 1.0, 5), '#5f4531', { p: [0.04, 0.5, 0], r: [0, 0, -0.08] })
  k.add(P.cyl(0.05, 0.08, 0.8, 5), '#5f4531', { p: [0.2, 1.2, 0.02], r: [0, 0, -0.55] })
  k.add(P.ico(0.74, 1), '#2f8a52', { p: [0.28, 1.62, 0], s: [1.2, 0.36, 1.1], jitter: 0.06, outline: 0.05 })
  k.add(P.ico(0.56, 1), '#37995c', { p: [-0.3, 1.2, 0.1], s: [1.2, 0.34, 1.05], jitter: 0.05, outline: 0.05 })
  k.add(P.ico(0.44, 1), '#2b7f4c', { p: [0.55, 1.1, -0.2], s: [1.2, 0.34, 1.05], jitter: 0.05, outline: 0.045 })
  return k.build()
}

export const TREES = once(() => ({
  round: roundTree(1, ['#3f9a52', '#4aa656', '#378f4a', '#58b25c'], '#7b5a3c'),
  cherry: roundTree(2, ['#f4a9b8', '#f8c3cd', '#ef93a7', '#f6b5c4'], '#8a5f4a'),
  autumn: roundTree(3, ['#f0a64a', '#f4c45a', '#e8825a', '#f2b455'], '#7b5a3c'),
  pine: pineTree(),
  bonsai: bonsaiTree(),
}))

export const BUSH = once(() => {
  const k = new Kit(6)
  k.add(P.dodeca(0.36), '#45a054', { p: [0, 0.28, 0], jitter: 0.04, outline: 0.045, s: [1.15, 0.9, 1.1] })
  k.add(P.dodeca(0.27), '#56b05c', { p: [0.3, 0.22, 0.1], jitter: 0.04, outline: 0.04 })
  return k.build()
})

// ---------------------------------------------------------------- rocks and plants
const mossy = (n: Vector3) => (n.y > 0.78 ? '#9cc474' : n.y > 0.25 ? '#c7bda4' : '#a69b84')
function rock(seed: number): Built {
  const k = new Kit(seed)
  k.add(P.ico(0.5, 1), '#bdb39a', { p: [0, 0.2, 0], s: [1.15, 0.72, 0.95], jitter: 0.1, outline: 0.06, faceColor: mossy })
  if (seed % 2) k.add(P.ico(0.26, 1), '#bdb39a', { p: [0.52, 0.1, 0.22], s: [1, 0.7, 1], jitter: 0.06, outline: 0.04, faceColor: mossy })
  return k.build()
}
export const ROCKS = once(() => [rock(20), rock(21), rock(23)])

export const FLOWER = once(() => {
  // cheap on purpose: there are ~1,900 of them
  const head = new Kit(10)
  head.add(P.cyl(0.09, 0.05, 0.045, 5), '#ffffff', { p: [0, 0.25, 0], shade: 0.04 })
  const stem = new Kit(11)
  stem.add(P.cone(0.016, 0.25, 3), '#4f9a45', { p: [0, 0.125, 0], shade: 0.02 })
  return { head: head.build(), stem: stem.build() }
})

export const TUFT = once(() => {
  const k = new Kit(12)
  k.add(P.cone(0.045, 0.32, 3), '#7fcf63', { p: [0, 0.16, 0] })
  k.add(P.cone(0.04, 0.28, 3), '#6bbd57', { p: [0.05, 0.14, 0], r: [0, 0, -0.35] })
  k.add(P.cone(0.04, 0.26, 3), '#8fd96b', { p: [-0.045, 0.13, 0.03], r: [0.2, 0, 0.3] })
  return k.build()
})

export const WHEAT = once(() => {
  const k = new Kit(13)
  k.add(P.cone(0.03, 0.62, 3), '#e8c45c', { p: [0, 0.31, 0], r: [0.08, 0, 0.1] })
  k.add(P.cone(0.028, 0.56, 3), '#d9a93f', { p: [0.05, 0.28, 0.02], r: [0, 0, -0.25] })
  k.add(P.cone(0.028, 0.52, 3), '#eccf6a', { p: [-0.04, 0.26, 0.03], r: [0.25, 0, 0.2] })
  k.add(P.cone(0.026, 0.5, 3), '#dcb04a', { p: [0.0, 0.25, -0.05], r: [-0.3, 0, 0] })
  return k.build()
})

export const SUNFLOWER = once(() => {
  const k = new Kit(14)
  k.add(P.cyl(0.02, 0.026, 0.8, 4), '#4f9a45', { p: [0, 0.4, 0] })
  k.add(P.ico(0.1, 0), '#5fb050', { p: [0.1, 0.35, 0], s: [1, 0.25, 0.6], r: [0, 0, 0.4] })
  k.add(P.cyl(0.2, 0.2, 0.05, 10), '#f6c936', { p: [0, 0.86, 0.06], r: [1.2, 0, 0] })
  k.add(P.cyl(0.11, 0.11, 0.07, 8), '#7a4a2a', { p: [0, 0.865, 0.085], r: [1.2, 0, 0] })
  return k.build()
})

export const MUSHROOM = once(() => {
  const k = new Kit(15)
  k.add(P.cyl(0.05, 0.065, 0.14, 5), '#f6efe0', { p: [0, 0.07, 0] })
  k.add(new SphereGeometry(0.13, 7, 4, 0, PI * 2, 0, PI / 2), '#e0503f', { p: [0, 0.14, 0], outline: 0.02 })
  for (const [x, z] of [[0.06, 0.05], [-0.07, 0.02], [0.0, -0.08]]) k.add(P.sphere(0.022, 4, 3), '#fbf5e6', { p: [x, 0.25, z] })
  return k.build()
})

export const LILY = once(() => {
  const pad = new Kit(16)
  pad.add(P.cyl(0.34, 0.34, 0.03, 8), '#58b65a', { p: [0, 0.015, 0], jitter: 0.015 })
  const lotus = new Kit(17)
  lotus.add(P.cone(0.11, 0.17, 6), '#f6a6b8', { p: [0, 0.1, 0], outline: 0.015 })
  lotus.add(P.sphere(0.04, 5, 4), '#f2c14e', { p: [0, 0.18, 0] })
  return { pad: pad.build(), lotus: lotus.build() }
})

// one 0.6-unit fence segment running along the model's Z axis
export const FENCE = once(() => {
  const k = new Kit(18)
  k.add(P.box(0.09, 0.56, 0.09), '#c99a62', { p: [0, 0.28, 0] })
  k.add(P.box(0.045, 0.07, 0.62), '#dcb178', { p: [0, 0.2, 0] })
  k.add(P.box(0.045, 0.07, 0.62), '#dcb178', { p: [0, 0.4, 0] })
  return k.build()
})

// ---------------------------------------------------------------- buildings
export const COTTAGES = once(() => {
  const walls = ['#f6e7c8', '#f7c9c1', '#cfe8c8']
  const roofs = ['#d9634f', '#3f9aa0', '#9a6a4a']
  return [0, 1, 2].map((v) => {
    const k = new Kit(30 + v)
    k.add(P.box(2.0, 1.1, 1.7), walls[v], { p: [0, 0.55, 0], outline: 0.05 })
    k.add(P.prism(2.05, 0.95, 2.55), roofs[v], { p: [0, 1.1 + 0.475, 0], r: [0, PI / 2, 0], outline: 0.05 })
    k.add(P.box(0.42, 0.78, 0.07), '#9a6a4a', { p: [0, 0.39, 0.88] })
    k.add(P.sphere(0.035, 5, 4), '#f2c14e', { p: [0.12, 0.4, 0.93] })
    k.add(P.box(0.3, 0.07, 0.34), '#d8cdb8', { p: [0, 0.035, 1.0] })
    for (const x of [-0.62, 0.62]) {
      k.add(P.box(0.46, 0.46, 0.06), '#fbf5e6', { p: [x, 0.68, 0.86] })
      k.add(P.box(0.34, 0.34, 0.07), '#bfe6f2', { p: [x, 0.68, 0.87] })
    }
    k.add(P.box(0.28, 0.7, 0.28), '#b8b0a2', { p: [0.6, 1.8, -0.35], outline: 0.035 })
    return k.build()
  })
})

export const BARN = once(() => {
  const k = new Kit(40)
  k.add(P.box(3.0, 1.5, 2.6), '#d9534f', { p: [0, 0.75, 0], outline: 0.06 })
  k.add(P.prism(3.3, 1.3, 2.9), '#b5483d', { p: [0, 1.5 + 0.65, 0], outline: 0.06 })
  k.add(P.box(1.3, 1.2, 0.08), '#fbf5e6', { p: [0, 0.6, 1.32] })
  k.add(P.box(1.1, 1.0, 0.09), '#a83e3a', { p: [0, 0.55, 1.33] })
  for (const s of [-1, 1]) k.add(P.box(0.07, 1.3, 0.1), '#fbf5e6', { p: [0, 0.55, 1.38], r: [0, 0, s * 0.72] })
  k.add(P.box(0.5, 0.45, 0.08), '#fbf5e6', { p: [0, 1.95, 1.47] })
  k.add(P.box(0.36, 0.32, 0.09), '#3a3a3a', { p: [0, 1.95, 1.48] })
  return k.build()
})

export const WINDMILL = once(() => {
  const k = new Kit(41)
  k.add(P.cyl(0.62, 1.0, 3.0, 6), '#f3e9d2', { p: [0, 1.5, 0], outline: 0.06 })
  k.add(P.cyl(0.78, 0.86, 0.3, 6), '#d9634f', { p: [0, 0.9, 0] })
  k.add(P.cone(0.85, 0.95, 6), '#d9534f', { p: [0, 3.45, 0], outline: 0.06 })
  k.add(P.box(0.4, 0.7, 0.08), '#8a5a3a', { p: [0, 0.35, 0.96] })
  k.add(P.box(0.28, 0.3, 0.08), '#bfe6f2', { p: [0, 2.0, 0.68] })
  // the sails spin on their own mesh around the hub
  const b = new Kit(42)
  b.add(P.cyl(0.14, 0.14, 0.3, 6), '#8a5a3a', { r: [PI / 2, 0, 0] })
  for (let i = 0; i < 4; i++) {
    const a = (i * PI) / 2
    const c = Math.cos(a), s = Math.sin(a)
    b.add(P.box(0.1, 2.3, 0.07), '#8a5a3a', { p: [-s * 1.2, c * 1.2, 0.02], r: [0, 0, a] })
    b.add(P.box(0.5, 1.5, 0.04), '#fbf0d6', { p: [-s * 1.3 + c * 0.3, c * 1.3 + s * 0.3, 0.05], r: [0, 0, a], outline: 0.02 })
  }
  return { tower: k.build(), blades: b.build() }
})

export const BENCH = once(() => {
  const k = new Kit(43)
  k.add(P.box(1.0, 0.07, 0.34), '#c88a54', { p: [0, 0.42, 0], outline: 0.025 })
  k.add(P.box(1.0, 0.3, 0.06), '#c88a54', { p: [0, 0.66, -0.15], r: [-0.15, 0, 0], outline: 0.025 })
  for (const x of [-0.4, 0.4]) k.add(P.box(0.07, 0.42, 0.3), '#a96d3b', { p: [x, 0.21, 0] })
  return k.build()
})

export const SIGN = once(() => {
  const k = new Kit(44)
  k.add(P.cyl(0.05, 0.065, 1.3, 5), '#a96d3b', { p: [0, 0.65, 0] })
  k.add(P.box(1.5, 0.55, 0.08), '#e7b87a', { p: [0, 1.2, 0], outline: 0.03 })
  return k.build()
})

export const HAYSTACKS = once(() => {
  const round = new Kit(45)
  round.add(P.cyl(0.5, 0.5, 0.8, 8), '#e8c45e', { p: [0, 0.5, 0], r: [0, 0, PI / 2], outline: 0.04 })
  const stack = new Kit(46)
  stack.add(P.cone(0.75, 1.1, 7), '#e2bc55', { p: [0, 0.65, 0], jitter: 0.03, outline: 0.04 })
  stack.add(P.cyl(0.72, 0.75, 0.15, 7), '#cfa648', { p: [0, 0.08, 0] })
  return [round.build(), stack.build()]
})

export const TRACTOR = once(() => {
  const k = new Kit(47)
  k.add(P.box(0.9, 0.5, 1.5), '#d9534f', { p: [0, 0.62, 0], outline: 0.04 })
  k.add(P.box(0.7, 0.42, 0.62), '#d9534f', { p: [0, 0.8, 0.62], outline: 0.035 })
  k.add(P.box(0.78, 0.74, 0.62), '#fbf5e6', { p: [0, 1.1, -0.35], outline: 0.035 })
  k.add(P.box(0.7, 0.4, 0.64), '#bfe6f2', { p: [0, 1.15, -0.35] })
  k.add(P.box(0.95, 0.06, 0.85), '#d9534f', { p: [0, 1.5, -0.35] })
  for (const x of [-0.56, 0.56]) {
    k.add(P.cyl(0.38, 0.38, 0.22, 8), '#2f3a40', { p: [x, 0.38, -0.4], r: [0, 0, PI / 2], outline: 0.03 })
    k.add(P.cyl(0.16, 0.16, 0.24, 8), '#f2c14e', { p: [x, 0.38, -0.4], r: [0, 0, PI / 2] })
  }
  for (const x of [-0.5, 0.5]) {
    k.add(P.cyl(0.26, 0.26, 0.18, 8), '#2f3a40', { p: [x, 0.26, 0.58], r: [0, 0, PI / 2], outline: 0.025 })
    k.add(P.cyl(0.11, 0.11, 0.2, 8), '#f2c14e', { p: [x, 0.26, 0.58], r: [0, 0, PI / 2] })
  }
  k.add(P.cyl(0.04, 0.04, 0.42, 4), '#6b7378', { p: [0.2, 1.15, 0.72] })
  return k.build()
})

export const WELL = once(() => {
  const k = new Kit(48)
  k.add(P.cyl(0.55, 0.6, 0.55, 8), '#bdb39a', { p: [0, 0.27, 0], outline: 0.04, jitter: 0.015 })
  k.add(P.cyl(0.45, 0.45, 0.02, 8), '#5fbfd1', { p: [0, 0.5, 0] })
  for (const x of [-0.5, 0.5]) k.add(P.box(0.07, 1.0, 0.07), '#a96d3b', { p: [x, 0.95, 0] })
  k.add(P.prism(1.5, 0.45, 0.95), '#d9634f', { p: [0, 1.6, 0], r: [0, PI / 2, 0], outline: 0.03 })
  return k.build()
})

export const BOATS = once(() => {
  const small = new Kit(49)
  small.add(P.box(0.56, 0.28, 1.1), '#f6efe0', { p: [0, 0.14, 0], outline: 0.03 })
  small.add(P.cone(0.4, 0.5, 4), '#f6efe0', { p: [0, 0.14, 0.78], r: [PI / 2, PI / 4, 0], s: [0.7, 1, 0.7], outline: 0.03 })
  small.add(P.box(0.6, 0.07, 1.12), '#d9534f', { p: [0, 0.27, 0] })
  small.add(P.box(0.4, 0.05, 0.14), '#c88a54', { p: [0, 0.3, -0.1] })
  const sail = new Kit(50)
  sail.add(P.box(0.8, 0.34, 1.7), '#f6efe0', { p: [0, 0.17, 0], outline: 0.035 })
  sail.add(P.cone(0.5, 0.6, 4), '#f6efe0', { p: [0, 0.17, 1.12], r: [PI / 2, PI / 4, 0], s: [0.8, 1, 0.7], outline: 0.035 })
  sail.add(P.box(0.84, 0.08, 1.72), '#3f9aa0', { p: [0, 0.3, 0] })
  sail.add(P.cyl(0.03, 0.03, 2.1, 4), '#a96d3b', { p: [0, 1.25, 0.1] })
  sail.add(P.prism(1.0, 1.6, 0.04), '#fbf5e6', { p: [0.0, 1.35, -0.3], outline: 0.015 })
  sail.add(P.prism(0.6, 1.0, 0.04), '#f6a6b8', { p: [0.0, 1.05, 0.6], outline: 0.015 })
  return { small: small.build(), sail: sail.build() }
})

export const PICNIC = once(() => {
  const k = new Kit(51)
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 5; j++)
      k.add(P.box(0.3, 0.03, 0.3), (i + j) % 2 ? '#fbf5e6' : '#ee6c4d', { p: [(i - 2.5) * 0.3, 0.02, (j - 2) * 0.3], shade: 0.02 })
  k.add(P.box(0.42, 0.22, 0.3), '#c9964f', { p: [0.55, 0.14, 0.15], outline: 0.02 })
  k.add(P.torus(0.17, 0.025, 4, 10, PI), '#a87a3a', { p: [0.55, 0.25, 0.15], r: [0, PI / 2, 0] })
  for (const [x, z] of [[0.25, -0.1], [0.12, -0.2], [-0.5, 0.25]]) k.add(P.sphere(0.065, 5, 4), '#e0503f', { p: [x, 0.08, z] })
  k.add(P.cyl(0.14, 0.14, 0.07, 8), '#e8c88a', { p: [-0.3, 0.07, 0.1] })
  return k.build()
})

export const RAINBOW = once(() => {
  const cols = ['#ef7a6a', '#f6b26b', '#f6dc6b', '#8fd694', '#7ec8e8', '#8e9be0', '#c4a4e8']
  const k = new Kit(52)
  cols.forEach((c, i) => k.add(P.torus(2.3 + i * 0.16, 0.085, 4, 26, PI), c, { shade: 0.02 }))
  return k.build()
})

// ---------------------------------------------------------------- sky
const cloudShade = (n: Vector3) => (n.y < -0.25 ? '#dfeaec' : '#fffdf6')
function cloud(seed: number, blobs: [number, number, number, number, number][]): Built {
  const k = new Kit(seed)
  for (const [x, y, z, r, sy] of blobs) k.add(P.ico(r, 1), '#fffdf6', { p: [x, y, z], s: [1.15, sy, 1], jitter: 0.06, outline: 0.06, faceColor: cloudShade })
  return k.build()
}
export const CLOUDS = once(() => [
  cloud(60, [[0, 0, 0, 0.95, 0.85], [1.05, -0.1, 0.1, 0.72, 0.8], [-1.0, -0.12, 0, 0.66, 0.8], [0.35, 0.5, 0.05, 0.6, 0.85], [-0.4, 0.35, -0.1, 0.5, 0.85]]),
  cloud(61, [[0, 0, 0, 0.8, 0.8], [0.85, -0.08, 0, 0.6, 0.8], [-0.8, -0.1, 0.05, 0.55, 0.8], [0.1, 0.42, 0, 0.5, 0.85]]),
  cloud(62, [[0, 0, 0, 0.7, 0.85], [0.65, 0.1, 0.1, 0.5, 0.85], [-0.62, -0.05, 0, 0.48, 0.85]]),
])

export const BIRD = once(() => {
  const body = new Kit(70)
  body.add(P.ico(0.16, 1), '#ffffff', { s: [1, 0.8, 1.5], shade: 0.04 })
  body.add(P.ico(0.09, 1), '#ffffff', { p: [0, 0.07, 0.2], shade: 0.04 })
  body.add(P.cone(0.035, 0.11, 4), '#f2a03d', { p: [0, 0.06, 0.32], r: [PI / 2, 0, 0] })
  body.add(P.box(0.08, 0.02, 0.18), '#ffffff', { p: [0, 0.0, -0.3], r: [0.15, 0, 0] })
  const wing = (side: number) => new Kit(71 + side).add(P.box(0.42, 0.02, 0.22), '#ffffff', { p: [side * 0.21, 0, 0], shade: 0.04 }).build()
  return { body: body.build(), left: wing(-1), right: wing(1) }
})

export const BUTTERFLY = once(() => {
  const wing = (side: number) => new Kit(80 + side).add(P.box(0.15, 0.01, 0.15), '#ffffff', { p: [side * 0.085, 0, 0], r: [0, PI / 4, 0], shade: 0.03 }).build()
  const body = new Kit(82).add(P.cyl(0.012, 0.012, 0.16, 3), '#3a3a3a', { r: [PI / 2, 0, 0] }).build()
  return { body, left: wing(-1), right: wing(1) }
})
