import { Matrix4, Quaternion, Vector3 } from 'three'
import { Walker } from '../entities/walker'
import { player } from '../entities/playerState'
import { clamp, damp, lerp, rng, smoothstep } from '../lib/rng'
import { R, WATER_R, angleBetween, frameAt, offsetDir, slerpDir, tangentize } from '../lib/sphere'
import { view } from '../world/rig'
import { useStore } from '../store'
import { surfaceRadius } from '../world/terrain'
import type { Life, PaperItem } from './items'
import { findPaperSpot } from './spots'

// How the cut-outs move. Everything here is about paper, not about bodies: a person is a card that rocks from side to side and hops
// in steps (stop-motion, about eight poses to a stride), turns by rotating about the up axis so the card passes edge-on like a
// flipping sheet, and stops to face you when you come close. Birds fold their card down the middle to flap, fish bend along their
// length, butterflies flutter. The shader does the folding and bending; this file moves and turns the cards.

const AX = new Vector3(1, 0, 0), AY = new Vector3(0, 1, 0), AZ = new Vector3(0, 0, 1)
const _x = new Vector3(), _z = new Vector3(), _t = new Vector3(), _u = new Vector3(), _c = new Vector3()
const _m = new Matrix4(), _qa = new Quaternion()

// the world the lives look at: trees to perch in, flowers to visit (filled by the population)
export const lifeWorld = { perches: [] as PaperItem[], flowers: [] as PaperItem[] }

export function ensurePose(it: PaperItem) {
  return (it.pose ??= { pos: new Vector3(), quat: new Quaternion(), scale: new Vector3(1, 1, 1) })
}
export const faceSign = (it: PaperItem) => (it.entry.face === 'L' ? -1 : 1)

// Front view (people): the card faces the way it walks
export function frontQuat(out: Quaternion, up: Vector3, fwd: Vector3) {
  _x.crossVectors(up, fwd).normalize()
  _m.makeBasis(_x, up, fwd)
  return out.setFromRotationMatrix(_m)
}

// Profile (animals, fish, birds): the card's length runs along the heading, and the drawing's face leads
export function sideQuat(out: Quaternion, up: Vector3, fwd: Vector3, s: number) {
  _x.copy(fwd).multiplyScalar(s)
  _z.crossVectors(_x, up).normalize()
  _m.makeBasis(_x, up, _z)
  return out.setFromRotationMatrix(_m)
}

// turn `fwd` toward `target` about `up` by at most `maxStep`; returns how far it still had to go
export function turnToward(fwd: Vector3, up: Vector3, target: Vector3, maxStep: number) {
  const ang = Math.atan2(up.dot(_c.crossVectors(fwd, target)), fwd.dot(target))
  fwd.applyAxisAngle(up, clamp(ang, -maxStep, maxStep))
  tangentize(fwd, up)
  return Math.abs(ang)
}

const hashSeed = (s: number) => Math.floor(s * 1e6) + 17

// ---------------------------------------------------------------- walkers: people, animals, boats and swans
// walker2: front view, rocks and hops. walker4: profile, a gentler lope. float: glides on the water.
export class GroundLife implements Life {
  readonly walker: Walker
  private look = 0
  private flipLeft = 0
  private nextFlip: number
  private seed: number
  private rand: () => number

  constructor(it: PaperItem, home: Vector3, range: number, private mode: 'walker2' | 'walker4' | 'float') {
    const e = it.entry
    const walk = e.speed
    this.walker = new Walker(
      { home, range, walk, run: walk * 2, radius: Math.max(0.12, e.radius * it.scale), gait: mode === 'walker2' ? 7 : 6, turn: mode === 'walker2' ? 4 : 3, swim: mode === 'float' },
      hashSeed(it.seed), it.dir,
    )
    this.seed = it.seed * 100
    this.rand = rng(hashSeed(it.seed) + 5)
    this.nextFlip = 3 + this.rand() * 8
  }

  update(it: PaperItem, dt: number, time: number) {
    const w = this.walker
    const e = it.entry
    const held = it.dragging || it.lift > 0.05
    if (held) { w.dir.copy(it.dir); w.speed = 0 }

    // boxed in between trees or houses for too long: step out to the nearest free spot, so nobody stays stuck
    if (w.stuck > 3.5 && this.mode !== 'float') {
      const spot = findPaperSpot(w.dir, Math.max(0.15, it.entry.radius * it.scale))
      if (spot) { w.dir.copy(spot); w.hasTarget = false; w.idle = 0.3 }
      w.stuck = 0
    }

    // the kid comes close: stop, turn to show the picture, and bounce a little
    const kidD = angleBetween(w.dir, player.dir) * R
    const kidNear = this.mode !== 'float' && !held && kidD < 4.4 && e.kind !== 'car' && useStore.getState().cam === 'walk'
    this.look = damp(this.look, kidNear ? 1 : 0, 6, dt)

    if (!held) {
      if (kidNear) {
        w.hasTarget = false
        w.speed *= Math.exp(-dt * 9)
        _t.copy(player.dir).addScaledVector(w.dir, -player.dir.dot(w.dir))
        if (_t.lengthSq() > 1e-8) {
          _t.normalize()
          if (this.mode === 'walker4') {
            _u.crossVectors(w.dir, _t).normalize() // the card's normal then points at the kid
            if (_u.dot(w.fwd) < 0) _u.negate()
            turnToward(w.fwd, w.dir, _u, 4 * dt)
          } else turnToward(w.fwd, w.dir, _t, 4 * dt)
        }
      } else if (this.flipLeft > 0) {
        // an idle animal flips to face the other way: the card turns through edge-on
        const step = Math.min(this.flipLeft, (Math.PI / 0.45) * dt)
        w.fwd.applyAxisAngle(w.dir, step)
        this.flipLeft -= step
        w.speed *= Math.exp(-dt * 8)
      } else {
        w.update(dt)
        if (this.mode === 'walker4' && w.speed < 0.05 && time > this.nextFlip) {
          this.flipLeft = Math.PI
          this.nextFlip = time + 5 + this.rand() * 9
        }
      }
      tangentize(w.fwd, w.dir)
    }
    it.dir.copy(w.dir)

    const pose = ensurePose(it)
    const up = w.dir
    const g = clamp(w.speed / Math.max(0.2, e.speed * 0.7), 0, 1)
    const calm = 1 - g
    const hopStep = Math.floor(time * 10) / 10 // "on twos": the excited bounce changes ten times a second
    let hop = 0, sq = 0

    if (this.mode === 'walker2') {
      const pq = Math.floor(w.phase / (Math.PI / 3)) * (Math.PI / 3) // six poses to a stride
      const sw = Math.sin(pq)
      let roll = sw * 0.2 * g + Math.sin(time * 1.2 + this.seed) * 0.025 * calm
      hop = Math.abs(sw) * 0.07 * g
      const yaw = Math.cos(pq) * 0.07 * g
      if (this.look > 0.05) {
        hop += Math.abs(Math.sin(hopStep * 7 + this.seed)) * 0.09 * this.look
        roll += Math.sin(hopStep * 5 + this.seed) * 0.12 * this.look
      }
      frontQuat(pose.quat, up, w.fwd)
      pose.quat.multiply(_qa.setFromAxisAngle(AY, yaw)).multiply(_qa.setFromAxisAngle(AZ, roll))
      sq = hop < 0.006 && g > 0.3 ? 0.035 : 0
    } else if (this.mode === 'walker4') {
      const s = faceSign(it)
      const pq = Math.floor(w.phase / (Math.PI / 4)) * (Math.PI / 4)
      const sw = Math.sin(pq)
      let pitch = sw * 0.08 * g
      hop = Math.abs(sw) * 0.04 * g
      if (e.kind === 'car') { hop = (Math.floor(time * 14) % 2) * 0.012 * g; pitch = Math.sin(pq * 2) * 0.02 * g }
      if (this.look > 0.05) {
        hop += Math.abs(Math.sin(hopStep * 6 + this.seed)) * 0.06 * this.look
        pitch += Math.sin(hopStep * 4 + this.seed) * 0.05 * this.look
      }
      sideQuat(pose.quat, up, w.fwd, s)
      pose.quat.multiply(_qa.setFromAxisAngle(AZ, pitch * s)).multiply(_qa.setFromAxisAngle(AX, Math.sin(pq) * 0.035 * g))
      sq = hop < 0.006 && g > 0.3 ? 0.03 : 0
    } else {
      // on the water: bobs and rocks a little
      const s = faceSign(it)
      hop = Math.sin(time * 1.3 + this.seed) * 0.02
      sideQuat(pose.quat, up, w.fwd, s)
      pose.quat.multiply(_qa.setFromAxisAngle(AX, Math.sin(time * 0.9 + this.seed) * 0.05)).multiply(_qa.setFromAxisAngle(AZ, Math.sin(time * 1.1 + this.seed) * 0.03))
    }

    const radius = this.mode === 'float' ? WATER_R + 0.03 : surfaceRadius(up)
    pose.pos.copy(up).multiplyScalar(radius + hop + it.lift)
    const k = it.scale, drop = it.squash
    pose.scale.set(k * (1 + (sq + drop) * 0.6), k * (1 - sq - drop), k * (1 + (sq + drop) * 0.6))
  }
}

// ---------------------------------------------------------------- birds
type BirdMode = 'fly' | 'approach' | 'perch' | 'leave'

// Lazy loops above the ground, now and then landing in a tree to look around, then taking off again.
export class BirdLife implements Life {
  private mode: BirdMode = 'fly'
  private t: number
  private modeT = 0
  private modeDur = 0
  private pos = new Vector3(); private fwd = new Vector3(); private from = new Vector3(); private to = new Vector3(); private perchUp = new Vector3()
  private frame
  private rho: number; private omega: number; private phi: number; private alt0: number
  private rand: () => number
  private nextPerch: number
  private flipT = 0
  private perchFwd = new Vector3()

  constructor(it: PaperItem, private home: Vector3) {
    this.rand = rng(hashSeed(it.seed) + 3)
    this.frame = frameAt(home)
    this.rho = 0.2 + this.rand() * 0.28
    this.omega = (0.42 + this.rand() * 0.3) * (this.rand() < 0.5 ? -1 : 1)
    this.phi = this.rand() * Math.PI * 2
    this.alt0 = 2.6 + this.rand() * 1.8
    this.t = this.rand() * 30
    this.nextPerch = 10 + this.rand() * 14
    this.loop(this.t, this.pos)
    this.heading(this.t, this.pos, this.fwd)
  }

  private loop(t: number, out: Vector3) {
    const a = this.omega * t + this.phi
    const u = this.rho * Math.cos(a) * (1 + 0.25 * Math.sin(0.31 * t + this.phi))
    const v = this.rho * 0.65 * Math.sin(a)
    offsetDir(this.home, u, v, _c, this.frame)
    const alt = Math.max(1.7, this.alt0 + 1.1 * Math.sin(0.42 * t + this.phi * 2))
    return out.copy(_c).multiplyScalar(surfaceRadius(_c) + alt)
  }

  private heading(t: number, p: Vector3, out: Vector3) {
    this.loop(t + 0.15, _t)
    out.subVectors(_t, p)
    return tangentize(out, _u.copy(p).normalize())
  }

  update(it: PaperItem, dt: number, time: number) {
    const pose = ensurePose(it)
    let amp = 1, bank = 0, climb = 0
    this.modeT += dt
    if (this.mode === 'fly') {
      this.t += dt
      this.loop(this.t, this.pos)
      this.heading(this.t, this.pos, this.fwd)
      bank = clamp(-Math.sign(this.omega) * 0.4, -0.5, 0.5)
      climb = Math.cos(0.42 * this.t + this.phi * 2) * 0.15
      if (time > this.nextPerch) {
        // a tree within a few steps, if there is one
        let best: PaperItem | null = null
        const cands: { it: PaperItem; d: number }[] = []
        for (const tr of lifeWorld.perches) { const d = angleBetween(tr.dir, this.pos); if (d < 0.9) cands.push({ it: tr, d }) }
        cands.sort((a, b) => a.d - b.d)
        if (cands.length) best = cands[Math.floor(this.rand() * Math.min(4, cands.length))].it
        if (best) {
          this.mode = 'approach'; this.modeT = 0; this.modeDur = 2.6 + this.rand() * 1.2
          this.from.copy(this.pos)
          this.perchUp.copy(best.dir)
          this.to.copy(best.dir).multiplyScalar(surfaceRadius(best.dir) + best.entry.size * best.scale * 0.8 + 0.3)
        } else this.nextPerch = time + 8
      }
    } else if (this.mode === 'approach') {
      const k = clamp(this.modeT / this.modeDur)
      const e = smoothstep(0, 1, k)
      this.pos.lerpVectors(this.from, this.to, e)
      _u.copy(this.pos).normalize()
      this.pos.addScaledVector(_u, Math.sin(Math.PI * k) * 0.5)
      this.fwd.subVectors(this.to, this.from)
      tangentize(this.fwd, _u)
      amp = lerp(1.3, 0.35, e)
      bank = 0.1 * (1 - k)
      climb = -0.25 * (1 - k)
      if (k >= 1) {
        this.mode = 'perch'; this.modeT = 0; this.modeDur = 5 + this.rand() * 6
        this.perchFwd.copy(this.fwd)
      }
    } else if (this.mode === 'perch') {
      this.pos.copy(this.to)
      _u.copy(this.pos).normalize()
      // look around: now and then the card flips to face the other way
      if (this.flipT > 0) {
        const step = Math.min(this.flipT, (Math.PI / 0.3) * dt)
        this.perchFwd.applyAxisAngle(_u, step)
        this.flipT -= step
      } else if (this.rand() < dt * 0.35) this.flipT = Math.PI
      tangentize(this.perchFwd, _u)
      this.fwd.copy(this.perchFwd)
      amp = 0.1
      this.pos.addScaledVector(_u, Math.abs(Math.sin(Math.floor(time * 6) * 1.7 + it.seed * 9)) * 0.05 * (this.modeT % 3 < 0.4 ? 1 : 0))
      if (this.modeT > this.modeDur) {
        this.mode = 'leave'; this.modeT = 0; this.modeDur = 2.2
        this.from.copy(this.to)
        this.t += this.modeDur // where the loop will be when it gets there
      }
    } else {
      const k = clamp(this.modeT / this.modeDur)
      this.loop(this.t - this.modeDur * (1 - k), _c)
      this.pos.lerpVectors(this.from, _c, smoothstep(0, 1, k))
      this.heading(this.t - this.modeDur * (1 - k), this.pos, this.fwd)
      amp = 1.4
      climb = 0.35 * (1 - k)
      if (k >= 1) { this.mode = 'fly'; this.nextPerch = time + 14 + this.rand() * 18 }
    }

    _u.copy(this.pos).normalize()
    it.dir.copy(_u)
    tangentize(this.fwd, _u)
    sideQuat(pose.quat, _u, this.fwd, faceSign(it))
    pose.quat.multiply(_qa.setFromAxisAngle(AX, bank)).multiply(_qa.setFromAxisAngle(AZ, climb * faceSign(it)))
    pose.pos.copy(this.pos)
    pose.scale.setScalar(it.scale)
    it.batch?.setAmp(it.slot, amp)
  }
}

// ---------------------------------------------------------------- insects
// Butterflies and bees flutter from flower to flower. They turn their wings toward you, so the fold is always the thing you see.
export class InsectLife implements Life {
  private pos = new Vector3()
  private goal = new Vector3()
  private mode: 'travel' | 'hover' = 'hover'
  private timer = 0
  private rand: () => number
  private fwd = new Vector3(0, 0, 1)
  private p1: number; private p2: number
  private home: Vector3
  private frame

  constructor(it: PaperItem, home: Vector3, private radius: number) {
    this.rand = rng(hashSeed(it.seed) + 9)
    this.home = home.clone()
    this.frame = frameAt(home)
    this.p1 = this.rand() * 6.28; this.p2 = this.rand() * 6.28
    this.pos.copy(it.dir).multiplyScalar(surfaceRadius(it.dir) + 0.7)
    this.pick()
    this.timer = this.rand() * 2
  }

  private pick() {
    // the next flower: a random one near home, else a random spot
    const near = lifeWorld.flowers.filter((f) => angleBetween(f.dir, this.home) < this.radius)
    if (near.length) {
      const f = near[Math.floor(this.rand() * near.length)]
      this.goal.copy(f.dir).multiplyScalar(surfaceRadius(f.dir) + f.entry.size * f.scale * 0.85 + 0.15)
    } else {
      const a = this.rand() * 6.28, r = Math.sqrt(this.rand()) * this.radius
      offsetDir(this.home, Math.cos(a) * r, Math.sin(a) * r, _c, this.frame)
      this.goal.copy(_c).multiplyScalar(surfaceRadius(_c) + 0.9)
    }
    this.mode = 'travel'
  }

  update(it: PaperItem, dt: number, time: number) {
    const pose = ensurePose(it)
    const e = it.entry
    const up = _u.copy(this.pos).normalize()
    let amp = 1
    if (this.mode === 'travel') {
      _t.subVectors(this.goal, this.pos)
      const dist = _t.length()
      const step = e.speed * dt * (0.6 + 0.4 * smoothstep(0, 1.5, dist))
      if (dist < 0.12) { this.mode = 'hover'; this.timer = 1.4 + this.rand() * 2.8 }
      else {
        this.pos.addScaledVector(_t, Math.min(1, step / dist))
        this.fwd.copy(_t)
      }
    } else {
      this.timer -= dt
      amp = 0.75
      if (this.timer <= 0) this.pick()
    }
    // a flutter on top: small loops in the plane of the ground and a bob, so nothing moves in a straight line
    const wob = this.mode === 'hover' ? 0.07 : 0.16
    _x.crossVectors(up, this.fwd).normalize()
    const sx = Math.sin(time * 2.3 + this.p1) * wob, sy = Math.sin(time * 3.1 + this.p2) * wob * 1.3
    const pos = _c.copy(this.pos).addScaledVector(_x, sx).addScaledVector(up, sy)
    it.dir.copy(_u.copy(pos).normalize())

    // face the camera (about the up axis), with a lazy roll and nod
    const cam = view.camera
    if (cam) {
      _t.copy(cam.position).sub(pos)
      _t.addScaledVector(it.dir, -_t.dot(it.dir))
      if (_t.lengthSq() > 1e-6) _t.normalize(); else _t.copy(this.fwd)
    } else _t.copy(this.fwd)
    tangentize(_t, it.dir)
    frontQuat(pose.quat, it.dir, _t)
    pose.quat.multiply(_qa.setFromAxisAngle(AZ, Math.sin(time * 1.7 + this.p1) * 0.3)).multiply(_qa.setFromAxisAngle(AX, Math.sin(time * 2.1 + this.p2) * 0.25 - 0.15))
    pose.pos.copy(pos)
    pose.scale.setScalar(it.scale)
    it.batch?.setAmp(it.slot, amp)
  }
}

// ---------------------------------------------------------------- fish
export interface PondInfo { center: Vector3; radius: number }

// Swims back and forth along a lane inside its pond, bending along its body, flipping at both ends, dipping in and out of the water.
// Dolphins leap now and then.
export class FishLife implements Life {
  private a = new Vector3(); private b = new Vector3()
  private u: number
  private sign = 1
  private len: number
  private turn = -1
  private pauseT = 0
  private heading0 = new Vector3()
  private fwd = new Vector3()
  private phi: number
  private leapT = -1
  private nextLeap: number
  private rand: () => number
  private billboard: boolean

  constructor(it: PaperItem, pond: PondInfo, lane: number) {
    this.rand = rng(hashSeed(it.seed) + 11)
    this.phi = this.rand() * 6.28
    this.billboard = it.entry.kind === 'jellyfish'
    this.chooseLane(pond, lane)
    this.u = this.rand()
    this.len = angleBetween(this.a, this.b) * R
    this.nextLeap = 4 + this.rand() * 8
    this.place(it)
  }

  // two ends inside the pond with water the whole way between them
  private chooseLane(pond: PondInfo, lane: number) {
    const deep = (d: Vector3) => WATER_R - surfaceRadius(d) > 0.4
    for (let tries = 0; tries < 80; tries++) {
      const ang = this.rand() * 6.28, r = Math.sqrt(this.rand()) * pond.radius * 0.8
      offsetDir(pond.center, Math.cos(ang) * r, Math.sin(ang) * r, this.a, frameAt(pond.center))
      const ang2 = this.rand() * 6.28
      const L = lane * (0.6 + this.rand() * 0.6)
      offsetDir(this.a, Math.cos(ang2) * L, Math.sin(ang2) * L, this.b)
      if (!deep(this.a) || !deep(this.b)) continue
      let ok = true
      for (let k = 1; k < 6 && ok; k++) { slerpDir(this.a, this.b, k / 6, _u); ok = deep(_u) }
      if (ok) return
    }
    // nowhere good: a short lane at the center
    this.a.copy(pond.center)
    offsetDir(pond.center, 0.06, 0, this.b)
  }

  private place(it: PaperItem) {
    slerpDir(this.a, this.b, this.u, it.dir)
  }

  update(it: PaperItem, dt: number, time: number) {
    const pose = ensurePose(it)
    const e = it.entry
    const speedAng = (e.speed * dt) / R
    let leapLift = 0, leapPitch = 0
    if (this.turn < 0) {
      this.u += (this.sign * speedAng) / Math.max(1e-3, angleBetween(this.a, this.b))
      if (this.u >= 1 || this.u <= 0) {
        this.u = clamp(this.u)
        this.turn = 0
        this.sign = -this.sign
      }
    }
    slerpDir(this.a, this.b, this.u, it.dir)
    // heading along the lane
    _t.subVectors(this.b, this.a)
    tangentize(_t, it.dir)
    if (this.sign < 0) _t.negate()
    if (this.turn >= 0) {
      // the flip at the end of the lane: the card turns around, through edge-on, while the fish hangs for a moment
      this.turn += dt
      const k = clamp(this.turn / 0.6)
      this.heading0.copy(_t).negate()
      this.fwd.copy(this.heading0).applyAxisAngle(it.dir, Math.PI * smoothstep(0, 1, k))
      if (k >= 1) this.turn = -1
    } else this.fwd.copy(_t)
    tangentize(this.fwd, it.dir)

    // dipping in and out of the water
    let lift = 0.05 + 0.2 * Math.sin(time * 0.8 + this.phi)
    if (e.kind === 'dolphin' && this.leapT < 0 && time > this.nextLeap && this.turn < 0) this.leapT = 0
    if (this.leapT >= 0) {
      this.leapT += dt
      const k = clamp(this.leapT / 1.3)
      leapLift = 1.5 * (1 - (2 * k - 1) ** 2)
      leapPitch = -(2 * k - 1) * 0.9
      if (k >= 1) { this.leapT = -1; this.nextLeap = time + 8 + this.rand() * 10 }
    }
    lift += leapLift
    if (e.kind === 'whale') lift = 0.15 + 0.1 * Math.sin(time * 0.5 + this.phi)
    if (this.billboard) lift = 0.1 + 0.3 * Math.sin(time * 0.9 + this.phi)

    if (this.billboard) {
      const cam = view.camera
      if (cam) {
        _c.copy(cam.position).sub(it.dir)
        _c.addScaledVector(it.dir, -_c.dot(it.dir))
        if (_c.lengthSq() > 1e-6) { _c.normalize(); tangentize(_c, it.dir); frontQuat(pose.quat, it.dir, _c) }
      }
      pose.quat.multiply(_qa.setFromAxisAngle(AZ, Math.sin(time * 0.7 + this.phi) * 0.12))
    } else {
      sideQuat(pose.quat, it.dir, this.fwd, faceSign(it))
      pose.quat.multiply(_qa.setFromAxisAngle(AZ, leapPitch * faceSign(it))).multiply(_qa.setFromAxisAngle(AX, Math.sin(time * 0.6 + this.phi) * 0.06))
    }
    pose.pos.copy(it.dir).multiplyScalar(WATER_R + lift)
    pose.scale.setScalar(it.scale)
  }
}

// ---------------------------------------------------------------- the kid you play
// The same rocking and hopping as any paper person, driven by where the player is walking
export class KidLife implements Life {
  update(it: PaperItem, _dt: number, time: number) {
    const pose = ensurePose(it)
    it.dir.copy(player.dir)
    const g = clamp(player.speed / 2.2, 0, 1)
    const pq = Math.floor(player.phase / (Math.PI / 3)) * (Math.PI / 3)
    const sw = Math.sin(pq)
    const roll = sw * 0.18 * g + Math.sin(time * 1.2) * 0.02 * (1 - g)
    const hop = Math.abs(sw) * 0.08 * g
    frontQuat(pose.quat, player.dir, player.fwd)
    pose.quat.multiply(_qa.setFromAxisAngle(AY, Math.cos(pq) * 0.06 * g)).multiply(_qa.setFromAxisAngle(AZ, roll))
    pose.pos.copy(player.dir).multiplyScalar(surfaceRadius(player.dir) + hop + it.lift)
    const sq = hop < 0.006 && g > 0.3 ? 0.035 : 0
    pose.scale.set(it.scale * (1 + (sq + it.squash) * 0.6), it.scale * (1 - sq - it.squash), it.scale * (1 + (sq + it.squash) * 0.6))
  }
}
