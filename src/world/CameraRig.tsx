import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color } from 'three'
import { damp } from '../lib/rng'
import { palette } from '../data/theme'
import { useStore } from '../store'
import { GLOBE_FOV, blendPose, clampZoom, copyPose, ease, fitDist, inputLock, orbit, rig } from './rig'

// Title: the planet turns slowly. Planet view: grab and spin it, wheel or pinch to zoom.
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

    const down = (e: PointerEvent) => {
      if (useStore.getState().cam !== 'globe') return
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
      if (pts.size === 2) {
        const before = pinchDist()
        p.x = e.clientX; p.y = e.clientY
        const after = pinchDist()
        if (before > 0 && after > 0) rig.zoomGoal = clampZoom(rig.zoomGoal * (before / after))
        return
      }
      p.x = e.clientX; p.y = e.clientY
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
      if (useStore.getState().cam !== 'globe') return
      e.preventDefault()
      rig.zoomGoal = clampZoom(rig.zoomGoal * Math.exp(e.deltaY * 0.0012))
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
      rig.mode = cam
      rig.k = 0
      rig.dur = cam === 'title' ? 1.8 : 1.5
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
    g.up.copy(rig.gUp); g.dir.copy(rig.gDir); g.fov = GLOBE_FOV; g.sky = 0
    if (cam === 'title') {
      g.dist = fit * 1.08
      // aim a little above the planet so it sits lower on screen, under the logo
      g.target.copy(rig.gUp).multiplyScalar(2 * g.dist * Math.tan((GLOBE_FOV * Math.PI) / 360) * 0.1)
    } else {
      g.dist = Math.max(17, fit * rig.zoom)
      g.target.set(0, 0, 0)
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
