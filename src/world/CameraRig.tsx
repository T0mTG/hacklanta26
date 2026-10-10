import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, Vector3 } from 'three'
import { player } from '../entities/playerState'
import { ditherU } from '../lib/dither'
import { LITE } from '../lib/env'
import { clamp, damp } from '../lib/rng'
import { R, slerpDir } from '../lib/sphere'
import { palette } from '../data/theme'
import { useStore } from '../store'
import { surfaceRadius } from './terrain'
import { GLOBE_FOV, WALK_FOV, blendPose, clampZoom, copyPose, ease, fitDist, inputLock, orbit, rig, view } from './rig'

const _head = new Vector3(), _look = new Vector3(), _cdir = new Vector3(), _pos = new Vector3(), _n = new Vector3()

// Three ways to look at the planet:
//  title - the planet turns slowly behind the logo
//  globe - grab and spin it, wheel or pinch to zoom
//  walk  - behind the kid, drag to look around, wheel or pinch to zoom
export default function CameraRig() {
  const { camera, gl } = useThree()
  const sky = useMemo(() => ({
    globe: new Color(palette.skyGlobe), top: new Color(palette.skyWalkTop), bottom: new Color(palette.skyWalkBottom),
    a: new Color(), b: new Color(), last: -1,
  }), [])

  useEffect(() => {
    const el = gl.domElement
    const pts = new Map<number, { x: number; y: number }>()
    let lastT = 0

    const pxPerRad = () => Math.max(90, (0.31 * Math.min(el.clientWidth, el.clientHeight)) / rig.zoom)
    const pinchDist = () => {
      const [a, b] = [...pts.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const mode = () => useStore.getState().cam
    const blocked = () => {
      const s = useStore.getState()
      return !!s.viewing || !!s.overlay || s.drawer || s.help
    }

    const down = (e: PointerEvent) => {
      if (mode() === 'title' || blocked()) return
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      el.setPointerCapture(e.pointerId)
      rig.dragging = true
      rig.spin.x = rig.spin.y = 0
      lastT = performance.now()
    }
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId)
      if (!p || inputLock.easel) return
      const dx = e.clientX - p.x, dy = e.clientY - p.y
      const walking = mode() === 'walk'
      if (pts.size === 2) {
        const before = pinchDist()
        p.x = e.clientX; p.y = e.clientY
        const after = pinchDist()
        if (before > 0 && after > 0) {
          if (walking) player.zoom = clamp(player.zoom * (before / after), 0.55, 2.4)
          else rig.zoomGoal = clampZoom(rig.zoomGoal * (before / after))
        }
        return
      }
      p.x = e.clientX; p.y = e.clientY
      if (walking) {
        // look around the kid: turn the camera heading and tilt it up or down
        player.camFwd.applyAxisAngle(player.dir, -dx * 0.0065)
        player.pitch = clamp(player.pitch + dy * 0.0045, 0.12, 1.25)
        return
      }
      const k = 1 / pxPerRad()
      orbit(dx * k, dy * k)
      const now = performance.now(), dt = Math.max(8, now - lastT) / 1000
      lastT = now
      rig.spin.x = (dx * k) / dt * 0.6 + rig.spin.x * 0.4
      rig.spin.y = (dy * k) / dt * 0.6 + rig.spin.y * 0.4
    }
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId)
      if (pts.size === 0) rig.dragging = false
      if (performance.now() - lastT > 90) rig.spin.x = rig.spin.y = 0 // held still before letting go: no fling
    }
    const wheel = (e: WheelEvent) => {
      const m = mode()
      if (m === 'title' || blocked()) return
      e.preventDefault()
      if (m === 'walk') player.zoom = clamp(player.zoom * Math.exp(e.deltaY * 0.0012), 0.55, 2.4)
      else rig.zoomGoal = clampZoom(rig.zoomGoal * Math.exp(e.deltaY * 0.0012))
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const cam = useStore.getState().cam
    rig.aspect = state.size.width / state.size.height

    if (cam !== rig.mode) {
      copyPose(rig.from, rig.pose)
      rig.dur = cam === 'walk' ? (rig.mode === 'title' ? 2.6 : 1.7) : cam === 'title' ? 1.9 : 1.7
      rig.mode = cam
      rig.k = 0
      rig.walk.ready = false
    }

    if (cam === 'title') orbit(0.08 * dt, 0)
    else if (cam === 'globe' && !rig.dragging) {
      orbit(rig.spin.x * dt, rig.spin.y * dt)
      const f = Math.exp(-3.4 * dt)
      rig.spin.x *= f; rig.spin.y *= f
    }
    rig.zoom = damp(rig.zoom, rig.zoomGoal, 8, dt)

    const g = rig.goal
    const fit = fitDist(rig.aspect)
    if (cam === 'walk') {
      const p = player
      _head.copy(p.dir).multiplyScalar(surfaceRadius(p.dir) + 0.85)
      _look.copy(_head).addScaledVector(p.camFwd, 0.7)
      _cdir.copy(p.camFwd).multiplyScalar(-Math.cos(p.pitch)).addScaledVector(p.dir, Math.sin(p.pitch)).normalize()
      let dist = 7.2 * p.zoom
      // keep the camera out of the hills: pull it in until it clears the ground
      for (let i = 0; i < 6; i++) {
        _pos.copy(_look).addScaledVector(_cdir, dist)
        const r = _pos.length()
        _n.copy(_pos).divideScalar(r)
        if (r > surfaceRadius(_n) + 0.9) break
        dist *= 0.82
      }
      // trail the kid a little instead of being bolted to them
      const w = rig.walk
      if (!w.ready) { w.target.copy(_look); w.dir.copy(_cdir); w.up.copy(p.dir); w.dist = dist; w.ready = true }
      else {
        w.target.lerp(_look, 1 - Math.exp(-12 * dt))
        slerpDir(w.dir, _cdir, 1 - Math.exp(-9 * dt), w.dir)
        slerpDir(w.up, p.dir, 1 - Math.exp(-9 * dt), w.up)
        w.dist = damp(w.dist, dist, 8, dt)
      }
      g.target.copy(w.target); g.dir.copy(w.dir); g.up.copy(w.up)
      g.dist = w.dist; g.fov = WALK_FOV; g.sky = 1
    } else {
      g.up.copy(rig.gUp); g.dir.copy(rig.gDir); g.fov = GLOBE_FOV; g.sky = 0
      if (cam === 'title') {
        g.dist = fit * 1.08
        // aim a little above the planet so it sits lower on screen, under the logo
        g.target.copy(rig.gUp).multiplyScalar(2 * g.dist * Math.tan((GLOBE_FOV * Math.PI) / 360) * 0.1)
      } else {
        g.dist = Math.max(17, fit * rig.zoom)
        g.target.set(0, 0, 0)
      }
    }

    rig.k = Math.min(1, rig.k + dt / rig.dur)
    if (rig.k >= 1) copyPose(rig.pose, g)
    else blendPose(rig.from, g, ease(rig.k), rig.pose)

    const p = rig.pose
    camera.position.copy(p.target).addScaledVector(p.dir, p.dist)
    camera.up.copy(p.up)
    camera.lookAt(p.target)
    const cam3 = camera as typeof camera & { fov: number; updateProjectionMatrix(): void }
    if (Math.abs(cam3.fov - p.fov) > 0.01) { cam3.fov = p.fov; cam3.updateProjectionMatrix() }
    const o = rig.override
    if (o) {
      camera.position.copy(o.pos)
      camera.up.copy(o.up)
      camera.lookAt(o.target)
      if (cam3.fov !== o.fov) { cam3.fov = o.fov; cam3.updateProjectionMatrix() }
    }
    view.camera = camera
    view.camDir.copy(camera.position).normalize()
    view.horizon = Math.min(0.92, R / camera.position.length()) - 0.3

    // anything between the camera and the kid fades out in a dither pattern
    ditherU.uDTarget.value.copy(_head)
    ditherU.uDOn.value = cam === 'walk' && rig.k > 0.5 && !LITE && !o ? 1 : 0

    // the CSS sky behind the canvas goes from flat teal (planet view) to a soft gradient (on the ground)
    if (Math.abs(p.sky - sky.last) > 0.003) {
      sky.last = p.sky
      sky.a.lerpColors(sky.globe, sky.top, p.sky)
      sky.b.lerpColors(sky.globe, sky.bottom, p.sky)
      const root = document.documentElement.style
      root.setProperty('--sky-a', `#${sky.a.getHexString()}`)
      root.setProperty('--sky-b', `#${sky.b.getHexString()}`)
    }
  })
  return null
}
