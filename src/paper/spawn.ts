import { Quaternion, Vector3 } from 'three'
import { clamp, smoothstep } from '../lib/rng'
import { R, WATER_R, angleBetween, slerpDir } from '../lib/sphere'
import { emitBurst } from '../world/Burst'
import { inWater } from '../world/collide'
import { surfaceRadius } from '../world/terrain'
import type { Life, PaperItem } from './items'
import { BirdLife, FishLife, GroundLife, InsectLife, PONDS_LIST, ensurePose, faceSign, sideQuat, type PondInfo } from './life'
import { paperClock } from './paperMaterial'
import type { PaperScene } from './PaperScene'

// What happens when something new is added: it falls out of the sky next to the kid with a star burst, then does what its kind does.
// A tree plants itself (it sprouts again where it landed), a cat starts to walk, a bird takes off, a butterfly flutters away, and a fish
// flops toward the nearest pond and dives in.

const AX = new Vector3(1, 0, 0), AZ = new Vector3(0, 0, 1)
const _qa = new Quaternion()

export const nearestPond = (dir: Vector3): PondInfo => {
  let best = PONDS_LIST[0], bd = Infinity
  for (const p of PONDS_LIST) { const d = angleBetween(p.center, dir); if (d < bd) { bd = d; best = p } }
  return best
}

// a spot of open water in the pond, as close to `from` as is sensible
function waterNear(pond: PondInfo, from: Vector3) {
  const out = new Vector3()
  for (const k of [0.62, 0.5, 0.38, 0.24, 0.1, 0]) {
    // from the pond's middle, toward where we are coming from
    slerpDir(pond.center, from, 1, out)
    const toward = angleBetween(pond.center, from)
    if (toward < 1e-4) return pond.center.clone()
    slerpDir(pond.center, from, Math.min(1, (pond.radius * k) / toward), out)
    if (inWater(out, 0.5)) return out.clone()
  }
  return pond.center.clone()
}

// the Life an element gets once it has landed
export function lifeAfterLanding(it: PaperItem): Life | null {
  const e = it.entry
  switch (e.behavior) {
    case 'walker2':
    case 'walker4': {
      // a new arrival explores for a while before it starts paying attention to the kid
      const life = new GroundLife(it, it.dir.clone(), 0.3, e.behavior)
      life.busyUntil = paperClock.value + 16
      return life
    }
    case 'bird': return new BirdLife(it, it.dir.clone(), it.dir)
    case 'insect': return new InsectLife(it, it.dir.clone(), 0.32)
    case 'fish':
    case 'floater': return new PondDiveLife(it, nearestPond(it.dir))
    default: return null
  }
}

// Falling from the sky: invisible until its turn, a short fall with a spin, a star burst and a squash on landing
export class DropLife implements Life {
  readonly handlesDrag = false
  readonly always = true
  private t: number
  private landed = false
  constructor(private scene: PaperScene, delay: number) {
    this.t = -delay
  }

  update(it: PaperItem, dt: number, _time: number) {
    this.t += dt
    const FALL = 0.9
    if (this.t < 0) { it.lift = 30; return }
    if (this.t < FALL) {
      const k = this.t / FALL
      it.lift = 16 * (1 - k * k)
      it.yaw += dt * 3 * (1 - k)
      return
    }
    if (!this.landed) {
      this.landed = true
      it.lift = 0
      it.landedAt = performance.now()
      const up = it.dir
      emitBurst(up.clone().multiplyScalar(surfaceRadius(up) + 0.3), up.clone(), it.entry.colors.length ? [...it.entry.colors, '#f2c14e'] : ['#f2c14e', '#f6a6b8', '#9ad4f5'], 26)
      // things that grow plant themselves: they sprout again where they landed
      if (it.entry.shape === 'plant' || it.entry.shape === 'building') it.batch?.setBirth(it.slot, paperClock.value)
    }
    const age = this.t - FALL
    const growing = it.entry.shape === 'plant' || it.entry.shape === 'building'
    it.squash = growing ? 0 : Math.sin(age * 18) * Math.exp(-age * 6) * 0.3
    if (age > 0.8) {
      it.squash = 0
      it.life = lifeAfterLanding(it)
      if (!it.life) it.pose = null
    }
  }
}

// A fish or a swan put down on dry land: it flops toward the nearest pond and dives in.
export class PondDiveLife implements Life {
  readonly handlesDrag = false
  readonly always = true
  private from = new Vector3()
  private to: Vector3
  private t = 0
  private dur: number
  private peak: number
  private hops: number
  private fwd = new Vector3()

  constructor(it: PaperItem, private pond: PondInfo) {
    this.from.copy(it.dir)
    this.to = waterNear(pond, it.dir)
    const dist = angleBetween(this.from, this.to) * R
    // near: a few flops. far: one big leap in a high arc
    this.hops = dist > 10 ? 1 : clamp(Math.round(dist / 3), 1, 3)
    this.dur = dist > 10 ? 2.6 : this.hops * 0.85
    this.peak = dist > 10 ? 3.4 : 0.8
    if (inWater(it.dir, 0.4)) { this.dur = 0.01 }
  }

  update(it: PaperItem, dt: number, time: number) {
    this.t += dt
    const k = clamp(this.t / this.dur)
    slerpDir(this.from, this.to, k, it.dir)
    const hopK = this.hops > 1 ? (k * this.hops) % 1 : k
    const arc = Math.sin(Math.PI * hopK)
    const ground = surfaceRadius(it.dir)
    // over land the fish flops; over the water it is already swimming height
    const base = Math.max(ground, WATER_R) - ground
    it.lift = base + arc * this.peak * (this.hops > 1 ? 1 : 1)
    // heading: toward the pond
    this.fwd.copy(this.to).addScaledVector(it.dir, -this.to.dot(it.dir))
    if (this.fwd.lengthSq() < 1e-8) this.fwd.set(0, 1, 0).addScaledVector(it.dir, -it.dir.y)
    this.fwd.normalize()
    const pose = ensurePose(it)
    sideQuat(pose.quat, it.dir, this.fwd, faceSign(it))
    pose.quat.multiply(_qa.setFromAxisAngle(AX, Math.sin(this.t * 9) * 0.5 * (1 - smoothstep(0.8, 1, k)))).multiply(_qa.setFromAxisAngle(AZ, (0.5 - hopK) * 0.9 * faceSign(it)))
    // a fish's card is centered on its middle; a swan or boat stands on its foot
    const lift = it.entry.behavior === 'fish' ? it.lift + it.entry.size * it.scale * 0.35 : it.lift
    pose.pos.copy(it.dir).multiplyScalar(ground + lift)
    pose.scale.setScalar(it.scale)
    if (k >= 1) {
      // splash
      const up = it.dir
      emitBurst(up.clone().multiplyScalar(WATER_R + 0.3), up.clone(), ['#ffffff', '#9ad4f5', '#7fd6cf', '#ffffff'], 22)
      it.lift = 0
      it.life = it.entry.behavior === 'fish' ? new FishLife(it, this.pond, this.pond.radius * 1.1) : new GroundLife(it, this.pond.center, this.pond.radius * 0.7, 'float')
    }
  }
}
