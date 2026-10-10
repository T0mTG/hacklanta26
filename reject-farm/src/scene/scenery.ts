// Everything that stands on, sails round or hangs above the planet and isn't a
// creature. Each continent is dressed for its biome and has its own weather;
// boats work the sea; clouds, the moon and the stars fill the sky.
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  SRGBColorSpace,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
} from 'three'
import { mulberry32 } from '../lib/random'
import { PLANET_R as R, dirFromLatLon, scene } from './sceneState'
import { CONTINENTS, type Continent, VOLCANO, groundHeight, sample, scatter } from './world'

const UP = new Vector3(0, 1, 0)
const CYAN = '#4DE9FF'
const MAGENTA = '#FF5ED0'
const AMBER = '#FFD76B'

function glowTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

/** A tower face at night: a grid of windows, about half of them lit. */
function windowTexture(seed: number): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 64, 128)
  const rnd = mulberry32(seed)
  const lit = ['#FFE08A', '#FFE08A', CYAN, MAGENTA, '#FFF6DC']
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 4; col++) {
      if (rnd() > 0.55) continue
      ctx.fillStyle = lit[Math.floor(rnd() * lit.length)]
      ctx.fillRect(col * 16 + 4, row * 12.8 + 3, 9, 7)
    }
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** A neon sign: glowing lettering on a dark board. */
function signTexture(text: string, color: string): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 160
  const ctx = c.getContext('2d')!
  ctx.fillStyle = 'rgba(16, 10, 36, .88)'
  ctx.fillRect(0, 0, 512, 160)
  ctx.strokeStyle = color
  ctx.lineWidth = 8
  ctx.strokeRect(8, 8, 496, 144)
  ctx.font = "900 78px Impact, 'Arial Black', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = color
  ctx.shadowBlur = 26
  ctx.fillStyle = color
  ctx.fillText(text, 256, 86, 460)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#FFFFFF'
  ctx.globalAlpha = 0.75
  ctx.fillText(text, 256, 86, 460)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

type Mat = MeshLambertMaterial | MeshBasicMaterial
const matte = (color: string, extra: Partial<ConstructorParameters<typeof MeshLambertMaterial>[0]> = {}) =>
  new MeshLambertMaterial({ color, flatShading: true, ...extra })
const lit = (color: string) => new MeshBasicMaterial({ color })

function part(geometry: BufferGeometry, material: Mat, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(geometry, material)
  m.position.set(x, y, z)
  return m
}
const group = (...parts: Object3D[]) => new Group().add(...parts)

/** Stands an object on the ground at a point, sunk in a touch so it never floats on a slope. */
function stand(obj: Object3D, dir: Vector3, spin = 0, scale = 1) {
  obj.quaternion.setFromUnitVectors(UP, dir).multiply(new Quaternion().setFromAxisAngle(UP, spin))
  obj.position.copy(dir).multiplyScalar(R + groundHeight(dir) - 0.25)
  obj.scale.setScalar(scale)
  return obj
}

/** Points that drift over a patch of the planet: snow falling, embers rising, fireflies hovering. */
interface Drift {
  points: Points
  dirs: Vector3[]
  phase: number[]
  base: number
  range: number
  speed: number
  mode: 'fall' | 'rise' | 'hover'
}

export function buildScenery() {
  const root = new Group()
  const glow = glowTexture()
  const rnd = mulberry32(99)
  const glowSprite = (color: string, size: number, opacity: number) => {
    const s = new Sprite(new SpriteMaterial({ map: glow, color, blending: AdditiveBlending, transparent: true, opacity, depthWrite: false }))
    s.scale.setScalar(size)
    return s
  }
  const land = (biome: string) => CONTINENTS.find((c) => c.biome === biome)!
  const spinners: { obj: Object3D; speed: number }[] = []
  const pulses: { sprite: Sprite; size: number; rate: number }[] = []
  const blinkers: Sprite[] = []
  const drifts: Drift[] = []

  const drift = (c: Continent | { dir: Vector3; r: number }, count: number, color: string, size: number, mode: Drift['mode'], base: number, range: number, speed: number, additive = true) => {
    const lobes = 'lobes' in c ? c.lobes : [c]
    const dirs: Vector3[] = []
    const axis = new Vector3()
    for (let i = 0; i < count; i++) {
      const lobe = lobes[Math.floor(rnd() * lobes.length)]
      axis.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(lobe.dir).normalize()
      dirs.push(lobe.dir.clone().applyAxisAngle(axis, lobe.r * Math.sqrt(rnd())))
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    const points = new Points(
      geo,
      new PointsMaterial({ map: glow, color, size, transparent: true, depthWrite: false, blending: additive ? AdditiveBlending : undefined, opacity: additive ? 1 : 0.9 }),
    )
    points.frustumCulled = false
    drifts.push({ points, dirs, phase: dirs.map(() => rnd()), base, range, speed, mode })
    root.add(points)
  }

  // a soft halo behind the planet: only the part past the horizon shows
  root.add(glowSprite('#FFB98A', 380, 0.42))

  // ---------- Meadowlands ----------
  {
    const c = land('pasture')
    const trunk = matte('#7A5B48')
    const greens = [matte('#5FA26E'), matte('#74B67C'), matte('#8FC97C')]
    const pine = () =>
      group(
        part(new CylinderGeometry(0.4, 0.6, 2.4, 6), trunk, 0, 1.2, 0),
        part(new ConeGeometry(2.7, 4.8, 7), greens[0], 0, 4.4, 0),
        part(new ConeGeometry(1.9, 3.8, 7), greens[1], 0, 7.2, 0),
      )
    const round = () => group(part(new CylinderGeometry(0.4, 0.6, 3, 6), trunk, 0, 1.5, 0), part(new IcosahedronGeometry(3, 0), greens[2], 0, 5.2, 0))
    scatter(c, 56, 0.1, 101).forEach((d, i) => root.add(stand(i % 3 ? pine() : round(), d, i, 0.7 + rnd() * 0.7)))

    const [barnAt, millAt] = scatter(c, 2, 0.3, 102)
    const window = lit('#FFE08A')
    const barn = group(
      part(new BoxGeometry(7, 4.4, 5.4), matte('#D4553F'), 0, 2.2, 0),
      part(new BoxGeometry(2.1, 2.8, 0.3), window, 0, 1.4, 2.75),
      part(new BoxGeometry(1.1, 0.9, 0.3), window, 0, 3.7, 2.75),
    )
    const roof = part(new ConeGeometry(5.9, 3.5, 4), matte('#5C3F4A'), 0, 6, 0)
    roof.rotation.y = Math.PI / 4
    barn.add(roof)
    if (barnAt) root.add(stand(barn, barnAt, -0.6))

    const blades = new Group()
    const sail = matte('#FFF6E0')
    for (let i = 0; i < 4; i++) {
      const arm = group(part(new BoxGeometry(0.9, 4.6, 0.2), sail, 0, 2.8, 0))
      arm.rotation.z = (i * Math.PI) / 2
      blades.add(arm)
    }
    blades.position.set(0, 7.4, 1.9)
    spinners.push({ obj: blades, speed: -0.9 })
    const mill = group(part(new CylinderGeometry(1.1, 1.9, 7.8, 8), matte('#F1E3CB'), 0, 3.9, 0), part(new ConeGeometry(1.6, 2.1, 8), matte('#D4553F'), 0, 8.8, 0), blades)
    if (millAt) root.add(stand(mill, millAt, 0.4))

    const hay = matte('#E8C96A')
    scatter(c, 10, 0.2, 103).forEach((d, i) => {
      const bale = part(new CylinderGeometry(1, 1, 1.5, 10), hay, 0, 1, 0)
      bale.rotation.z = Math.PI / 2
      root.add(stand(group(bale), d, i))
    })
    drift(c, 70, '#FFE98A', 1.7, 'hover', 2.5, 5, 0.5)
  }

  // ---------- The Dunes ----------
  {
    const c = land('desert')
    const stone = matte('#E2B76C')
    const pyramidSpots = scatter(c, 3, 0.32, 201)
    pyramidSpots.forEach((d, i) => {
      const p = part(new ConeGeometry(7, 7.4, 4), stone, 0, 3.7, 0)
      p.rotation.y = Math.PI / 4
      root.add(stand(group(p), d, 0.3 + i, [1, 0.72, 0.5][i]))
    })
    const clear = pyramidSpots.map((dir) => ({ dir, r: 0.06 }))
    const green = matte('#5FA57A')
    const cactus = () => {
      const g = group(part(new CylinderGeometry(0.5, 0.55, 3.8, 7), green, 0, 1.9, 0), part(new SphereGeometry(0.5, 7, 5), green, 0, 3.8, 0))
      for (const side of [-1, 1]) {
        g.add(part(new CylinderGeometry(0.3, 0.3, 1, 6), green, side * 0.85, 1.8 + side * 0.3, 0).rotateZ(Math.PI / 2))
        g.add(part(new CylinderGeometry(0.3, 0.3, 1.3, 6), green, side * 1.25, 2.5 + side * 0.3, 0))
      }
      return g
    }
    scatter(c, 34, 0.1, 202, clear).forEach((d, i) => root.add(stand(cactus(), d, i, 0.6 + rnd() * 0.7)))
    const rock = matte('#C4774A')
    scatter(c, 16, 0.08, 203, clear).forEach((d, i) => root.add(stand(group(part(new DodecahedronGeometry(1.3, 0), rock, 0, 0.6, 0)), d, i, 0.6 + rnd() * 1.4)))
  }

  // ---------- Frostcap ----------
  {
    const c = land('ice')
    const ice = matte('#BDE8FF', { emissive: '#2E7FB0', emissiveIntensity: 0.35, transparent: true, opacity: 0.92 })
    scatter(c, 44, 0.08, 301).forEach((d, i) => {
      const spike = group(part(new ConeGeometry(1, 6, 5), ice, 0, 3, 0), part(new ConeGeometry(0.6, 3.4, 5), ice, 0.9, 1.7, 0.3))
      root.add(stand(spike, d, i, 0.5 + rnd() * 1.1))
    })
    const snow = matte('#FFFFFF')
    const trunk = matte('#6B5648')
    scatter(c, 20, 0.12, 302).forEach((d, i) =>
      root.add(
        stand(
          group(part(new CylinderGeometry(0.35, 0.5, 2, 6), trunk, 0, 1, 0), part(new ConeGeometry(2.3, 4.2, 7), snow, 0, 3.9, 0), part(new ConeGeometry(1.6, 3.2, 7), snow, 0, 6.3, 0)),
          d,
          i,
          0.7 + rnd() * 0.5,
        ),
      ),
    )
    const carrot = matte('#F2903D')
    const coal = matte('#2B2330')
    scatter(c, 6, 0.15, 303).forEach((d, i) => {
      const nose = part(new ConeGeometry(0.16, 0.8, 5), carrot, 0, 3.5, 0.75)
      nose.rotation.x = Math.PI / 2
      const man = group(
        part(new SphereGeometry(1.25, 10, 8), snow, 0, 1.1, 0),
        part(new SphereGeometry(0.9, 10, 8), snow, 0, 2.6, 0),
        part(new SphereGeometry(0.6, 10, 8), snow, 0, 3.6, 0),
        nose,
        part(new SphereGeometry(0.1, 5, 4), coal, -0.22, 3.75, 0.52),
        part(new SphereGeometry(0.1, 5, 4), coal, 0.22, 3.75, 0.52),
      )
      root.add(stand(man, d, i * 1.7, 1.1))
    })
    scatter(c, 3, 0.2, 304).forEach((d, i) =>
      root.add(stand(group(part(new SphereGeometry(2.8, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), snow), part(new BoxGeometry(1.3, 1.5, 1), coal, 0, 0.7, 2.5)), d, i * 2)),
    )
    drift(c, 170, '#FFFFFF', 1.5, 'fall', 1, 20, 0.11, false)
  }

  // ---------- Deadlands ----------
  {
    const c = land('dead')
    const clear = [{ dir: VOLCANO, r: 0.17 }]
    const bark = matte('#2A2229')
    const deadTree = () => {
      const g = group(part(new CylinderGeometry(0.28, 0.5, 5, 5), bark, 0, 2.5, 0))
      for (const [x, y, tilt] of [[-0.9, 3.4, 0.9], [0.9, 4, -0.8], [-0.6, 4.8, 0.5]]) g.add(part(new CylinderGeometry(0.1, 0.2, 2.4, 4), bark, x, y, 0).rotateZ(tilt))
      return g
    }
    scatter(c, 34, 0.08, 401, clear).forEach((d, i) => root.add(stand(deadTree(), d, i, 0.7 + rnd() * 0.8)))
    const grave = matte('#877D90')
    scatter(c, 20, 0.12, 402, clear).forEach((d, i) => {
      const stone = group(part(new BoxGeometry(1.1, 1.5, 0.35), grave, 0, 0.75, 0), part(new CylinderGeometry(0.55, 0.55, 0.35, 8, 1, false, 0, Math.PI), grave, 0, 1.5, 0).rotateX(Math.PI / 2).rotateY(Math.PI / 2))
      stone.rotation.z = (rnd() - 0.5) * 0.4
      root.add(stand(group(stone), d, i * 1.3, 0.9))
    })
    const crater = glowSprite('#FF7A2E', 42, 0.85)
    crater.position.copy(VOLCANO).multiplyScalar(R + groundHeight(VOLCANO) + 4)
    pulses.push({ sprite: crater, size: 42, rate: 1.7 })
    root.add(crater)
    drift({ dir: VOLCANO, r: 0.07 }, 70, '#FF9A3D', 2.4, 'rise', 12, 30, 0.16)
    drift(c, 60, '#FF7A2E', 1.4, 'rise', 1, 9, 0.2)
  }

  // ---------- Neon City ----------
  {
    const c = land('city')
    const facades = [1, 2, 3].map((seed) => new MeshLambertMaterial({ color: '#2A2157', emissive: '#ffffff', emissiveMap: windowTexture(seed), emissiveIntensity: 0.95 }))
    const roofs = [lit(CYAN), lit(MAGENTA), lit(AMBER)]
    const mast = matte('#3A2F66')
    const [spireAt, wheelAt] = scatter(c, 2, 0.34, 501)
    const clear = [spireAt, wheelAt].filter(Boolean).map((dir) => ({ dir, r: 0.07 }))

    scatter(c, 62, 0.14, 502, clear).forEach((d, i) => {
      const w = 2.2 + rnd() * 2
      const h = 4 + rnd() * rnd() * 14
      const g = group(part(new BoxGeometry(w, h, w * (0.8 + rnd() * 0.5)), facades[i % 3], 0, h / 2, 0), part(new BoxGeometry(w + 0.3, 0.3, w + 0.3), roofs[i % 3], 0, h + 0.15, 0))
      if (h > 12) {
        g.add(part(new CylinderGeometry(0.1, 0.12, 3, 5), mast, 0, h + 1.5, 0))
        const beacon = glowSprite('#FF4D6D', 3.6, 0.9)
        beacon.position.set(0, h + 3.2, 0)
        blinkers.push(beacon)
        g.add(beacon)
      }
      root.add(stand(g, d, rnd() * 3))
    })

    if (spireAt) {
      const halo = part(new TorusGeometry(4.2, 0.28, 6, 36), lit(CYAN), 0, 17, 0).rotateX(Math.PI / 2)
      const halo2 = part(new TorusGeometry(2.9, 0.2, 6, 30), lit(MAGENTA), 0, 22, 0).rotateX(Math.PI / 2)
      spinners.push({ obj: halo, speed: 0.8 }, { obj: halo2, speed: -1.2 })
      const top = glowSprite(CYAN, 12, 0.75)
      top.position.set(0, 30, 0)
      pulses.push({ sprite: top, size: 12, rate: 2.3 })
      root.add(stand(group(part(new CylinderGeometry(1.2, 2.5, 24, 6), facades[0], 0, 12, 0), part(new CylinderGeometry(0.15, 0.6, 6, 6), mast, 0, 27, 0), halo, halo2, top), spireAt))
    }
    if (wheelAt) {
      const wheel = group(part(new TorusGeometry(5, 0.24, 6, 40), lit(MAGENTA)))
      for (let i = 0; i < 4; i++) wheel.add(part(new BoxGeometry(0.18, 10, 0.18), lit(CYAN)).rotateZ((i * Math.PI) / 4))
      wheel.position.set(0, 7, 0)
      spinners.push({ obj: wheel, speed: -0.5 })
      root.add(stand(group(part(new BoxGeometry(0.45, 7.6, 0.45), mast, -1.9, 3.6, 0), part(new BoxGeometry(0.45, 7.6, 0.45), mast, 1.9, 3.6, 0), wheel), wheelAt, 0.4))
    }

    const signs: [string, string][] = [['NO CLIENTS', MAGENTA], ['FINAL_v12', CYAN], ['OPEN LATE', AMBER], ['KERN ME', CYAN], ['2ND LIFE', MAGENTA]]
    scatter(c, signs.length, 0.1, 503, clear).forEach((d, i) => {
      const board = new Mesh(new PlaneGeometry(8, 2.5), new MeshBasicMaterial({ map: signTexture(signs[i][0], signs[i][1]), side: DoubleSide, toneMapped: false }))
      board.position.set(0, 5.6, 0)
      root.add(stand(group(part(new CylinderGeometry(0.12, 0.12, 5, 5), mast, -3, 2.5, 0), part(new CylinderGeometry(0.12, 0.12, 5, 5), mast, 3, 2.5, 0), board), d, i * 1.1))
    })
    scatter(c, 14, 0.06, 504, clear).forEach((d, i) => {
      const color = i % 2 ? MAGENTA : CYAN
      const lampGlow = glowSprite(color, 8, 0.6)
      lampGlow.position.set(0, 2.8, 0)
      pulses.push({ sprite: lampGlow, size: 8, rate: 3.1 })
      root.add(stand(group(part(new CylinderGeometry(0.13, 0.17, 2.6, 5), mast, 0, 1.3, 0), part(new SphereGeometry(0.45, 8, 6), lit(color), 0, 2.8, 0), lampGlow), d))
    })
    drift(c, 46, CYAN, 1.8, 'hover', 9, 8, 0.4)
  }

  // ---------- Bloomwood ----------
  {
    const c = land('bloom')
    const stem = matte('#F6E9D8')
    const spot = matte('#FFFFFF')
    const caps = ['#FF7EC8', '#B06BE0', '#4FD9C4', '#FF9A6B'].map((color) => matte(color, { emissive: color, emissiveIntensity: 0.4 }))
    scatter(c, 46, 0.08, 601).forEach((d, i) => {
      const g = group(part(new CylinderGeometry(0.5, 0.75, 3.2, 7), stem, 0, 1.6, 0), part(new SphereGeometry(2.5, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), caps[i % caps.length], 0, 2.9, 0))
      for (const [x, y, z] of [[1, 4.9, 0.6], [-0.9, 4.7, -0.8], [0.1, 5.3, -0.2], [-0.5, 4.5, 1.3]]) g.add(part(new SphereGeometry(0.34, 6, 4), spot, x, y, z))
      // most are knee-high; a few tower over everything
      root.add(stand(g, d, i, i % 9 === 0 ? 2.4 + rnd() : 0.4 + rnd() * 0.9))
    })
    drift(c, 110, '#5FF2D0', 1.9, 'rise', 1, 16, 0.05)
    drift(c, 60, '#FF8AD8', 1.6, 'rise', 1, 12, 0.07)
  }

  // ---------- boats ----------
  const boats: { obj: Group; p: Vector3; heading: Vector3; turn: number; phase: number }[] = []
  {
    const hull = matte('#8A5A3C')
    const sail = matte('#FFF6E0')
    const probe = new Vector3()
    for (let tries = 0; boats.length < 5 && tries < 400; tries++) {
      probe.copy(dirFromLatLon((Math.asin(rnd() * 2 - 1) * 180) / Math.PI, rnd() * 360))
      if (sample(probe).f > -0.3) continue
      const canvas = part(new ConeGeometry(1.5, 3, 3), sail, 0, 2.5, 0)
      canvas.scale.z = 0.12
      const obj = group(part(new BoxGeometry(1.4, 0.7, 3.6), hull, 0, 0.2, 0), part(new ConeGeometry(0.7, 1.2, 4), hull, 0, 0.2, 2.3).rotateX(Math.PI / 2), part(new CylinderGeometry(0.08, 0.08, 3.6, 5), hull, 0, 2, 0), canvas)
      const p = probe.clone()
      boats.push({ obj, p, heading: new Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(p).normalize(), turn: rnd() < 0.5 ? 1 : -1, phase: rnd() * 6 })
      root.add(obj)
    }
  }

  // ---------- clouds ----------
  const clouds = new Group()
  const puff = matte('#F1D8EA')
  const cloudSpots: [number, number, number][] = [[58, -40, 1], [-56, 70, 0.85], [50, 150, 0.9], [-48, -130, 1.05], [10, 96, 0.7], [-12, -20, 0.8], [30, 20, 0.6]]
  for (const [lat, lng, s] of cloudSpots) {
    const c = new Group()
    for (const [x, y, z, r] of [[-5, 0, 0, 4.2], [0, 1.4, 0, 5.6], [5.2, 0, 0, 4], [1, -0.8, 3, 3.8]]) c.add(part(new IcosahedronGeometry(r, 1), puff, x, y, z))
    const d = dirFromLatLon(lat, lng)
    c.quaternion.setFromUnitVectors(UP, d)
    c.position.copy(d).multiplyScalar(R + 34)
    c.scale.setScalar(s)
    clouds.add(c)
  }
  root.add(clouds)

  // ---------- the moon, far out so it never comes between you and the planet ----------
  const orbit = new Group()
  orbit.rotation.set(0.5, 2.2, 0.35)
  const moon = part(new IcosahedronGeometry(46, 2), new MeshLambertMaterial({ color: '#FFF3D2', emissive: '#FFE7A8', emissiveIntensity: 0.55, flatShading: true }), 980, 0, 0)
  moon.add(glowSprite('#FFE9B0', 330, 0.42))
  orbit.add(moon)
  root.add(orbit)

  // ---------- stars, in three sizes so they can twinkle out of step ----------
  const stars = new Group()
  const starLayers: PointsMaterial[] = []
  const tints = ['#FFF6DC', '#FFF6DC', '#CFE0FF', '#FFD9E8', '#FFE7A8']
  ;[[620, 3], [280, 4.6], [80, 7.5]].forEach(([n, size]) => {
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const c = new Color()
    for (let i = 0; i < n; i++) {
      const d = dirFromLatLon((Math.asin(rnd() * 2 - 1) * 180) / Math.PI, rnd() * 360).multiplyScalar(1700 + rnd() * 700)
      pos.set([d.x, d.y, d.z], i * 3)
      c.set(tints[Math.floor(rnd() * tints.length)])
      col.set([c.r, c.g, c.b], i * 3)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('color', new BufferAttribute(col, 3))
    const mat = new PointsMaterial({ map: glow, size, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false })
    starLayers.push(mat)
    stars.add(new Points(geo, mat))
  })
  root.add(stars)

  const axis = new Vector3()
  const ahead = new Vector3()
  const right = new Vector3()
  const basis = new Matrix4()
  const v = new Vector3()

  function tick(t: number, dt: number) {
    for (const s of spinners) s.obj.rotation.z += dt * s.speed
    pulses.forEach((p, i) => p.sprite.scale.setScalar(p.size * (1 + 0.09 * Math.sin(t * p.rate + i * 1.7))))
    // aircraft warning lights blink, each tower on its own beat
    blinkers.forEach((s, i) => (s.material.opacity = Math.sin(t * 2.4 + i * 1.3) > 0.2 ? 0.95 : 0.12))

    for (const d of drifts) {
      const a = d.points.geometry.getAttribute('position') as BufferAttribute
      for (let i = 0; i < d.dirs.length; i++) {
        let alt: number
        if (d.mode === 'hover') alt = d.base + d.range * (0.5 + 0.5 * Math.sin(t * d.speed + d.phase[i] * 40))
        else {
          const u = (d.phase[i] + t * d.speed) % 1
          alt = d.base + d.range * (d.mode === 'rise' ? u : 1 - u)
        }
        // a slow sideways sway, so nothing moves in a dead-straight line
        v.copy(d.dirs[i]).multiplyScalar(R + alt)
        a.setXYZ(i, v.x + Math.sin(t * 0.7 + i) * 0.5, v.y + Math.cos(t * 0.6 + i * 1.3) * 0.5, v.z + Math.sin(t * 0.5 + i * 2.1) * 0.5)
      }
      a.needsUpdate = true
    }

    // boats sail straight until they see land ahead, then come about
    for (const b of boats) {
      axis.crossVectors(b.p, b.heading).normalize()
      ahead.copy(b.p).applyAxisAngle(axis, 0.1)
      if (sample(ahead).f > -0.08) b.heading.applyAxisAngle(b.p, b.turn * dt * 1.1)
      else {
        b.p.applyAxisAngle(axis, 0.028 * dt).normalize()
        b.heading.applyAxisAngle(axis, 0.028 * dt)
      }
      b.heading.addScaledVector(b.p, -b.heading.dot(b.p)).normalize()
      right.crossVectors(b.p, b.heading)
      basis.makeBasis(right, b.p, b.heading)
      b.obj.quaternion.setFromRotationMatrix(basis)
      b.obj.rotateZ(Math.sin(t * 1.6 + b.phase) * 0.09)
      b.obj.position.copy(b.p).multiplyScalar(R + 0.35 + Math.sin(t * 1.3 + b.phase) * 0.18)
    }

    clouds.rotation.y += dt * 0.022
    orbit.rotation.y += dt * 0.012
    starLayers.forEach((m, i) => (m.opacity = 0.8 + 0.2 * Math.sin(t * (0.7 + i * 0.45) + i * 2.1)))
    // the far sky shifts a little against the pointer, for depth
    stars.rotation.y += (scene.pointer.x * 0.03 - stars.rotation.y) * Math.min(1, dt * 3)
    stars.rotation.x += (scene.pointer.y * 0.02 - stars.rotation.x) * Math.min(1, dt * 3)
  }

  return { root, tick }
}
