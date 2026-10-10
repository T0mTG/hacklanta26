import { Vector3 } from 'three'
import { rng } from '../lib/rng'
import { R, angleBetween, fibonacciSphere, offsetDir, stepOnSphere } from '../lib/sphere'
import { NOTE_COLORS } from '../data/theme'
import type { Artwork, Vec3 } from '../data/types'
import { useStore } from '../store'
import { blockedAt, onLand } from './collide'
import { northAt, yawToward } from './place'
import { REGIONS, SPAWN, type RegionId } from './regions'
import { isLand, slopeAt } from './terrain'

// Easels need a bit of free ground: land that is not too steep, clear of trees and buildings, and a few steps from other easels.
// The search starts at `near` and spreads outward; if the first pass finds nothing anywhere it relaxes the rules a little,
// so there is always somewhere to put a new drawing.
export function findSpot(near: Vector3, o: { gap?: number; avoid?: Vector3[]; avoidGap?: number; ignoreId?: string } = {}) {
  const gap = o.gap ?? 0.27
  const others = useStore.getState().artworks.filter((a) => a.id !== o.ignoreId).map((a) => new Vector3(...a.dir))
  const ok = (d: Vector3, g: number, clear: number, slope: number) =>
    isLand(d, 0.5) && slopeAt(d) < slope && !blockedAt(d, clear, o.ignoreId) &&
    others.every((p) => angleBetween(d, p) > g) && (o.avoid ?? []).every((p) => angleBetween(d, p) > (o.avoidGap ?? 0.12))
  const rand = rng(Math.floor(Math.abs(near.x * 977 + near.y * 613 + near.z * 331)))
  const passes = [
    { g: gap, clear: 1.2, slope: 0.3, rings: [0, 0.09, 0.16, 0.24, 0.33, 0.43, 0.55, 0.7, 0.9, 1.15, 1.45, 1.8, 2.3] },
    { g: gap * 0.8, clear: 0.95, slope: 0.4, rings: [0, 0.1, 0.2, 0.33, 0.5, 0.75, 1.0, 1.4, 1.9, 2.5] },
  ]
  for (const p of passes) {
    for (const radius of p.rings) {
      const n = radius === 0 ? 1 : Math.max(18, Math.round(radius * 40))
      const a0 = rand() * Math.PI * 2
      for (let k = 0; k < n; k++) {
        const a = a0 + (k / n) * Math.PI * 2
        const d = offsetDir(near, Math.cos(a) * radius, Math.sin(a) * radius)
        if (ok(d, p.g, p.clear, p.slope)) return d
      }
    }
  }
  return null
}

// How many easels could the planet hold at this spacing? Greedily packs every spot that passes the same ground checks.
export function easelCapacity(gap = 0.27, center?: Vector3, radius = Math.PI) {
  const pts = fibonacciSphere(8000).filter((d) => !center || angleBetween(d, center) < radius)
  const good = pts.filter((d) => isLand(d, 0.5) && slopeAt(d) < 0.3 && !blockedAt(d, 1.2))
  const chosen: Vector3[] = []
  for (const d of good) if (chosen.every((c) => angleBetween(d, c) > gap)) chosen.push(d)
  return { openShare: +(good.length / pts.length).toFixed(3), capacity: chosen.length }
}

const _wf = new Vector3(), _wg = new Vector3()

// Where watcher `i` of `n` stands: a few steps in front of an easel at `dir` facing `yaw`, fanned out a little.
// If that spot is water or blocked, it moves closer to the easel until it is dry.
export function watchSlot(dir: Vector3, yaw: number, i: number, n: number, out: Vector3) {
  const spread = (i - (n - 1) / 2) * 0.62
  const far = 1.9 + 0.45 * (i % 2)
  for (const k of [1, 0.78, 0.58, 0.4]) {
    northAt(dir, _wf).applyAxisAngle(dir, yaw + spread)
    out.copy(dir)
    _wg.copy(_wf)
    stepOnSphere(out, _wg, (far * k) / R)
    if (onLand(out, 0.15) && !blockedAt(out, 0.25)) return out
  }
  return out
}

// Of the headings around `preferred`, the first one whose watchers would all stand on dry, open ground
export function chooseYaw(dir: Vector3, preferred: number) {
  const out = new Vector3()
  for (const k of [0, 1, -1, 2, -2, 3, -3, 4]) {
    const yaw = preferred + (k * Math.PI) / 4
    let ok = true
    for (let i = 0; i < 3 && ok; i++) {
      const spread = (i - 1) * 0.62
      northAt(dir, _wf).applyAxisAngle(dir, yaw + spread)
      out.copy(dir)
      _wg.copy(_wf)
      stepOnSphere(out, _wg, (1.9 + 0.45 * (i % 2)) / R)
      ok = onLand(out, 0.2) && !blockedAt(out, 0.3)
    }
    if (ok) return yaw
  }
  return preferred
}

// A freshly uploaded drawing goes near `near` (the kid) and faces them
export function placeNewArtwork(art: Artwork, near: Vector3, avoid: Vector3[] = []): Artwork {
  const dir = findSpot(near, { avoid }) ?? near.clone()
  return { ...art, dir: dir.toArray() as Vec3, yaw: chooseYaw(dir, yawToward(dir, near)) }
}

interface Neighbor {
  id: string; file: string; title: string; artist: string; story: string; aspect: number; palette: string[]
  region: RegionId; u: number; v: number
  notes: { text: string; by: string }[]
}

// Six drawings by made-up kids, so the planet is inhabited before you add anything. They are original crayon doodles
// (SVG), so they never duplicate the pictures a kid uploads.
const NEIGHBORS: Neighbor[] = [
  { id: 'sunny-house', file: 'sunny-house.svg', title: 'Sunny House', artist: 'Mia', story: 'My house on a sunny day. Come visit!', aspect: 800 / 600,
    palette: ['#bfe6fb', '#ff9d8a', '#7ccf5b', '#ffd93b'], region: 'plaza', u: -0.17, v: 0.1,
    notes: [{ text: 'What a cozy house!', by: 'Grandma' }] },
  { id: 'rocket', file: 'rocket.svg', title: 'Zoom Rocket', artist: 'Leo', story: 'Three, two, one, blast off to the moon!', aspect: 600 / 800,
    palette: ['#2b3a7a', '#e8524a', '#fbf5e6', '#7fd0ff'], region: 'plaza', u: 0.17, v: 0.1,
    notes: [{ text: 'I want to ride it!', by: 'Ben' }, { text: 'Love the stars', by: 'Ava' }] },
  { id: 'rainbow-fish', file: 'rainbow-fish.svg', title: 'Rainbow Fish', artist: 'Aiko', story: 'He shares his shiny scales with everyone.', aspect: 800 / 600,
    palette: ['#aee3f0', '#ffb347', '#8fd694', '#b9a2ef'], region: 'lily', u: -0.3, v: -0.1,
    notes: [{ text: 'So many colors!', by: 'Ms. Ortiz' }] },
  { id: 'whiskers', file: 'whiskers.svg', title: 'Whiskers', artist: 'Tomás', story: 'My cat Whiskers and her favorite yarn.', aspect: 1,
    palette: ['#f6a04a', '#ffe9a6', '#f6a6b8', '#f3cf7a'], region: 'picnic', u: 0.16, v: -0.1,
    notes: [{ text: 'Meow! She looks so soft', by: 'Zoe' }] },
  { id: 'garden', file: 'garden.svg', title: 'My Garden', artist: 'Zuri', story: 'Flowers, a busy bee and a very slow snail.', aspect: 800 / 600,
    palette: ['#8ad463', '#f6a6b8', '#c9b6f2', '#9ad4f5'], region: 'farm', u: 0.0, v: 0.08,
    notes: [{ text: 'Bzzzz!', by: 'Mr. Park' }] },
  { id: 'dino', file: 'dino.svg', title: 'Friendly Dino', artist: 'Sam', story: 'Rawr! That means hello.', aspect: 800 / 600,
    palette: ['#7fd06b', '#ffe3c9', '#f6a04a', '#a8745a'], region: 'village', u: 0.12, v: -0.04,
    notes: [{ text: 'Rawr back at you', by: 'Dad' }, { text: 'Best dino ever', by: 'Nina' }] },
]

// Adds any neighbor drawing that is missing, and moves any saved easel that now sits inside a tree or a building (the planet's
// layout can change between versions). Safe to call every time the world mounts.
export function ensureNeighbors() {
  const s = useStore.getState()
  for (const a of s.artworks) {
    const d = new Vector3(...a.dir)
    if (!blockedAt(d, 0.9) && onLand(d, 0.3)) continue
    const spot = findSpot(d, { ignoreId: a.id })
    if (spot) s.patchArtwork(a.id, { dir: spot.toArray() as Vec3, yaw: chooseYaw(spot, a.yaw) })
  }
  for (const n of NEIGHBORS) {
    const id = `n-${n.id}`
    if (s.artworks.some((a) => a.id === id)) continue
    const region = REGIONS[n.region]
    const near = offsetDir(region.dir, n.u, n.v)
    const dir = findSpot(near, { gap: 0.2, avoid: [SPAWN], avoidGap: 0.2 }) ?? near
    s.addArtwork({
      id, title: n.title, artist: n.artist, story: n.story, src: `/doodles/${n.file}`, aspect: n.aspect, palette: n.palette,
      at: 0, kind: 'neighbor', dir: dir.toArray() as Vec3, yaw: chooseYaw(dir, yawToward(dir, region.dir)),
      notes: n.notes.map((x, i) => ({ id: `${id}-${i}`, text: x.text, by: x.by, color: NOTE_COLORS[(i + n.id.length) % NOTE_COLORS.length], at: 0 })),
    })
  }
}
