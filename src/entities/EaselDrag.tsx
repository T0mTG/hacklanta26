import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { angleBetween, R } from '../lib/sphere'
import { useStore } from '../store'
import { emitBurst } from '../world/Burst'
import { blockedAt, onLand } from '../world/collide'
import { pickFromPointer } from '../world/pick'
import { yawToward } from '../world/place'
import { inputLock, view } from '../world/rig'
import { chooseYaw, findSpot } from '../world/spots'
import { slopeAt, surfaceRadius } from '../world/terrain'
import { flyToEasel, player, walkToEasel } from './playerState'
import { easels } from './registry'

// One gesture at a time: press an easel, and either it is a click (look at it) or the pointer moves and it is picked up.
const drag = {
  pending: null as string | null, // pressed, not yet moved
  id: null as string | null, // being carried
  x0: 0, y0: 0, t0: 0,
  want: new Vector3(),
  toastAt: 0,
}

export function dragStart(id: string, x: number, y: number) {
  drag.pending = id
  drag.id = null
  drag.x0 = x
  drag.y0 = y
  drag.t0 = performance.now()
  inputLock.easel = true
}

// Can an easel stand here? Dry, not too steep, nothing solid in the way.
const canStand = (d: Vector3, id: string) => onLand(d, 0.35) && slopeAt(d) < 0.55 && !blockedAt(d, 0.9, id)

export default function EaselDrag() {
  const { camera, gl } = useThree()

  useEffect(() => {
    const el = gl.domElement
    const hit = new Vector3()

    const move = (e: PointerEvent) => {
      if (!drag.pending && !drag.id) return
      if (drag.pending) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return
        const rt = easels.get(drag.pending)
        if (!rt) { drag.pending = null; return }
        drag.id = drag.pending
        drag.pending = null
        drag.want.copy(rt.dir)
        rt.dragging = true
        rt.landedAt = rt.landedAt || performance.now()
      }
      const rt = easels.get(drag.id!)
      if (!rt || !pickFromPointer(e.clientX, e.clientY, el, camera, hit)) return
      if (canStand(hit, drag.id!)) drag.want.copy(hit)
      else if (onLand(hit, 0.35) === false && performance.now() - drag.toastAt > 2800) {
        drag.toastAt = performance.now()
        useStore.getState().say("Easels can't swim! Try dry land.")
      }
    }

    const up = () => {
      const st = useStore.getState()
      const id = drag.id
      const pending = drag.pending
      drag.id = null
      drag.pending = null
      inputLock.easel = false
      document.body.style.cursor = ''

      if (id) {
        // drop it: nudge to the nearest free spot, turn it so its watchers stand on dry ground, and tell the world
        const rt = easels.get(id)
        if (!rt) return
        rt.dragging = false
        // drop where the pointer is, not where the easing had got to
        const spot = findSpot(drag.want, { gap: 0.2, ignoreId: id }) ?? drag.want.clone()
        rt.dir.copy(spot)
        const face = st.cam === 'walk' ? player.dir : view.camDir
        rt.yaw = chooseYaw(spot, yawToward(spot, face))
        rt.landedAt = performance.now()
        rt.cheerUntil = performance.now() + 1800
        emitBurst(spot.clone().multiplyScalar(surfaceRadius(spot) + 0.3), spot.clone(), ['#f2c14e', '#f6a6b8', '#9ad4f5'], 14)
        st.patchArtwork(id, { dir: spot.toArray() as [number, number, number], yaw: rt.yaw })
        return
      }
      if (pending && !st.viewing && !st.overlay) {
        const rt = easels.get(pending)
        if (!rt) return
        if (st.cam === 'globe') flyToEasel(pending)
        else if (st.cam === 'walk') {
          if (angleBetween(player.dir, rt.dir) * R < 3.8) st.setViewing(pending)
          else walkToEasel(pending)
        }
      }
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [camera, gl])

  // the carried easel eases toward the pointer instead of snapping
  useFrame((_, delta) => {
    if (!drag.id) return
    document.body.style.cursor = 'grabbing'
    const rt = easels.get(drag.id)
    if (rt) rt.dir.lerp(drag.want, 1 - Math.exp(-Math.min(delta, 0.05) * 16)).normalize()
  })
  return null
}
