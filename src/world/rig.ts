import { Vector3 } from 'three'
import { clamp } from '../lib/rng'
import { slerpDir, tangentize } from '../lib/sphere'
import { PLAZA } from './regions'
import type { CamMode } from '../store'

// The camera is described as "orbit a target": position = target + dir * dist. Every camera mode produces such a pose, and moving
// between modes blends poses (direction by spherical interpolation), so a transition can never cut through the planet.
export interface Pose { target: Vector3; dir: Vector3; dist: number; up: Vector3; fov: number; sky: number }

const newPose = (): Pose => ({ target: new Vector3(), dir: new Vector3(0, 0, 1), dist: 60, up: new Vector3(0, 1, 0), fov: 36, sky: 0 })

export const GLOBE_FOV = 36

export const rig = {
  pose: newPose(), from: newPose(), goal: newPose(),
  k: 1, dur: 1.6, mode: 'title' as CamMode,
  // trackball state for title and planet view: where the camera sits and which way is up on screen
  gDir: PLAZA.clone(), gUp: tangentize(new Vector3(0, 1, 0), PLAZA),
  zoom: 1, zoomGoal: 1, spin: { x: 0, y: 0 },
  aspect: 1, dragging: false,
}

export const ZOOM_MIN = 0.4, ZOOM_MAX = 1.8

// Camera distance at which the planet is ~62% of the shorter side of the screen
export function fitDist(aspect: number, fov = GLOBE_FOV) {
  return 24.8 / 0.62 / (2 * Math.tan((fov * Math.PI) / 360) * Math.min(1, aspect))
}

const _right = new Vector3()
// Spin the globe: dx drags it sideways, dy drags it up or down (radians)
export function orbit(dx: number, dy: number) {
  rig.gDir.applyAxisAngle(rig.gUp, -dx)
  _right.crossVectors(rig.gUp, rig.gDir).normalize()
  rig.gDir.applyAxisAngle(_right, -dy)
  rig.gUp.applyAxisAngle(_right, -dy)
  rig.gUp.addScaledVector(rig.gDir, -rig.gUp.dot(rig.gDir)).normalize()
}

// Turn the globe so `dir` faces the camera (keeps the current roll)
export function faceGlobeTo(dir: Vector3) {
  rig.gDir.copy(dir)
  rig.gUp.addScaledVector(dir, -rig.gUp.dot(dir))
  if (rig.gUp.lengthSq() < 1e-6) tangentize(rig.gUp.set(0, 1, 0), dir)
  rig.gUp.normalize()
}

export function copyPose(to: Pose, from: Pose) {
  to.target.copy(from.target); to.dir.copy(from.dir); to.up.copy(from.up)
  to.dist = from.dist; to.fov = from.fov; to.sky = from.sky
}

export function blendPose(a: Pose, b: Pose, t: number, out: Pose) {
  out.target.lerpVectors(a.target, b.target, t)
  slerpDir(a.dir, b.dir, t, out.dir)
  slerpDir(a.up, b.up, t, out.up)
  out.dist = a.dist + (b.dist - a.dist) * t
  out.fov = a.fov + (b.fov - a.fov) * t
  out.sky = a.sky + (b.sky - a.sky) * t
}

export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// Pointer gestures on the canvas that other systems (easel dragging) can claim
export const inputLock = { easel: false }

export const clampZoom = (z: number) => clamp(z, ZOOM_MIN, ZOOM_MAX)
