// The planet itself. Six continents, each with its own biome, are grown from
// noise so their coastlines have bays, capes and offshore islands. One function,
// `sample`, answers "what is at this point?" for everything else: the terrain
// mesh, where props may stand, and where creatures may walk.
import { BufferAttribute, BufferGeometry, Color, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial, Vector3 } from 'three'
import { fbm, makeNoise } from '../lib/noise'
import { hashString, mulberry32 } from '../lib/random'
import { PLANET_R as R, dirFromLatLon } from './sceneState'

export type Biome = 'pasture' | 'desert' | 'ice' | 'dead' | 'city' | 'bloom'

interface Lobe {
  dir: Vector3
  /** angular radius, radians */
  r: number
}
export interface Continent {
  biome: Biome
  name: string
  lat: number
  lng: number
  lobes: Lobe[]
}

const RAD = Math.PI / 180
// each continent is a few overlapping lobes, so none of them is a plain circle
const continent = (biome: Biome, name: string, lobes: [number, number, number][]): Continent => ({
  biome,
  name,
  lat: lobes[0][0],
  lng: lobes[0][1],
  lobes: lobes.map(([lat, lng, r]) => ({ dir: dirFromLatLon(lat, lng), r: r * RAD })),
})

export const CONTINENTS: Continent[] = [
  continent('pasture', 'Meadowlands', [[28, -25, 30], [8, -48, 22], [38, -5, 15]]),
  continent('desert', 'The Dunes', [[-12, 40, 28], [-30, 62, 20], [6, 62, 16]]),
  continent('ice', 'Frostcap', [[82, 90, 22], [66, 60, 14], [-86, 0, 11]]),
  continent('dead', 'Deadlands', [[-38, -95, 26], [-18, -122, 18]]),
  continent('city', 'Neon City', [[24, 130, 24], [4, 152, 16]]),
  continent('bloom', 'Bloomwood', [[-52, 150, 20], [-50, -172, 15]]),
]

/** The volcano in the middle of the Deadlands. */
export const VOLCANO = dirFromLatLon(-36, -98)
const VOLCANO_R = 0.15

const shape = makeNoise(7)
const detail = makeNoise(19)
const ridges = makeNoise(31)
const cracks = makeNoise(43)

const smooth = (x: number, a: number, b: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export interface Sample {
  /** above zero is land; the further above, the further inland */
  f: number
  continent: Continent | null
  /** height above sea level, in world units (the planet's radius is 100) */
  height: number
  /** molten rock: glows, and nothing should stand in it */
  lava: boolean
}

const v = new Vector3()

export function sample(p: Vector3, out: Sample = { f: 0, continent: null, height: 0, lava: false }): Sample {
  const { x, y, z } = p
  // warp the lookup a little so coastlines meander instead of following the noise grid
  const wx = x + 0.3 * shape(x * 1.3 + 11, y * 1.3, z * 1.3)
  const wy = y + 0.3 * shape(x * 1.3, y * 1.3 + 23, z * 1.3)
  const wz = z + 0.3 * shape(x * 1.3, y * 1.3, z * 1.3 + 37)
  const n = fbm(shape, wx * 2.1, wy * 2.1, wz * 2.1, 5)

  let f = -1
  let best: Continent | null = null
  for (const c of CONTINENTS) {
    for (const lobe of c.lobes) {
      const g = 1 - p.angleTo(lobe.dir) / lobe.r + n * 0.62
      if (g > f) {
        f = g
        best = c
      }
    }
  }
  out.f = f
  out.continent = f > 0 ? best : null
  out.lava = false

  if (f <= 0) {
    // sea floor: a shallow shelf by the coast, dropping away further out
    out.height = -0.5 - 4.6 * smooth(-f, 0, 0.3)
    return out
  }

  const inland = smooth(f, 0, 0.3)
  const bumps = detail(x * 9, y * 9, z * 9)
  const ridge = (1 - Math.abs(ridges(x * 5.3 + 7, y * 5.3, z * 5.3))) ** 2
  let h = 0.45
  switch (best!.biome) {
    case 'pasture':
      h += inland * (1.2 + 2.2 * (0.5 + 0.5 * bumps) + 2 * ridge * inland)
      break
    case 'desert':
      // long dune crests instead of hills
      h += inland * (1 + 1.2 * (0.5 + 0.5 * bumps) + 1.5 * (1 - Math.abs(ridges(x * 7, y * 7 + 3, z * 7))))
      break
    case 'ice':
      h += inland * (1.5 + 2 * (0.5 + 0.5 * bumps) + 9 * ridge * inland)
      break
    case 'city':
      // rises quickly from the shore to a flat plateau the towers can stand on
      h += smooth(f, 0, 0.1) * 2.2
      break
    case 'bloom':
      h += inland * (1.5 + 3 * (0.5 + 0.5 * bumps) + 2.5 * ridge * inland)
      break
    case 'dead': {
      h += inland * (1 + 2 * (0.5 + 0.5 * bumps) + 5 * ridge * inland)
      // rivers of lava cut through the ash
      const flow = Math.abs(cracks(x * 6.5, y * 6.5, z * 6.5))
      if (flow < 0.05 && inland > 0.35) {
        out.lava = true
        h -= 0.5
      }
      // and the volcano: a cone with a molten crater
      const d = p.angleTo(VOLCANO) / VOLCANO_R
      if (d < 1) {
        h += 15 * (1 - d) ** 1.4
        if (d < 0.2) {
          h -= 5 * (1 - d / 0.2)
          out.lava = true
        }
      }
      break
    }
  }
  out.height = h
  return out
}

const probe: Sample = { f: 0, continent: null, height: 0, lava: false }

/** Height of the ground above sea level; water counts as sea level. */
export function groundHeight(p: Vector3): number {
  return Math.max(0, sample(p, probe).height)
}

/** Whether a creature can stand here: on land, clear of the surf and of lava. */
export function isWalkable(p: Vector3): boolean {
  sample(p, probe)
  return probe.f > 0.035 && !probe.lava
}

export function continentAt(p: Vector3): Continent | null {
  return sample(p, probe).continent
}

// ---------- colour ----------

const c1 = new Color()
const c2 = new Color()
const mixed = (a: string, b: string, t: number, out: Color) => out.copy(c1.set(a)).lerp(c2.set(b), Math.max(0, Math.min(1, t)))

const GLOW: Record<string, string[]> = {
  city: ['#4DE9FF', '#FF5ED0', '#FFD76B'],
  bloom: ['#5FF2D0', '#FF8AD8'],
}

/** Colours one triangle of terrain. Returns true if the triangle should glow instead of taking light. */
function paint(s: Sample, p: Vector3, lat: number, lng: number, rnd: number, out: Color): boolean {
  if (!s.continent) {
    // sea floor, seen through the water: pale sand in the shallows, blue in the deep
    mixed('#F1E3B4', '#2B4E9B', smooth(-s.f, 0, 0.22), out)
    return false
  }
  const beach = s.f < 0.05
  const inland = smooth(s.f, 0, 0.3)
  const bumps = 0.5 + 0.5 * detail(p.x * 9, p.y * 9, p.z * 9)
  const ridge = (1 - Math.abs(ridges(p.x * 5.3 + 7, p.y * 5.3, p.z * 5.3))) ** 2
  switch (s.continent.biome) {
    case 'pasture':
      if (beach) out.set('#EBDBA8')
      else mixed('#8FCC72', '#62AB57', bumps, out).lerp(c2.set('#C3E592'), ridge * inland * 0.8)
      break
    case 'desert':
      if (beach) out.set('#F7E8B8')
      else mixed('#F0CD88', '#E0A862', bumps, out).lerp(c2.set('#C4774A'), smooth(ridge * inland, 0.55, 0.9))
      break
    case 'ice':
      if (beach) out.set('#BFE2F2')
      else mixed('#F4FBFF', '#C7E6F6', bumps * 0.8, out).lerp(c2.set('#FFFFFF'), ridge * inland)
      break
    case 'dead':
      if (s.lava) {
        mixed('#FF6A1F', '#FFD056', rnd, out)
        return true
      }
      if (beach) out.set('#3A303F')
      else mixed('#4D4252', '#352D3B', bumps, out).lerp(c2.set('#6E4B4B'), ridge * inland * 0.9)
      break
    case 'bloom':
      if (beach) out.set('#F5D5E6')
      else {
        if (rnd < 0.035 && inland > 0.3) {
          out.set(GLOW.bloom[rnd < 0.018 ? 0 : 1])
          return true
        }
        mixed('#B982DA', '#8C63C9', bumps, out).lerp(c2.set('#F0A5D6'), ridge * inland * 0.8)
      }
      break
    case 'city': {
      if (beach) {
        out.set('#3B2F78')
        break
      }
      // avenues every six degrees, and a scatter of lit rooftops between them
      const onStreet = Math.abs(((lat + 600) % 6) - 3) > 2.56 || Math.abs((((lng + 600) * Math.cos(lat * RAD)) % 6) - 3) > 2.56
      if (onStreet && inland > 0.25) {
        out.set(Math.abs(((lat + 600) % 12) - 6) > 5 ? '#FF5ED0' : '#4DE9FF')
        return true
      }
      if (rnd < 0.07) {
        out.set(GLOW.city[Math.floor(rnd * 43) % 3])
        return true
      }
      mixed('#241B4E', '#2F2366', bumps, out)
      break
    }
  }
  // a little variation from one facet to the next, so it reads as hand-made
  out.offsetHSL(0, 0, (rnd - 0.5) * 0.035)
  return false
}

// ---------- mesh ----------

/**
 * Builds the terrain as two faceted meshes sharing one shape: the ground, which
 * takes the scene's light, and the parts that glow by themselves (lava, city
 * lights, luminous moss). The sea is a third, translucent mesh that ripples.
 */
export function buildWorld() {
  const base = new IcosahedronGeometry(1, 72)
  const src = base.getAttribute('position')
  const triangles = src.count / 3

  const land: number[] = []
  const landColor: number[] = []
  const glow: number[] = []
  const glowColor: number[] = []
  const corners = [new Vector3(), new Vector3(), new Vector3()]
  const centre = new Vector3()
  const s: Sample = { f: 0, continent: null, height: 0, lava: false }
  const color = new Color()
  const rnd = mulberry32(hashString('facets'))

  for (let t = 0; t < triangles; t++) {
    centre.set(0, 0, 0)
    for (let k = 0; k < 3; k++) {
      const dir = corners[k].fromBufferAttribute(src, t * 3 + k).normalize()
      centre.add(dir)
      dir.multiplyScalar(R + sample(dir, s).height)
    }
    centre.normalize()
    sample(centre, s)
    const lat = Math.asin(centre.y) / RAD
    const lng = Math.atan2(centre.x, centre.z) / RAD
    const glows = paint(s, centre, lat, lng, rnd(), color)
    const pos = glows ? glow : land
    const col = glows ? glowColor : landColor
    for (const c of corners) {
      pos.push(c.x, c.y, c.z)
      col.push(color.r, color.g, color.b)
    }
  }
  base.dispose()

  const geometry = (pos: number[], col: number[]) => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3))
    g.computeVertexNormals()
    return g
  }
  const root = new Group()
  root.add(new Mesh(geometry(land, landColor), new MeshLambertMaterial({ vertexColors: true, flatShading: true })))
  root.add(new Mesh(geometry(glow, glowColor), new MeshBasicMaterial({ vertexColors: true })))

  // the sea: a faceted shell at sea level whose facets rock gently
  const seaGeo = new IcosahedronGeometry(R, 22)
  const sea = new Mesh(
    seaGeo,
    new MeshPhongMaterial({ color: '#3A78D4', specular: '#CFE4FF', shininess: 70, flatShading: true, transparent: true, opacity: 0.8 }),
  )
  sea.renderOrder = 1
  root.add(sea)
  const seaPos = seaGeo.getAttribute('position') as BufferAttribute
  const rest = Float32Array.from(seaPos.array)

  function tick(t: number) {
    const a = seaPos.array as Float32Array
    for (let i = 0; i < a.length; i += 3) {
      const x = rest[i]
      const y = rest[i + 1]
      const z = rest[i + 2]
      const swell = 1 + (0.34 * Math.sin(t * 1.1 + x * 0.13 + y * 0.09) + 0.26 * Math.sin(t * 0.8 + z * 0.15 - y * 0.11)) / R
      a[i] = x * swell
      a[i + 1] = y * swell
      a[i + 2] = z * swell
    }
    seaPos.needsUpdate = true
    seaGeo.computeVertexNormals()
  }

  return { root, tick }
}

/** Seeded random spots on one continent, at least `inland` from the shore: where its scenery goes. */
export function scatter(c: Continent, count: number, inland: number, seed: number, clearOf: { dir: Vector3; r: number }[] = []): Vector3[] {
  const rnd = mulberry32(seed)
  const spots: Vector3[] = []
  const axis = new Vector3()
  for (let tries = 0; spots.length < count && tries < count * 40; tries++) {
    const lobe = c.lobes[Math.floor(rnd() * c.lobes.length)]
    axis.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(lobe.dir).normalize()
    v.copy(lobe.dir).applyAxisAngle(axis, lobe.r * 1.2 * Math.sqrt(rnd()))
    sample(v, probe)
    if (probe.continent !== c || probe.f < inland || probe.lava) continue
    if (clearOf.some((k) => v.angleTo(k.dir) < k.r)) continue
    if (spots.some((o) => o.angleTo(v) < 0.022)) continue
    spots.push(v.clone())
  }
  return spots
}
