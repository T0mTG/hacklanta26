// Seeded 3D simplex noise (after Stefan Gustavson's reference implementation).
// Sampling it on the surface of a sphere gives terrain with no seams or poles.
import { mulberry32 } from './random'

const F3 = 1 / 3
const G3 = 1 / 6
const GRAD = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1],
  [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
]

export type Noise3 = (x: number, y: number, z: number) => number

/** Returns a noise function giving values in roughly -1..1. */
export function makeNoise(seed: number): Noise3 {
  const rnd = mulberry32(seed)
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]

  const corner = (gi: number, x: number, y: number, z: number) => {
    let t = 0.6 - x * x - y * y - z * z
    if (t < 0) return 0
    t *= t
    const g = GRAD[gi % 12]
    return t * t * (g[0] * x + g[1] * y + g[2] * z)
  }

  return (x, y, z) => {
    const s = (x + y + z) * F3
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const k = Math.floor(z + s)
    const t = (i + j + k) * G3
    const x0 = x - (i - t)
    const y0 = y - (j - t)
    const z0 = z - (k - t)

    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number
    if (x0 >= y0) {
      if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0]
      else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1]
      else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1]
    } else {
      if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1]
      else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1]
      else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0]
    }

    const ii = i & 255
    const jj = j & 255
    const kk = k & 255
    return (
      32 *
      (corner(perm[ii + perm[jj + perm[kk]]], x0, y0, z0) +
        corner(perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]], x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3) +
        corner(perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]], x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3) +
        corner(perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]], x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3))
    )
  }
}

/** Several octaves of noise layered together: big shapes with fine detail on top. */
export function fbm(noise: Noise3, x: number, y: number, z: number, octaves = 5): number {
  let sum = 0
  let amp = 1
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += noise(x, y, z) * amp
    norm += amp
    amp *= 0.5
    x *= 2.03
    y *= 2.03
    z *= 2.03
  }
  return sum / norm
}
