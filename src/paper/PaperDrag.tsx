import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Ray, Vector3, type PerspectiveCamera } from 'three'
import { player } from '../entities/playerState'
import { damp } from '../lib/rng'
import { R, angleBetween } from '../lib/sphere'
import { useStore } from '../store'
import { emitBurst } from '../world/Burst'
import { inWater, onLand } from '../world/collide'
import { blockedAt } from '../world/collide'
import { pickFromPointer } from '../world/pick'
import { inputLock, view } from '../world/rig'
import { slopeAt, surfaceRadius } from '../world/terrain'
import { cardDims } from './cardGeometry'
import { yawToward } from '../world/place'
import { paperItems, type PaperItem } from './items'
import { tappable } from './interact'
import { paperRuntime, rememberPlacement, standBeforeItem, walkToItem } from './runtime'
import { findPaperSpot } from './spots'

// Press and drag any element to carry it somewhere else; a short press opens its picture. The same gesture as carrying an easel on
// the Toy Globe. Elements are picked by testing the pointer's ray against a standing capsule around each one: raycasting 900
// instanced cut-outs on every pointer move would be far too slow.

const drag = {
  pending: null as PaperItem | null, // pressed, not moved yet
  item: null as PaperItem | null, // being carried
  x0: 0, y0: 0, t0: 0,
  want: new Vector3(),
  last: new Vector3(), // the last spot where it was allowed to be put down
  toastAt: 0,
}

const _ray = new Ray(), _a = new Vector3(), _b = new Vector3(), _c = new Vector3(), _d = new Vector3()

// distance from the ray to the segment p0-p1, and how far along the ray that happens (squared distance as it is cheaper)
function rayToSegment(ray: Ray, p0: Vector3, p1: Vector3) {
  const d1 = ray.direction, d2 = _a.subVectors(p1, p0)
  const r = _b.subVectors(ray.origin, p0)
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r)
  const c = d1.dot(r), b = d1.dot(d2)
  if (e < 1e-9) {
    // a single point (something that floats: a bird, a fish)
    const s0 = Math.max(0, -c / a)
    _c.copy(ray.origin).addScaledVector(d1, s0)
    return { dist: _c.distanceTo(p0), s: s0 }
  }
  const denom = a * e - b * b
  let s = denom > 1e-9 ? (b * f - c * e) / denom : 0
  if (s < 0) s = 0
  let t = (b * s + f) / e
  if (t < 0) { t = 0; s = Math.max(0, -c / a) }
  else if (t > 1) { t = 1; s = Math.max(0, (b - c) / a) }
  _c.copy(ray.origin).addScaledVector(d1, s)
  _d.copy(p0).addScaledVector(d2, t)
  return { dist: _c.distanceTo(_d), s }
}

const _p0 = new Vector3(), _p1 = new Vector3()

export function pickItem(clientX: number, clientY: number, el: HTMLElement, camera: PerspectiveCamera) {
  const rect = el.getBoundingClientRect()
  // a ray through the pointer, built the way three's Raycaster does
  const ndc = new Vector3(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1, 0.5)
  ndc.unproject(camera)
  _ray.origin.copy(camera.position)
  _ray.direction.copy(ndc).sub(_ray.origin).normalize()

  let best: PaperItem | null = null, bs = Infinity
  for (const it of paperItems.values()) {
    if (it.uid === 'player' || it.hidden || !tappable(it.entry)) continue
    if (it.dir.dot(view.camDir) < view.horizon) continue
    const { w, h } = cardDims(it.entry)
    const k = it.scale
    // a capsule from the foot to the top, as wide as the card (a little less, so thin scenery does not grab everything)
    const base = it.pose ? _p0.copy(it.pose.pos) : _p0.copy(it.dir).multiplyScalar(surfaceRadius(it.dir) + it.lift)
    const center = it.entry.behavior === 'bird' || it.entry.behavior === 'insect' || it.entry.behavior === 'fish'
    if (center) _p1.copy(base)
    else _p1.copy(base).addScaledVector(it.dir, h * k)
    const radius = Math.max(center ? Math.max(w, h) * k * 0.4 : 0.3, w * k * 0.38)
    const hit = rayToSegment(_ray, base, _p1)
    if (hit.dist < radius && hit.s < bs) { bs = hit.s; best = it }
  }
  return best
}

const needsWater = (it: PaperItem) => it.entry.behavior === 'fish' || it.entry.behavior === 'floater'
const flies = (it: PaperItem) => it.entry.behavior === 'bird' || it.entry.behavior === 'insect'

// can this thing be put down here?
function canStand(d: Vector3, it: PaperItem) {
  if (needsWater(it)) return inWater(d, 0.45)
  if (flies(it)) return true
  return onLand(d, 0.35) && slopeAt(d) < 0.6 && (it.entry.radius < 0.3 || !blockedAt(d, it.entry.radius * it.scale * 0.8, it.uid))
}

export default function PaperDrag() {
  const { camera: cam, gl } = useThree()
  const camera = cam as PerspectiveCamera

  useEffect(() => {
    const el = gl.domElement
    const hit = new Vector3()
    let hoverAt = 0
    let hovered: PaperItem | null = null

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const st = useStore.getState()
      if (st.screen !== 'world' || st.overlay || st.viewing || st.drawer || st.help || st.globe !== 'paper') return
      const it = pickItem(e.clientX, e.clientY, el, camera)
      if (!it) return
      drag.pending = it
      drag.item = null
      drag.x0 = e.clientX; drag.y0 = e.clientY; drag.t0 = performance.now()
      inputLock.easel = true // the press belongs to the element, not the camera
    }

    const move = (e: PointerEvent) => {
      if (!drag.pending && !drag.item) {
        // a grabbing hand over anything you can pick up (checked a few times a second)
        const now = performance.now()
        if (e.pointerType === 'mouse' && now - hoverAt > 90 && useStore.getState().globe === 'paper' && useStore.getState().screen === 'world') {
          hoverAt = now
          const over = pickItem(e.clientX, e.clientY, el, camera)
          if (over !== hovered) { if (hovered) hovered.hover = false; hovered = over; if (over) over.hover = true; document.body.style.cursor = over ? 'grab' : '' }
        }
        return
      }
      if (drag.pending) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return
        const it = drag.pending
        drag.item = it
        drag.pending = null
        it.dragging = true
        drag.want.copy(it.dir)
        drag.last.copy(it.dir)
        it.landedAt = it.landedAt || performance.now()
        if (it.pose) it.pose = null
      }
      const it = drag.item!
      if (!pickFromPointer(e.clientX, e.clientY, el, camera, hit)) return
      if (canStand(hit, it)) { drag.want.copy(hit); drag.last.copy(hit) }
      else if (performance.now() - drag.toastAt > 2800) {
        drag.toastAt = performance.now()
        const say = useStore.getState().say
        if (needsWater(it)) say('Fish need water! Try the pond.')
        else if (!onLand(hit, 0.35)) say("Paper can't swim! Try dry land.")
        else say('No room there, try somewhere else!')
      }
    }

    const up = () => {
      const st = useStore.getState()
      const it = drag.item
      const pending = drag.pending
      drag.item = null
      drag.pending = null
      inputLock.easel = false
      document.body.style.cursor = ''

      if (it) {
        // put it down: the nearest place with room, turned toward the kid, with a squash and a star burst
        it.dragging = false
        let spot: Vector3 | null = drag.want.clone()
        if (!canStand(spot, it)) spot = drag.last.clone()
        if (!flies(it) && !needsWater(it) && it.entry.radius >= 0.3) spot = findPaperSpot(spot, it.entry.radius * it.scale, { ignoreUid: it.uid }) ?? spot
        it.dir.copy(spot)
        const face = st.cam === 'walk' ? player.dir : view.camDir
        it.yaw = yawToward(spot, face)
        it.life?.rehome?.(it, spot)
        if (it.life && !it.life.handlesDrag) it.lift = 0
        it.landedAt = performance.now()
        it.squash = 0.3
        emitBurst(spot.clone().multiplyScalar(surfaceRadius(spot) + 0.3), spot.clone(), it.entry.colors.length ? [...it.entry.colors, '#f2c14e'] : ['#f2c14e', '#f6a6b8', '#9ad4f5'], 14)
        rememberPlacement(it)
        return
      }
      if (pending && !st.viewing && !st.overlay) {
        // a click or a tap: look at it
        if (st.cam === 'globe') { if (standBeforeItem(pending.uid)) { st.setDrawer(false); st.setViewing(null); st.setCam('walk') } }
        else if (st.cam === 'walk') {
          if (angleBetween(player.dir, pending.dir) * R < 3.8 + pending.entry.size * pending.scale * 0.3) st.setViewing(pending.uid)
          else walkToItem(pending.uid)
        }
      }
    }

    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (hovered) hovered.hover = false
      document.body.style.cursor = ''
    }
  }, [camera, gl])

  // the carried thing floats up and eases toward the pointer; what was dropped settles with a squash
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const now = performance.now()
    const scene = paperRuntime.scene
    const it = drag.item
    if (it) {
      document.body.style.cursor = 'grabbing'
      it.dir.lerp(drag.want, 1 - Math.exp(-dt * 16)).normalize()
      const float = it.entry.behavior === 'bird' || it.entry.behavior === 'insect' || it.entry.behavior === 'fish'
      const target = (float ? it.entry.size * it.scale * 0.5 : 0) + 0.5 + Math.sin(now / 130) * 0.05
      it.lift = damp(it.lift, target, 14, dt)
      scene?.writePose(it)
      return
    }
    // things that were put down (or dropped by the sky) keep their squash and lift going
    for (const p of paperItems.values()) {
      if (p.dragging || p.life) continue
      if (p.lift > 0.001) { p.lift = damp(p.lift, 0, 14, dt); scene?.writePose(p) }
      else if (p.squash > 0.001 || p.landedAt && now - p.landedAt < 900) {
        const age = (now - p.landedAt) / 1000
        const target = age < 0.8 ? Math.sin(age * 18) * Math.exp(-age * 6) * 0.3 : 0
        p.squash = target
        scene?.writePose(p)
      }
    }
  })
  return null
}
