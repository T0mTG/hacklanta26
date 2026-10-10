import { Vector3 } from 'three'
import { clamp, rng } from '../lib/rng'
import { R, angleBetween, offsetDir, stepOnSphere, tangentize } from '../lib/sphere'
import { blockedAt, inWater, onLand, stepBlocked } from '../world/collide'

export interface WalkerCfg {
  home: Vector3 // centre of the area it wanders in
  range: number // radius of that area, radians
  walk: number // units per second
  run?: number
  swim?: boolean // lives on the water instead of the land
  radius: number // body size for bumping into things
  gait?: number // radians of leg cycle per unit walked
  turn?: number // radians per second
}

export interface Goal { at: Vector3; stop: number; run?: boolean }

const _a = new Vector3(), _b = new Vector3(), _c = new Vector3()

// A creature on the globe: a position, a heading, and simple wander/go-to behavior with collision. No React in here.
export class Walker {
  dir: Vector3
  fwd = new Vector3()
  target = new Vector3()
  hasTarget = false
  speed = 0
  phase = 0
  idle = 0
  stuck = 0
  private rand: () => number

  constructor(public cfg: WalkerCfg, seed: number, start?: Vector3) {
    this.rand = rng(seed * 104729 + 7)
    this.dir = (start ?? cfg.home).clone()
    this.fwd.set(0, 1, 0)
    tangentize(this.fwd, this.dir)
    this.fwd.applyAxisAngle(this.dir, this.rand() * Math.PI * 2)
    this.idle = this.rand() * 2.5
  }

  get moving() { return this.speed > 0.05 }

  private valid(d: Vector3) {
    return this.cfg.swim ? inWater(d, 0.3) : onLand(d, 0.12) && !blockedAt(d, this.cfg.radius)
  }

  // a step is fine unless it runs into something (or leaves the land / the water)
  private canStep(from: Vector3, to: Vector3) {
    return this.cfg.swim ? inWater(to, 0.3) : onLand(to, 0.12) && !stepBlocked(from, to, this.cfg.radius)
  }

  private pick() {
    for (let i = 0; i < 10; i++) {
      const a = this.rand() * Math.PI * 2, r = Math.sqrt(this.rand()) * this.cfg.range
      const d = offsetDir(this.cfg.home, Math.cos(a) * r, Math.sin(a) * r, _c)
      if (this.valid(d)) { this.target.copy(d); this.hasTarget = true; return }
    }
    this.idle = 1
  }

  // Turn in place toward a point (used when standing and watching something)
  faceToward(p: Vector3, dt: number, rate = 4) {
    _a.copy(p).addScaledVector(this.dir, -p.dot(this.dir))
    if (_a.lengthSq() < 1e-10) return
    _a.normalize()
    const ang = Math.atan2(this.dir.dot(_b.crossVectors(this.fwd, _a)), this.fwd.dot(_a))
    this.fwd.applyAxisAngle(this.dir, clamp(ang, -rate * dt, rate * dt))
  }

  // With a goal it walks there; without one it wanders around home and stops for a while now and then.
  update(dt: number, goal?: Goal) {
    const c = this.cfg
    if (goal) { this.target.copy(goal.at); this.hasTarget = true; this.idle = 0 }
    else if (this.idle > 0) { this.idle -= dt; this.hasTarget = false }
    else if (!this.hasTarget) this.pick()

    let moveSpeed = 0
    if (this.hasTarget) {
      const dist = angleBetween(this.dir, this.target) * R
      if (dist < (goal ? goal.stop : 0.15)) {
        this.hasTarget = false
        if (!goal) this.idle = 1.2 + this.rand() * 4
      } else {
        _a.copy(this.target).addScaledVector(this.dir, -this.target.dot(this.dir))
        if (_a.lengthSq() > 1e-10) {
          _a.normalize()
          const ang = Math.atan2(this.dir.dot(_b.crossVectors(this.fwd, _a)), this.fwd.dot(_a))
          const turn = (c.turn ?? 5) * dt
          this.fwd.applyAxisAngle(this.dir, clamp(ang, -turn, turn))
          if (Math.abs(ang) < 1.2) moveSpeed = goal?.run && dist > 2 ? (c.run ?? c.walk * 2) : c.walk
        }
      }
    }

    this.speed += (moveSpeed - this.speed) * Math.min(1, dt * 8)
    if (this.speed > 0.02) {
      _c.copy(this.dir)
      _b.copy(this.fwd)
      stepOnSphere(_c, _b, (this.speed * dt) / R)
      if (this.canStep(this.dir, _c)) { this.dir.copy(_c); this.fwd.copy(_b); this.stuck = 0 }
      else {
        this.stuck += dt
        this.speed = 0
        if (!goal) { this.hasTarget = false; this.idle = 0.6 }
      }
      this.phase += this.speed * dt * (c.gait ?? 8)
    }
    tangentize(this.fwd, this.dir)
  }
}
