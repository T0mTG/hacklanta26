import { Raycaster, Vector2, Vector3, type Camera, type Ray } from 'three'
import { R } from '../lib/sphere'
import { surfaceRadius } from './terrain'

// Where a ray meets the planet, as a unit direction. Starts from a sphere and re-aims using the real terrain height a few
// times, which is far cheaper than raycasting 60,000 triangles on every pointer move.
export function pickPlanet(ray: Ray, out: Vector3) {
  let r = R + 0.4
  for (let i = 0; i < 5; i++) {
    const b = ray.origin.dot(ray.direction)
    const c = ray.origin.lengthSq() - r * r
    const disc = b * b - c
    if (disc < 0) return false
    const t = -b - Math.sqrt(disc)
    if (t < 0) return false
    out.copy(ray.origin).addScaledVector(ray.direction, t).normalize()
    r = surfaceRadius(out)
  }
  return true
}

const _ray = new Raycaster(), _ndc = new Vector2()

// Pointer position on the canvas to a point on the planet
export function pickFromPointer(clientX: number, clientY: number, el: HTMLElement, camera: Camera, out: Vector3) {
  const rect = el.getBoundingClientRect()
  _ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
  _ray.setFromCamera(_ndc, camera)
  return pickPlanet(_ray.ray, out)
}
