import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshBasicMaterial, Vector3, type Group } from 'three'
import { clamp } from '../lib/rng'
import { R, angleBetween, tangentize } from '../lib/sphere'
import { useStore } from '../store'
import { onLand, stepBlocked } from '../world/collide'
import { pickFromPointer } from '../world/pick'
import { inputLock } from '../world/rig'
import { placeOnPlanet } from './Actors'
import { keys, player, togglePlanetView } from './playerState'

const WALK = 3.3 // units per second: a lap of the planet takes about 23 seconds
const KEYMAP: Record<string, [number, number]> = {
  w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
}
const SLIDE = [0, 0.55, -0.55, 1.05, -1.05] // when something is in the way, try turning a little

const _w = new Vector3(), _b = new Vector3(), _d = new Vector3(), _f = new Vector3(), _c = new Vector3(), _axis = new Vector3(), _right = new Vector3()

const valid = (from: Vector3, to: Vector3) => onLand(to, 0.12) && !stepBlocked(from, to, 0.28)

interface PlayerOpts {
  avatar: RefObject<Group | null> // the group the movement waits for and moves (the toy kid's body; a bare group for the paper kid)
  onMove?: () => void // called every frame after the kid has moved
  nearest: (walking: boolean, viewing: string | null) => string | null // which thing is close enough to look at
}

// The kid you play. Walks with the keyboard, the joystick, or by tapping the ground; carries the camera heading along the great
// circle so "forward" never flips, no matter where on the planet you are. Shared by both globes: only the body and what counts as
// "close enough to look at" differ.
export function usePlayer({ avatar, onMove, nearest }: PlayerOpts) {
  const marker = useRef<Group>(null)
  const { camera, gl } = useThree()
  const ringMat = useMemo(() => new MeshBasicMaterial({ color: '#f2c14e', transparent: true, depthWrite: false }), [])
  const stuck = useRef(0)
  const markT = useRef(0)
  const latest = useRef({ nearest, onMove })
  latest.current = { nearest, onMove }

  useEffect(() => {
    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    }
    const canMove = () => {
      const s = useStore.getState()
      return s.screen === 'world' && s.cam === 'walk' && !s.viewing && !s.overlay && !s.drawer && !s.help
    }
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return
      const k = e.key.toLowerCase()
      const s = useStore.getState()
      if (k === 'g' && s.screen === 'world' && !s.viewing && !s.overlay) { togglePlanetView(); return }
      if (!canMove()) return
      if (KEYMAP[k]) { keys.add(k); e.preventDefault(); return }
      if ((k === 'e' || k === ' ' || k === 'enter') && s.nearId) { e.preventDefault(); s.setViewing(s.nearId) }
    }
    const up = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()) }
    const blur = () => keys.clear()

    // tap or click on the ground to walk there (a press that moves is a camera drag, not a tap)
    const el = gl.domElement
    let p0: { x: number; y: number; t: number } | null = null
    const pdown = (e: PointerEvent) => { p0 = { x: e.clientX, y: e.clientY, t: performance.now() } }
    const pup = (e: PointerEvent) => {
      const start = p0
      p0 = null
      if (!start || !canMove() || inputLock.easel) return
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6 || performance.now() - start.t > 600) return
      const hit = new Vector3()
      if (!pickFromPointer(e.clientX, e.clientY, el, camera, hit)) return
      if (!onLand(hit, 0.2)) { useStore.getState().say("That's water! Walk on the grass instead."); return }
      player.goal = hit
      player.goalEasel = null
      markT.current = performance.now()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    el.addEventListener('pointerdown', pdown)
    el.addEventListener('pointerup', pup)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      el.removeEventListener('pointerdown', pdown)
      el.removeEventListener('pointerup', pup)
    }
  }, [camera, gl])

  useFrame((_, delta) => {
    const o = avatar.current
    if (!o) return
    const dt = Math.min(delta, 0.05)
    const st = useStore.getState()
    const walking = st.screen === 'world' && st.cam === 'walk'
    const free = walking && !st.viewing && !st.overlay && !st.drawer && !st.help
    const up = player.dir
    tangentize(player.camFwd, up)
    tangentize(player.fwd, up)

    // what the kid wants to do: a direction from the keys or stick, or toward the tapped spot
    let ix = 0, iy = 0
    if (free) {
      for (const k of keys) { const v = KEYMAP[k]; if (v) { ix += v[0]; iy += v[1] } }
      ix += player.stick.x
      iy += player.stick.y
    }
    let mag = Math.min(1, Math.hypot(ix, iy))
    let want: Vector3 | null = null
    if (mag > 0.08) {
      player.goal = null
      player.goalEasel = null
      _right.crossVectors(player.camFwd, up)
      want = _w.copy(player.camFwd).multiplyScalar(iy).addScaledVector(_right, ix).normalize()
    } else if (free && player.goal) {
      const dist = angleBetween(up, player.goal) * R
      if (dist < 0.3) {
        player.goal = null
        const id = player.goalEasel
        player.goalEasel = null
        if (id) st.setViewing(id)
      } else {
        _w.copy(player.goal).addScaledVector(up, -player.goal.dot(up))
        if (_w.lengthSq() > 1e-9) { want = _w.normalize(); mag = Math.min(1, dist / 1.5 + 0.4) }
      }
    }

    let speed = 0
    if (want) {
      const ang = Math.atan2(up.dot(_b.crossVectors(player.fwd, want)), player.fwd.dot(want))
      player.fwd.applyAxisAngle(up, clamp(ang, -14 * dt, 14 * dt))
      if (Math.abs(ang) < 1.6) speed = WALK * mag * (1 - Math.min(Math.abs(ang) / 1.6, 1) * 0.6)
    }
    player.speed += (speed - player.speed) * Math.min(1, dt * 10)

    if (player.speed > 0.03) {
      const step = (player.speed * dt) / R
      let moved = false
      for (const rot of SLIDE) {
        _d.copy(player.dir)
        _f.copy(player.fwd).applyAxisAngle(up, rot)
        _c.copy(player.camFwd)
        _axis.crossVectors(_d, _f).normalize()
        _d.applyAxisAngle(_axis, step)
        _f.applyAxisAngle(_axis, step)
        _c.applyAxisAngle(_axis, step)
        if (valid(player.dir, _d)) { player.dir.copy(_d); player.fwd.copy(_f); player.camFwd.copy(_c); moved = true; break }
      }
      if (moved) stuck.current = 0
      else {
        player.speed = 0
        stuck.current += dt
        if (stuck.current > 0.7) { player.goal = null; player.goalEasel = null; stuck.current = 0 }
      }
      player.phase += player.speed * dt * 7.5
    }

    placeOnPlanet(o, player.dir, player.fwd)
    latest.current.onMove?.()

    // which thing is close enough to look at?
    const best = latest.current.nearest(walking, st.viewing)
    if (st.nearId !== best) st.setNear(best)

    // the little ring where a tap sent the kid
    const m = marker.current
    if (m) {
      const goal = player.goal
      m.visible = !!goal && walking
      if (goal) {
        placeOnPlanet(m, goal, player.fwd, undefined, 0.06)
        const k = ((performance.now() - markT.current) / 1000) % 1.2
        m.scale.setScalar(0.7 + k * 0.6)
        ringMat.opacity = 0.9 * (1 - k / 1.2)
      }
    }
  })

  return { marker, ringMat }
}

// the ring that pulses where you tapped
export function TapMarker({ marker, mat }: { marker: RefObject<Group | null>; mat: MeshBasicMaterial }) {
  return (
    <group ref={marker} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat}>
        <ringGeometry args={[0.4, 0.55, 20]} />
      </mesh>
    </group>
  )
}
