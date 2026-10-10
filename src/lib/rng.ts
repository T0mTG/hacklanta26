export const TAU = Math.PI * 2
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
// Frame-rate independent easing toward a target: damp(current, goal, 6, dt)
export const damp = (a: number, b: number, k: number, dt: number) => lerp(a, b, 1 - Math.exp(-k * dt))

// mulberry32: tiny seeded generator so the planet is identical on every load
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function h3(x: number, y: number, z: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

// 3D value noise in 0..1
export function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const xf = x - xi, yf = y - yi, zf = z - zi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf)
  const a = lerp(h3(xi, yi, zi), h3(xi + 1, yi, zi), u)
  const b = lerp(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u)
  const c = lerp(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u)
  const d = lerp(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u)
  return lerp(lerp(a, b, v), lerp(c, d, v), w)
}

// Layered noise, still 0..1
export function fbm3(x: number, y: number, z: number, octaves = 3) {
  let amp = 0.5, f = 1, sum = 0, norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * f, y * f, z * f)
    norm += amp
    amp *= 0.5
    f *= 2.03
  }
  return sum / norm
}

// Three decorrelated random numbers from a position, so vertices that share a spot jitter together
export function hash3f(x: number, y: number, z: number, seed = 0): [number, number, number] {
  const f = (a: number, b: number, c: number, d: number) => {
    const s = Math.sin(x * a + y * b + z * c + seed * d) * 43758.5453
    return s - Math.floor(s)
  }
  return [f(127.1, 311.7, 74.7, 13.1), f(269.5, 183.3, 246.1, 7.7), f(113.5, 271.9, 124.6, 3.3)]
}
