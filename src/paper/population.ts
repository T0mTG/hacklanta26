import { Vector3 } from 'three'
import { LITE } from '../lib/env'
import { rng } from '../lib/rng'
import { offsetDir } from '../lib/sphere'
import { blockedAt, inWater, onLand, staticObstacles } from '../world/collide'
import { REGIONS, type RegionId } from '../world/regions'
import { newItem, type PaperItem } from './items'
import { BirdLife, FishLife, GroundLife, InsectLife, lifeWorld, type PondInfo } from './life'
import { BY_ID } from './library'
import type { Plan } from './layout'
import type { PaperScene } from './PaperScene'

// Who lives where. Each line puts `n` creatures chosen from `ids` around a home spot; what each one does (walks, flies, swims)
// comes from its kind, not from this table. Walkers wander within `range` radians of home, birds loop around it, fish swim a lane
// inside the named pond.
interface Cast {
  region: RegionId
  at?: [number, number]
  range: number
  ids: string[]
  n: number
  scale?: [number, number]
  pond?: 'lily' | 'duck' | 'lake'
  lane?: number
}

const PONDS: Record<'lily' | 'duck' | 'lake', PondInfo> = {
  lily: { center: REGIONS.lily.dir, radius: 0.3 },
  duck: { center: REGIONS.duck.dir, radius: 0.26 },
  lake: { center: REGIONS.lake.dir, radius: 0.5 },
}

const FISH = ['fish-blue', 'fish-orange', 'fish-green']

export const CAST: Cast[] = [
  // ---- people
  { region: 'plaza', range: 0.34, ids: ['kid-girl-red', 'mom', 'kid-girl-blue', 'toddler'], n: 4 },
  { region: 'picnic', range: 0.13, ids: ['family-mom', 'family-aunt', 'family-kid', 'family-dad'], n: 4, at: [0.03, -0.03] },
  { region: 'picnic', range: 0.14, ids: ['dog'], n: 1, at: [0.03, -0.03] },
  { region: 'village', range: 0.3, ids: ['kid-princess', 'buddy', 'toddler', 'family-mom'], n: 4 },
  { region: 'farm', range: 0.2, ids: ['family-dad', 'kid-girl-blue'], n: 2, at: [0.1, 0.12] },

  // ---- farm
  { region: 'farm', range: 0.11, ids: ['sheep'], n: 4, at: [0.36, 0.05] },
  { region: 'farm', range: 0.11, ids: ['cow'], n: 2, at: [0.36, 0.05] },
  { region: 'farm', range: 0.11, ids: ['pig', 'goat'], n: 3, at: [0.36, 0.05] },
  { region: 'farm', range: 0.13, ids: ['rooster-a', 'rooster-b', 'chick-yellow', 'chick-olive'], n: 5, at: [-0.05, -0.1] },

  // ---- pine woods
  { region: 'pines', range: 0.42, ids: ['deer'], n: 2 },
  { region: 'pines', range: 0.4, ids: ['fox', 'squirrel', 'squirrel'], n: 3 },
  { region: 'pines', range: 0.35, ids: ['hedgehog-grey', 'hedgehog-white'], n: 2 },
  { region: 'pines', range: 0.35, ids: ['bear', 'monkey'], n: 2 },
  { region: 'pines', range: 0.35, ids: ['mouse'], n: 2 },

  // ---- sunflower meadow
  { region: 'meadow', range: 0.4, ids: ['rabbit-blue'], n: 3 },
  { region: 'meadow', range: 0.45, ids: ['horse', 'unicorn'], n: 2 },
  { region: 'meadow', range: 0.45, ids: ['kangaroo', 'giraffe'], n: 2 },
  { region: 'meadow', range: 0.45, ids: ['zebra'], n: 2 },
  { region: 'meadow', range: 0.45, ids: ['elephant-lilac'], n: 1 },

  // ---- twin hills
  { region: 'twins', range: 0.4, ids: ['sheep'], n: 3 },
  { region: 'twins', range: 0.4, ids: ['goat'], n: 2 },
  { region: 'twins', range: 0.4, ids: ['elephant-teal', 'rhino', 'camel'], n: 3 },

  // ---- plaza and the villages' pets
  { region: 'plaza', range: 0.3, ids: ['cat-glasses', 'cat-small', 'dog-brown', 'rabbit-blue'], n: 4 },
  { region: 'plaza', range: 0.3, ids: ['peacock'], n: 1 },
  { region: 'cherry', range: 0.35, ids: ['panda', 'squirrel', 'chameleon'], n: 3 },
  { region: 'cherry', range: 0.3, ids: ['peacock'], n: 1 },
  { region: 'village', range: 0.3, ids: ['cat-glasses', 'dog', 'cat-small'], n: 3 },
  { region: 'village', range: 0.32, ids: ['car-pink', 'car-yellow'], n: 2 },
  { region: 'lily', range: 0.5, ids: ['frog', 'snail', 'caterpillar'], n: 4 },
  { region: 'lily', range: 0.5, ids: ['stork'], n: 1 },
  { region: 'giggle', range: 0.5, ids: ['goat'], n: 3 },
  { region: 'giggle', range: 0.45, ids: ['lion', 'leopard'], n: 2 },
  { region: 'lake', range: 0.7, ids: ['frog', 'snail'], n: 2 },

  // ---- the air
  { region: 'pines', range: 0.4, ids: ['toucan', 'bird-yellow'], n: 2 },
  { region: 'cherry', range: 0.4, ids: ['bird-lilac'], n: 2 },
  { region: 'meadow', range: 0.4, ids: ['bird-yellow', 'bird-lilac'], n: 2 },
  { region: 'village', range: 0.4, ids: ['bird-lilac', 'bird-yellow'], n: 2 },
  { region: 'lake', range: 0.5, ids: ['seagull'], n: 3 },
  { region: 'meadow', range: 0.4, ids: ['butterfly-pink', 'butterfly-orange', 'butterfly-big'], n: 6 },
  { region: 'meadow', range: 0.4, ids: ['bee'], n: 4 },
  { region: 'cherry', range: 0.4, ids: ['butterfly-pink', 'butterfly-big'], n: 3 },
  { region: 'plaza', range: 0.4, ids: ['butterfly-orange', 'butterfly-pink', 'bee'], n: 4 },
  { region: 'farm', range: 0.3, ids: ['bee'], n: 3, at: [0.12, 0.2] },
  { region: 'picnic', range: 0.3, ids: ['butterfly-pink', 'butterfly-big'], n: 2 },

  // ---- the water
  { region: 'lily', range: 0.3, ids: FISH, n: 4, pond: 'lily', lane: 0.26 },
  { region: 'duck', range: 0.26, ids: FISH, n: 3, pond: 'duck', lane: 0.24 },
  { region: 'lake', range: 0.5, ids: FISH, n: 7, pond: 'lake', lane: 0.5 },
  { region: 'lake', range: 0.5, ids: ['dolphin'], n: 2, pond: 'lake', lane: 0.6 },
  { region: 'lake', range: 0.5, ids: ['whale'], n: 1, pond: 'lake', lane: 0.6 },
  { region: 'lake', range: 0.5, ids: ['jellyfish'], n: 3, pond: 'lake', lane: 0.3 },
  { region: 'lily', range: 0.3, ids: ['duck-yellow', 'swan'], n: 3, pond: 'lily' },
  { region: 'duck', range: 0.26, ids: ['duck-yellow'], n: 3, pond: 'duck' },
  { region: 'lake', range: 0.5, ids: ['swan', 'duck-yellow'], n: 3, pond: 'lake' },
  { region: 'lake', range: 0.5, ids: ['sailboat', 'ship'], n: 2, pond: 'lake' },
]

// A dry spot with room for the creature, near home
function landStart(home: Vector3, range: number, radius: number, rand: () => number) {
  const d = new Vector3()
  // look near home first, and farther and farther out if the neighborhood is full of trees and houses
  for (let i = 0; i < 120; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * range * (1 + i / 30)
    offsetDir(home, Math.cos(a) * r, Math.sin(a) * r, d)
    if (onLand(d, 0.3) && !blockedAt(d, radius + 0.2)) return d.clone()
  }
  return home.clone()
}

function waterStart(pond: PondInfo, rand: () => number) {
  const d = new Vector3()
  for (let i = 0; i < 100; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * pond.radius * 0.7
    offsetDir(pond.center, Math.cos(a) * r, Math.sin(a) * r, d)
    if (inWater(d, 0.5)) return d.clone()
  }
  return pond.center.clone()
}

const FLOWER_KINDS = new Set(['flower', 'blossom', 'sunflower'])

// Create every creature, give each its life and hand it to the scene. Half as many with ?lite.
export function spawnPopulation(scene: PaperScene, plan: Plan) {
  // starting spots are checked against this planet's trees and houses, not the toy globe's
  staticObstacles.list = plan.obstacles
  lifeWorld.perches = plan.items.filter((i) => i.entry.perch)
  lifeWorld.flowers = plan.items.filter((i) => FLOWER_KINDS.has(i.entry.kind))
  const rand = rng(424242)
  const made: PaperItem[] = []
  CAST.forEach((c, ci) => {
    const ids = c.ids.filter((id) => BY_ID.has(id))
    if (!ids.length) return
    const n = LITE ? Math.ceil(c.n / 2) : c.n
    const home = offsetDir(REGIONS[c.region].dir, c.at?.[0] ?? 0, c.at?.[1] ?? 0)
    for (let k = 0; k < n; k++) {
      const e = BY_ID.get(ids[(ci * 3 + k) % ids.length])!
      const sc = c.scale ? c.scale[0] + rand() * (c.scale[1] - c.scale[0]) : 0.92 + rand() * 0.22
      const wild = e.behavior === 'fish' && e.kind === 'fish' // fish come in every color
      const it = newItem(`life:${ci}:${k}`, e, home, {
        scale: sc, seed: rand(), tint: 0.95 + rand() * 0.08, curl: rand() * 2 - 1,
        hue: wild ? (rand() - 0.5) * Math.PI * 1.6 : (rand() - 0.5) * 0.3,
        yaw: rand() * Math.PI * 2,
      })
      switch (e.behavior) {
        case 'walker2':
        case 'walker4': {
          it.dir.copy(landStart(home, c.range, e.radius * sc, rand))
          it.life = new GroundLife(it, home, c.range, e.behavior)
          break
        }
        case 'floater': {
          const pond = PONDS[c.pond ?? 'lake']
          it.dir.copy(waterStart(pond, rand))
          it.life = new GroundLife(it, pond.center, pond.radius * 0.72, 'float')
          break
        }
        case 'fish': it.life = new FishLife(it, PONDS[c.pond ?? 'lake'], c.lane ?? 0.3); break
        case 'bird': it.dir.copy(home); it.life = new BirdLife(it, home); break
        case 'insect': it.dir.copy(home); it.life = new InsectLife(it, home, c.range); break
        default: break
      }
      if (it.life) { scene.add(it); made.push(it) }
    }
  })
  if (import.meta.env.DEV) console.info(`[paper] ${made.length} creatures`)
  return made
}
