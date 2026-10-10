import { Quaternion, Vector3 } from 'three'
import { angleBetween, frameAt, latLon, offsetDir, tangentize } from '../lib/sphere'

export type RegionId = 'plaza' | 'lily' | 'cherry' | 'farm' | 'picnic' | 'pines' | 'village' | 'duck' | 'giggle' | 'twins' | 'lake' | 'meadow'

export interface Region {
  id: RegionId; name: string; tip: string
  dir: Vector3; r: number // r: how far (radians) the region's character reaches
  e: Vector3; n: Vector3 // local east and north at the center
}

// The 12 vertices of an icosahedron are ~63 degrees apart: one region each, so every neighbor is a short walk
// and nothing is crowded. It is rotated so the plaza faces the default camera (+Z) with the lily pond to its east.
const PHI = (1 + Math.sqrt(5)) / 2
const RAW: [number, number, number][] = [
  [0, 1, PHI], [0, 1, -PHI], [0, -1, PHI], [0, -1, -PHI], [1, PHI, 0], [1, -PHI, 0],
  [-1, PHI, 0], [-1, -PHI, 0], [PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, 1], [-PHI, 0, -1],
]

function icoVertices() {
  const v = RAW.map(([x, y, z]) => new Vector3(x, y, z).normalize())
  const plaza = latLon(10, 90)
  const q = new Quaternion().setFromUnitVectors(v[0], plaza)
  v.forEach((p) => p.applyQuaternion(q))
  const east = new Vector3(0, 1, 0).cross(plaza).normalize()
  const t8 = tangentize(v[8].clone(), plaza)
  const twist = Math.atan2(plaza.dot(new Vector3().crossVectors(t8, east)), t8.dot(east))
  v.forEach((p) => p.applyAxisAngle(plaza, twist))
  return v
}

const V = icoVertices()

const DEFS: [RegionId, string, string, number, number][] = [
  ['plaza', 'Gallery Green', 'Your drawings live here!', 0, 0.5],
  ['lily', 'Lily Pond', 'Splash splash!', 8, 0.5],
  ['cherry', 'Cherry Grove', 'Pink blossoms everywhere', 10, 0.5],
  ['farm', 'Sunflower Farm', 'Say hi to the sheep!', 2, 0.5],
  ['picnic', 'Picnic Hill', 'Someone packed snacks', 4, 0.5],
  ['pines', 'Pine Woods', 'Shh, listen to the birds', 6, 0.5],
  ['village', 'Cozy Village', 'Friendly neighbors', 7, 0.5],
  ['duck', 'Duck Pond', 'Quack quack!', 5, 0.5],
  ['giggle', 'Mount Giggle', 'Hee hee, so high up', 9, 0.55],
  ['twins', 'Twin Hills', 'Two bumps, one view', 11, 0.5],
  ['lake', 'Big Blue Lake', 'Too big to jump over', 3, 0.58],
  ['meadow', 'Sunflower Meadow', 'Butterflies love it here', 1, 0.5],
]

export const REGIONS = Object.fromEntries(
  DEFS.map(([id, name, tip, vi, r]) => {
    const dir = V[vi].clone()
    const { e, n } = frameAt(dir)
    return [id, { id, name, tip, dir, r, e, n } as Region]
  }),
) as Record<RegionId, Region>

export const REGION_LIST = Object.values(REGIONS)

export const PLAZA = REGIONS.plaza.dir
// Where the kid appears: just south of the plaza center, looking north
export const SPAWN = offsetDir(PLAZA, 0.0, -0.1)

export const TWIN_A = offsetDir(REGIONS.twins.dir, -0.2, 0.05)
export const TWIN_B = offsetDir(REGIONS.twins.dir, 0.22, -0.06)

// Dirt paths between neighboring regions, trimmed so they stop at pond shores and building yards
function rotateToward(a: Vector3, b: Vector3, ang: number) {
  const axis = new Vector3().crossVectors(a, b).normalize()
  return a.clone().applyAxisAngle(axis, ang)
}
function path(a: RegionId, b: RegionId, trimA: number, trimB: number): [Vector3, Vector3] {
  const A = REGIONS[a].dir, B = REGIONS[b].dir
  return [rotateToward(A, B, trimA), rotateToward(B, A, trimB)]
}
export const PATHS: [Vector3, Vector3][] = [
  path('plaza', 'lily', 0.1, 0.34),
  path('plaza', 'farm', 0.1, 0.12),
  path('plaza', 'cherry', 0.1, 0.1),
  path('plaza', 'picnic', 0.1, 0.1),
  path('plaza', 'pines', 0.1, 0.16),
  path('farm', 'village', 0.12, 0.12),
  path('farm', 'duck', 0.12, 0.34),
  path('cherry', 'village', 0.1, 0.12),
]

// Crops: rectangles in a region's east/north frame (half sizes in radians)
export interface Field { c: Vector3; e: Vector3; n: Vector3; hu: number; hv: number; kind: 'wheat' | 'sunflower' }
function field(region: RegionId, u: number, v: number, hu: number, hv: number, kind: Field['kind']): Field {
  const R = REGIONS[region]
  const c = offsetDir(R.dir, u, v)
  const { e, n } = frameAt(c)
  return { c, e, n, hu, hv, kind }
}
export const FIELDS: Field[] = [
  field('farm', 0.1, 0.2, 0.17, 0.1, 'wheat'),
  field('farm', -0.26, -0.02, 0.07, 0.13, 'wheat'),
  field('meadow', 0.0, 0.0, 0.2, 0.14, 'sunflower'),
]

export function nearestRegion(d: Vector3) {
  let best = REGION_LIST[0], bestA = Infinity
  for (const r of REGION_LIST) {
    const a = angleBetween(d, r.dir)
    if (a < bestA) { bestA = a; best = r }
  }
  return { region: best, angle: bestA }
}
