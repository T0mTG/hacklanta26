import { Vector3 } from 'three'
import { LITE } from '../lib/env'
import { rng } from '../lib/rng'
import { R, WATER_R, offsetDir } from '../lib/sphere'
import { pathDist, type Obstacle } from '../world/layout'
import { yawToward } from '../world/place'
import { PLAZA, REGIONS, SPAWN, type RegionId } from '../world/regions'
import { heightAt, shoreness, slopeAt } from '../world/terrain'
import { newItem, type PaperItem } from './items'
import { BY_ID } from './library'

// What grows where. The world is a list of "layers": a handful of cut-outs scattered over part of a region, with rules about
// the ground they like. Each region has its own cast, so walking from the pine woods to the cherry grove changes the pictures,
// not just the colors. Everything is seeded: the planet is identical on every load, and every item has a stable id
// ("pines:2:14") so the changes a kid makes (carrying one somewhere else) can be remembered.

interface Layer {
  region: RegionId | 'all'
  ids: string[] // cut-outs to choose from; repeat one to make it more likely
  n: number // how many to place
  at?: [number, number] // center of the layer, radians east and north of the region's center
  spread: number // radius of the area it covers, radians (12 units of walking = 1 radian)
  inner?: number // keep this far from the layer's center
  clumps?: number // 0 = evenly scattered, k = k groves
  clumpSpread?: number // radius of one grove
  gap?: number // extra room between neighbors, world units
  ground?: 'land' | 'shore' | 'water'
  slope?: number // steepest ground it accepts
  minAbove?: number // lowest it stands above the water
  paths?: boolean // may stand on a dirt path
  scale?: [number, number]
  hue?: [number, number] // degrees
  face?: boolean // buildings turn to face the middle of the region
  hard?: boolean // solid: nobody walks through it
  seedName?: string
}

const BLOSSOM_PINK = ['blossom-pink-a', 'blossom-pink-b', 'blossom-pink-c', 'blossom-pink-d', 'blob-pink', 'blossom-coral-b']
const BLOSSOM_WARM = ['blossom-coral', 'blossom-red', 'blob-orange', 'blob-coral', 'blob-red', 'blossom-purple']
const BLOSSOM_COOL = ['blossom-lilac-a', 'blossom-lilac-b', 'blossom-lilac-c', 'blob-navy', 'blossom-purple']
const STEMS = ['flower-red-stem', 'flower-red-stem-b', 'daisies', 'flower-bunch', 'tulip-red', 'flower-orange-stalk', 'flower-teal-red', 'flower-coral-stem', 'flower-pink-stem', 'flower-teal', 'flower-coral-big', 'yellow-bud']
const GRASS = ['grass-a', 'grass-b', 'grass-c', 'grass-d']
const FERNS = ['fern-a', 'fern-b', 'fern-c']
const ROUND_TREES = ['tree-apple', 'tree-round', 'tree-leafy', 'sapling']
const PINES = ['pine-a', 'pine-b', 'pine-c', 'pine-teal']
const PALMS = ['palm-a', 'palm-b']
const SHROOMS = ['mushroom', 'toadstool']
const ROCKS = ['rock', 'boulder']
const MIXED_BLOSSOMS = [...BLOSSOM_PINK, ...BLOSSOM_WARM, ...BLOSSOM_COOL]

const LAYERS: Layer[] = [
  // ---------------------------------------------------------------- Gallery Green: open lawn for the kid's own things
  { region: 'plaza', ids: [...BLOSSOM_PINK, ...BLOSSOM_COOL, 'yellow-bud', 'flower-pink-stem', 'flower-teal'], n: 34, spread: 0.5, inner: 0.1, gap: 0.5 },
  { region: 'plaza', ids: GRASS, n: 16, spread: 0.5, inner: 0.1 },
  { region: 'plaza', ids: ROUND_TREES, n: 7, spread: 0.66, inner: 0.4, scale: [0.85, 1.1], hard: true },
  { region: 'plaza', ids: ['rainbow-a'], n: 1, at: [0.42, 0.04], spread: 0.03, scale: [0.9, 1] },
  { region: 'plaza', ids: ['rainbow-c'], n: 1, at: [-0.42, -0.06], spread: 0.03, scale: [0.8, 0.9] },

  // ---------------------------------------------------------------- Lily Pond
  { region: 'lily', ids: ['lilypad'], n: 9, spread: 0.3, ground: 'water', gap: 0.2 },
  { region: 'lily', ids: ['reeds'], n: 8, spread: 0.55, ground: 'shore', gap: 0.3 },
  { region: 'lily', ids: [...STEMS, 'blossom-coral', 'blob-pink'], n: 16, spread: 0.55, ground: 'shore' },
  { region: 'lily', ids: ROUND_TREES, n: 5, spread: 0.6, inner: 0.4, hard: true },
  { region: 'lily', ids: SHROOMS, n: 4, spread: 0.6, inner: 0.4 },
  { region: 'lily', ids: GRASS, n: 8, spread: 0.55, inner: 0.35 },

  // ---------------------------------------------------------------- Cherry Grove: round trees, hue-shifted to blossom pink
  { region: 'cherry', ids: ['tree-apple', 'tree-apple', 'tree-apple', 'sapling'], n: 17, spread: 0.42, clumps: 3, clumpSpread: 0.17, hue: [116, 134], scale: [0.95, 1.3], hard: true, gap: 0.2 },
  { region: 'cherry', ids: BLOSSOM_PINK, n: 28, spread: 0.45, gap: 0.2 },
  { region: 'cherry', ids: GRASS, n: 8, spread: 0.45 },

  // ---------------------------------------------------------------- Sunflower Farm
  { region: 'farm', ids: ['house-orange'], n: 1, at: [-0.05, -0.04], spread: 0.03, face: true, hard: true, scale: [1.05, 1.1] },
  { region: 'farm', ids: ['house-green'], n: 1, at: [0.2, -0.22], spread: 0.04, face: true, hard: true },
  { region: 'farm', ids: ['doghouse'], n: 1, at: [0.02, -0.13], spread: 0.03, face: true, hard: true },
  { region: 'farm', ids: ['sunflower'], n: 16, at: [0.12, 0.2], spread: 0.2, gap: 0.3 },
  { region: 'farm', ids: ['apple-red', 'lemon'], n: 3, at: [-0.05, -0.12], spread: 0.08 },
  { region: 'farm', ids: [...MIXED_BLOSSOMS, ...GRASS], n: 22, spread: 0.5 },
  { region: 'farm', ids: ROUND_TREES, n: 6, spread: 0.6, inner: 0.32, hard: true },

  // ---------------------------------------------------------------- Picnic Hill
  { region: 'picnic', ids: ['tree-apple'], n: 1, at: [-0.12, 0.07], spread: 0.02, scale: [1.5, 1.6], hard: true },
  { region: 'picnic', ids: ['watermelon', 'lemon', 'apple-red', 'apple-red'], n: 4, at: [0.03, -0.03], spread: 0.045 },
  { region: 'picnic', ids: [...STEMS, 'blossom-red', 'blob-red', 'blob-orange'], n: 24, spread: 0.42, inner: 0.07 },
  { region: 'picnic', ids: ['sapling', 'tree-round'], n: 3, spread: 0.55, inner: 0.25, hard: true },

  // ---------------------------------------------------------------- Pine Woods: real woods, with mushrooms and ferns underneath
  { region: 'pines', ids: PINES, n: 36, spread: 0.5, clumps: 5, clumpSpread: 0.17, scale: [0.9, 1.35], hard: true, gap: 0.1, slope: 0.62 },
  { region: 'pines', ids: FERNS, n: 12, spread: 0.5, gap: 0.1 },
  { region: 'pines', ids: SHROOMS, n: 8, spread: 0.5 },
  { region: 'pines', ids: ROCKS, n: 3, spread: 0.5, hard: true },
  { region: 'pines', ids: ['bush-scribble'], n: 4, spread: 0.5, hard: false },

  // ---------------------------------------------------------------- Cozy Village
  { region: 'village', ids: ['cottage'], n: 1, at: [-0.17, 0.09], spread: 0.03, face: true, hard: true },
  { region: 'village', ids: ['house-orange'], n: 1, at: [0.16, 0.12], spread: 0.03, face: true, hard: true, scale: [0.95, 1] },
  { region: 'village', ids: ['house-green'], n: 1, at: [0, -0.19], spread: 0.03, face: true, hard: true },
  { region: 'village', ids: ['doghouse'], n: 2, at: [0, 0.02], spread: 0.1, face: true, hard: true },
  { region: 'village', ids: [...STEMS, ...MIXED_BLOSSOMS], n: 24, spread: 0.45, inner: 0.06 },
  { region: 'village', ids: ['apple-red', 'lemon', 'watermelon'], n: 3, spread: 0.15 },
  { region: 'village', ids: ['sapling', 'tree-round', 'tree-apple'], n: 4, spread: 0.55, inner: 0.3, hard: true },
  { region: 'village', ids: ['bush-scribble'], n: 3, spread: 0.4, inner: 0.1 },

  // ---------------------------------------------------------------- Duck Pond
  { region: 'duck', ids: ['lilypad'], n: 6, spread: 0.28, ground: 'water', gap: 0.2 },
  { region: 'duck', ids: ['reeds'], n: 7, spread: 0.5, ground: 'shore', gap: 0.3 },
  { region: 'duck', ids: [...STEMS, 'blossom-coral', 'blob-coral'], n: 12, spread: 0.5, ground: 'shore' },
  { region: 'duck', ids: ROUND_TREES, n: 4, spread: 0.6, inner: 0.38, hard: true },
  { region: 'duck', ids: SHROOMS, n: 3, spread: 0.55, inner: 0.35 },

  // ---------------------------------------------------------------- Mount Giggle: rocks on the slopes, pines at the foot, a rainbow on top
  { region: 'giggle', ids: PINES, n: 12, spread: 0.52, inner: 0.22, clumps: 2, clumpSpread: 0.14, hard: true, slope: 0.62 },
  { region: 'giggle', ids: ROCKS, n: 14, spread: 0.5, hard: true, slope: 1.6, gap: 0.2 },
  { region: 'giggle', ids: ['rainbow-d'], n: 1, spread: 0.0, slope: 8, minAbove: 3, scale: [0.9, 0.9] },
  { region: 'giggle', ids: [...MIXED_BLOSSOMS, ...GRASS], n: 14, spread: 0.55, inner: 0.3 },

  // ---------------------------------------------------------------- Twin Hills
  { region: 'twins', ids: ROCKS, n: 6, spread: 0.5, hard: true, slope: 1.2 },
  { region: 'twins', ids: [...MIXED_BLOSSOMS, ...STEMS], n: 24, spread: 0.5 },
  { region: 'twins', ids: GRASS, n: 10, spread: 0.5 },
  { region: 'twins', ids: SHROOMS, n: 3, spread: 0.5 },
  { region: 'twins', ids: ['sapling', 'tree-round'], n: 4, spread: 0.55, hard: true },

  // ---------------------------------------------------------------- Big Blue Lake: palms on the beach
  { region: 'lake', ids: PALMS, n: 8, spread: 0.7, ground: 'shore', gap: 0.5, hard: true, scale: [0.9, 1.2] },
  { region: 'lake', ids: ['reeds'], n: 10, spread: 0.7, ground: 'shore', gap: 0.3 },
  { region: 'lake', ids: ROCKS, n: 4, spread: 0.7, ground: 'shore', hard: true },
  { region: 'lake', ids: [...STEMS, ...BLOSSOM_COOL], n: 14, spread: 0.7, ground: 'shore' },
  { region: 'lake', ids: ['lilypad'], n: 10, spread: 0.45, ground: 'water', gap: 0.25 },

  // ---------------------------------------------------------------- Sunflower Meadow
  { region: 'meadow', ids: ['sunflower'], n: 26, spread: 0.42, gap: 0.2 },
  { region: 'meadow', ids: MIXED_BLOSSOMS, n: 38, spread: 0.5, gap: 0.15 },
  { region: 'meadow', ids: STEMS, n: 18, spread: 0.5 },
  { region: 'meadow', ids: GRASS, n: 14, spread: 0.5 },
  { region: 'meadow', ids: ['rainbow-e'], n: 1, at: [0.3, 0.12], spread: 0.03 },
  { region: 'meadow', ids: ['rainbow-f'], n: 1, at: [-0.32, -0.1], spread: 0.03, scale: [0.8, 0.8] },

  // ---------------------------------------------------------------- a sprinkling everywhere else, so no lawn is bare
  { region: 'all', ids: [...MIXED_BLOSSOMS, ...GRASS, 'yellow-bud'], n: 150, spread: 3.2, gap: 0.5 },
  { region: 'all', ids: [...ROUND_TREES, ...PINES.slice(0, 3)], n: 12, spread: 3.2, hard: true, gap: 0.6 },
]

export interface Plan {
  items: PaperItem[]
  obstacles: Obstacle[] // the solid ones: trees, houses, rocks
  placed: { d: Vector3; r: number }[] // everything, solid or not, for spacing
}

const OPEN_RADIUS = 0.34 // nothing taller than a flower stands this close to the plaza's middle: room for the kid's own things

function generate(): Plan {
  const rand = rng(20261011)
  const K = LITE ? 0.55 : 1
  const items: PaperItem[] = []
  const obstacles: Obstacle[] = []
  const placed: { d: Vector3; r: number }[] = []

  const fits = (d: Vector3, r: number, gap: number) => {
    for (const p of placed) {
      const lim = (p.r + r + gap) / R
      if (2 - 2 * d.dot(p.d) < lim * lim) return false
    }
    return true
  }

  LAYERS.forEach((layer, li) => {
    const ids = layer.ids.filter((id) => BY_ID.has(id))
    if (import.meta.env.DEV && ids.length !== layer.ids.length) console.warn(`[paper] layer ${li} (${layer.region}) names a cut-out that is not in the library`)
    if (!ids.length || layer.n <= 0) return
    const n = Math.max(1, Math.round(layer.n * (layer.n > 2 ? K : 1)))
    const centre = layer.region === 'all' ? PLAZA : offsetDir(REGIONS[layer.region].dir, layer.at?.[0] ?? 0, layer.at?.[1] ?? 0)
    // groves: a few centers inside the layer's area, and every tree is placed around one of them
    const clumps: Vector3[] = []
    for (let k = 0; k < (layer.clumps ?? 0); k++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * layer.spread * 0.75
      clumps.push(offsetDir(centre, Math.cos(a) * r, Math.sin(a) * r))
    }
    let made = 0
    for (let attempt = 0; attempt < n * 60 && made < n; attempt++) {
      let d: Vector3
      if (layer.region === 'all') {
        const z = rand() * 2 - 1, a = rand() * Math.PI * 2, s = Math.sqrt(1 - z * z)
        d = new Vector3(Math.cos(a) * s, z, Math.sin(a) * s)
      } else {
        const base = clumps.length ? clumps[Math.floor(rand() * clumps.length)] : centre
        const spread = clumps.length ? layer.clumpSpread ?? 0.15 : layer.spread
        const a = rand() * Math.PI * 2
        const r = layer.inner && !clumps.length ? layer.inner + Math.sqrt(rand()) * Math.max(0, spread - layer.inner) : Math.sqrt(rand()) * spread
        d = offsetDir(base, Math.cos(a) * r, Math.sin(a) * r)
      }
      const entry = BY_ID.get(ids[Math.floor(rand() * ids.length)])!
      const sc = layer.scale ? layer.scale[0] + rand() * (layer.scale[1] - layer.scale[0]) : 0.88 + rand() * 0.28
      const radius = entry.radius * sc

      const h = heightAt(d.x, d.y, d.z)
      const above = R + h - WATER_R
      const ground = layer.ground ?? 'land'
      if (ground === 'water') { if (above > -0.3 || above < -1.1) continue }
      else if (ground === 'shore') { if (shoreness(d) < 0.3 || above < 0.25 || slopeAt(d, h) > 0.6) continue }
      else if (above < (layer.minAbove ?? 0.45) || slopeAt(d, h) > (layer.slope ?? 0.5)) continue
      if (ground !== 'water') {
        if (!layer.paths && entry.size > 0.7 && pathDist(d) < 0.045) continue
        if (entry.size > 0.7 && d.angleTo(PLAZA) < OPEN_RADIUS) continue
        if (d.angleTo(SPAWN) < 0.13) continue
      }
      if (!fits(d, radius, layer.gap ?? (entry.size > 1.2 ? 0.25 : 0.05))) continue

      const regionDir = layer.region === 'all' ? PLAZA : REGIONS[layer.region].dir
      const yaw = layer.face ? yawToward(d, regionDir) + (rand() - 0.5) * 0.4 : rand() * Math.PI * 2
      const hue = layer.hue ? ((layer.hue[0] + rand() * (layer.hue[1] - layer.hue[0])) * Math.PI) / 180 : (rand() - 0.5) * 0.4
      const item = newItem(`${layer.region}:${li}:${made}`, entry, d, {
        yaw, scale: sc, hue, tint: 0.93 + rand() * 0.12, seed: rand(), curl: rand() * 2 - 1,
      })
      items.push(item)
      placed.push({ d: item.dir, r: radius })
      if (layer.hard ?? entry.radius >= 0.3) obstacles.push({ d: item.dir, r: radius })
      made++
    }
  })
  if (import.meta.env.DEV) console.info(`[paper] ${items.length} statics, ${obstacles.length} solid`)
  return { items, obstacles, placed }
}

let cache: Plan | null = null
export const getPlan = () => (cache ??= generate())
