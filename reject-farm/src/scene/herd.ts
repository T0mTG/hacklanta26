// The creatures. Each one is the uploaded artwork, shown exactly as it was
// made: nothing is drawn on it. All the life comes from how it moves: it
// strolls, stops, hops, wiggles, stays on dry land, and can be picked up and
// carried somewhere new.
import {
  CircleGeometry,
  DoubleSide,
  Group,
  LinearMipmapLinearFilter,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three'
import { loadImage } from '../lib/image'
import { hashString, mulberry32 } from '../lib/random'
import type { Creature } from '../types'
import { PLANET_R as R, dirFromLatLon, now, scene } from './sceneState'
import { groundHeight, isWalkable } from './world'

/** every creature covers about the same area on screen, whatever its proportions */
const SIZE = 16
/** radians per second along the surface */
const WALK_SPEED = 0.034
const PERSONAL_SPACE = 0.13

interface Member {
  c: Creature
  group: Group
  body: Group
  mat: MeshBasicMaterial
  shadow: Mesh
  shadowMat: MeshBasicMaterial
  w: number
  h: number
  p: Vector3
  target: Vector3
  walking: boolean
  wait: number
  stride: number
  phase: number
  alt: number
  grow: number
  /** 1 facing as drawn, -1 mirrored; eased so a turn looks like a paper flip */
  flip: number
  flipTo: number
  /** counts down from 1 after any landing, driving the squash */
  squash: number
  hop: number
  /** a little idle performance: a jump or a wiggle */
  act: { kind: 'jump' | 'wiggle'; t: number } | null
  nextAct: number
  mode: 'free' | 'held' | 'bounce'
  heldTo: Vector3
  /** where it was picked up from, in case it's dropped in the sea */
  home: Vector3
  from: Vector3
  bounce: number
  rnd: () => number
  up: Vector3
  near: boolean
  landed: boolean
}

const camRight = new Vector3()
const camUp = new Vector3()
const camBack = new Vector3()
const axis = new Vector3()
const side = new Vector3()
const next = new Vector3()
const basis = new Matrix4()
const a = new Vector3()
const b = new Vector3()
const disc = new CircleGeometry(1, 28)

export function createHerd(root: Object3D, camera: PerspectiveCamera, on: { land: (p: Vector3) => void; splash: (p: Vector3) => void }) {
  const members = new Map<string, Member>()

  function add(c: Creature) {
    const rnd = mulberry32(hashString(c.id))
    let p = scene.positions.get(c.id)
    if (!p) {
      // returning creatures wake up somewhere on dry land
      p = dirFromLatLon(28, -25)
      for (let tries = 0; tries < 60; tries++) {
        a.copy(dirFromLatLon((Math.asin(rnd() * 2 - 1) * 180) / Math.PI, rnd() * 360))
        if (isWalkable(a)) {
          p = a.clone()
          break
        }
      }
    }
    scene.positions.set(c.id, p)

    const aspect = MathUtils.clamp(c.aspect || 1, 0.35, 2.8)
    const w = SIZE * Math.sqrt(aspect)
    const h = SIZE / Math.sqrt(aspect)
    const mat = new MeshBasicMaterial({ transparent: true, alphaTest: 0.03, depthWrite: false, toneMapped: false, side: DoubleSide })
    const plane = new PlaneGeometry(w, h)
    plane.translate(0, h / 2, 0) // stand on the bottom edge
    const mesh = new Mesh(plane, mat)
    mesh.renderOrder = 3
    const body = new Group().add(mesh)
    const group = new Group().add(body)
    group.visible = false

    const shadowMat = new MeshBasicMaterial({ color: '#1B1230', transparent: true, opacity: 0.3, depthWrite: false })
    const shadow = new Mesh(disc, shadowMat)
    shadow.renderOrder = 2
    shadow.visible = false
    root.add(shadow, group)

    members.set(c.id, {
      c, group, body, mat, shadow, shadowMat, w, h, p, target: p.clone(), walking: false, wait: 0.6 + rnd() * 3, stride: 0, phase: rnd() * 10,
      alt: groundHeight(p), grow: 1, flip: 1, flipTo: 1, squash: 0, hop: 0, act: null, nextAct: 3 + rnd() * 6, mode: 'free',
      heldTo: p.clone(), home: p.clone(), from: p.clone(), bounce: 0, rnd, up: new Vector3(0, 1, 0), near: true, landed: !scene.spawns.has(c.id),
    })

    loadImage(c.artSrc)
      .then((img) => {
        if (!members.has(c.id)) return
        const tex = new Texture(img)
        tex.colorSpace = SRGBColorSpace
        tex.minFilter = LinearMipmapLinearFilter
        tex.anisotropy = 8
        tex.needsUpdate = true
        mat.map = tex
        mat.needsUpdate = true
        group.visible = shadow.visible = true
      })
      .catch(() => {})
  }

  function remove(id: string) {
    const m = members.get(id)
    if (!m) return
    root.remove(m.group, m.shadow)
    m.mat.map?.dispose()
    m.mat.dispose()
    m.shadowMat.dispose()
    members.delete(id)
    scene.positions.delete(id)
  }

  function sync(list: Creature[]) {
    const keep = new Set(list.map((c) => c.id))
    for (const id of [...members.keys()]) if (!keep.has(id)) remove(id)
    for (const c of list) if (!members.has(c.id)) add(c)
  }

  // ----- picking up and putting down -----

  function hold(id: string) {
    const m = members.get(id)
    if (!m || m.mode !== 'free') return false
    m.mode = 'held'
    m.home.copy(m.p)
    m.heldTo.copy(m.p)
    m.walking = false
    m.act = null
    return true
  }

  function carry(id: string, to: Vector3) {
    members.get(id)?.heldTo.copy(to)
  }

  function release(id: string) {
    const m = members.get(id)
    if (!m || m.mode !== 'held') return
    if (isWalkable(m.p)) {
      m.mode = 'free'
      m.squash = 1
      m.wait = 1.2
      on.land(m.p)
    } else {
      // can't swim: one splash, then a hop back to where it came from
      on.splash(m.p)
      m.mode = 'bounce'
      m.from.copy(m.p)
      m.bounce = 0
    }
  }

  function update(dt: number, selectedId: string | null, hoveredId: string | null) {
    const t = now()
    camRight.setFromMatrixColumn(camera.matrixWorld, 0)
    camUp.setFromMatrixColumn(camera.matrixWorld, 1)
    camBack.setFromMatrixColumn(camera.matrixWorld, 2)

    members.forEach((m, id) => {
      const { p } = m
      const selected = id === selectedId
      let lift = 0
      let roll = 0

      // arriving: a drop from the sky
      const born = scene.spawns.get(id)
      if (born !== undefined) {
        const age = t - born
        if (age < 0.55) lift = 95 * (1 - (age / 0.55) ** 2)
        else {
          if (!m.landed) {
            m.landed = true
            m.squash = 1
            on.land(p)
          }
          scene.spawns.delete(id)
        }
      }

      if (m.mode === 'held') {
        // dangling from the pointer, kicking a little
        p.lerp(m.heldTo, Math.min(1, dt * 16)).normalize()
        lift = 7
        roll = Math.sin(t * 13 + m.phase) * 0.13
      } else if (m.mode === 'bounce') {
        m.bounce = Math.min(1, m.bounce + dt / 0.6)
        const u = m.bounce * m.bounce * (3 - 2 * m.bounce)
        p.copy(m.from).lerp(m.home, u).normalize()
        lift = Math.sin(Math.PI * m.bounce) * 16
        roll = Math.sin(m.bounce * Math.PI * 2) * 0.4
        if (m.bounce >= 1) {
          m.mode = 'free'
          m.squash = 1
          m.wait = 1
          on.land(p)
        }
      } else if (!selected && born === undefined) {
        if (m.walking) {
          const left = p.angleTo(m.target)
          const step = WALK_SPEED * dt
          axis.crossVectors(p, m.target).normalize()
          next.copy(p).applyAxisAngle(axis, step)
          // never step into the sea or into lava: stop at the edge and think again
          if (left <= step || !isWalkable(next)) {
            m.walking = false
            m.wait = 1.5 + m.rnd() * 4
          } else {
            p.copy(next).normalize()
            m.stride += dt * 9.5
            // face the way it's going, if we know which way the drawing looks
            const heading = a.copy(m.target).sub(p).dot(camRight)
            if (m.c.facing !== 'front' && Math.abs(heading) > 0.01) m.flipTo = Math.sign(heading) * (m.c.facing === 'right' ? 1 : -1)
          }
        } else if ((m.wait -= dt) <= 0) {
          for (let tries = 0; tries < 8; tries++) {
            axis.set(m.rnd() - 0.5, m.rnd() - 0.5, m.rnd() - 0.5).cross(p).normalize()
            next.copy(p).applyAxisAngle(axis, 0.08 + m.rnd() * 0.3)
            if (isWalkable(next)) {
              m.target.copy(next)
              m.walking = true
              break
            }
          }
          if (!m.walking) m.wait = 1
        } else if (!m.act && (m.nextAct -= dt) <= 0) {
          m.act = { kind: m.rnd() < 0.5 ? 'jump' : 'wiggle', t: 0 }
          m.nextAct = 4 + m.rnd() * 8
        }
        // keep a polite distance from the others
        scene.positions.forEach((other, otherId) => {
          if (otherId === id) return
          const d = p.angleTo(other)
          if (d < PERSONAL_SPACE && d > 1e-4) {
            axis.crossVectors(other, p).normalize()
            next.copy(p).applyAxisAngle(axis, (PERSONAL_SPACE - d) * dt * 1.5)
            if (isWalkable(next)) p.copy(next).normalize()
          }
        })
      }

      // walking is a waddle: a bounce and a tilt on every step
      let stretch = 1 + Math.sin(t * 2 + m.phase) * 0.014
      if (m.walking && m.mode === 'free') {
        lift += Math.abs(Math.sin(m.stride)) * 1.1
        roll += Math.sin(m.stride) * 0.085
        stretch += Math.cos(m.stride * 2) * 0.035
      }
      if (m.act) {
        m.act.t += dt
        const u = m.act.t / (m.act.kind === 'jump' ? 0.55 : 0.8)
        if (u >= 1) {
          if (m.act.kind === 'jump') m.squash = 0.7
          m.act = null
        } else if (m.act.kind === 'jump') lift += Math.sin(Math.PI * u) * 6
        else roll += Math.sin(u * Math.PI * 6) * 0.16 * (1 - u)
      }
      if (id === hoveredId && m.hop <= 0 && m.mode === 'free') m.hop = 1
      if (m.hop > 0) {
        m.hop = Math.max(0, m.hop - dt * 2.6)
        lift += Math.sin((1 - m.hop) * Math.PI) * 3.4
      }
      m.squash = Math.max(0, m.squash - dt * 2.2)
      const squish = Math.sin(Math.PI * (1 - m.squash)) * m.squash

      m.alt = MathUtils.damp(m.alt, groundHeight(p), 8, dt)

      // Face the camera like a paper doll. In the middle of the globe creatures stand
      // upright so they stay readable; toward the horizon they lean out along the
      // surface, so the ones on the edge stand on the edge.
      const px = p.dot(camRight)
      const py = p.dot(camUp)
      m.near = p.dot(camBack) > 0
      const lean = Math.atan2(px, py) * (m.near ? MathUtils.smoothstep(Math.hypot(px, py), 0.62, 0.97) : 1)
      m.up.copy(camUp).applyAxisAngle(camBack, roll - lean)
      side.crossVectors(m.up, camBack)
      basis.makeBasis(side, m.up, camBack)
      m.group.quaternion.setFromRotationMatrix(basis)
      // an upright cut-out would sink into the globe's bulge, so near-side creatures
      // draw on top; far-side ones still hide behind the planet
      m.mat.depthTest = !m.near

      const ground = R + m.alt
      m.group.position.copy(p).multiplyScalar(ground + 0.2).addScaledVector(m.up, lift)

      m.flip = MathUtils.damp(m.flip, m.flipTo, 12, dt)
      const turn = Math.sign(m.flip || 1) * Math.max(0.06, Math.abs(m.flip))
      m.grow += ((m.mode === 'held' ? 1.18 : selected ? 1.14 : id === hoveredId ? 1.07 : 1) - m.grow) * Math.min(1, dt * 10)
      m.body.scale.set(m.grow * turn * (1 + squish * 0.24), m.grow * (stretch - squish * 0.3), 1)

      m.shadow.position.copy(p).multiplyScalar(ground + 0.3)
      m.shadow.lookAt(p.x * 400, p.y * 400, p.z * 400)
      m.shadow.scale.setScalar(m.w * 0.4 * (0.45 + 0.55 * (1 - Math.min(1, lift / 60))))
      m.shadowMat.color.set(selected ? '#FFD26B' : '#1B1230')
      m.shadowMat.opacity = selected ? 0.6 : 0.3
    })
  }

  /** Which creature is under a point on screen (in pixels), if any. */
  function pick(x: number, y: number, width: number, height: number): string | null {
    const toScreen = (v: Vector3) => {
      v.project(camera)
      v.set((v.x * 0.5 + 0.5) * width, (-v.y * 0.5 + 0.5) * height, 0)
    }
    // does the pointer land on the planet itself? then far-side creatures are hidden behind it
    a.set((x / width) * 2 - 1, -(y / height) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize()
    const overPlanet = b.crossVectors(camera.position, a).length() < R

    let best: string | null = null
    let bestDepth = -Infinity
    members.forEach((m, id) => {
      if (!m.group.visible || (!m.near && overPlanet)) return
      const foot = a.copy(m.group.position)
      const top = b.copy(m.group.position).addScaledVector(m.up, m.h * m.grow)
      toScreen(foot)
      toScreen(top)
      const ux = top.x - foot.x
      const uy = top.y - foot.y
      const len2 = ux * ux + uy * uy
      if (len2 < 1) return
      const dx = x - foot.x
      const dy = y - foot.y
      const along = (dx * ux + dy * uy) / len2
      const across = Math.abs(dx * uy - dy * ux) / len2
      if (along < 0 || along > 1 || across > (0.46 * m.w) / m.h) return
      const depth = m.p.dot(camBack)
      if (depth > bestDepth) {
        bestDepth = depth
        best = id
      }
    })
    return best
  }

  function dispose() {
    for (const id of [...members.keys()]) remove(id)
  }

  return { sync, update, pick, hold, carry, release, dispose }
}
