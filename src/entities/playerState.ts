import { Vector3 } from 'three'
import { R, stepOnSphere, tangentize } from '../lib/sphere'
import { useStore } from '../store'
import { blockedAt, onLand } from '../world/collide'
import { northAt } from '../world/place'
import { SPAWN } from '../world/regions'
import { faceGlobeTo, rig } from '../world/rig'
import { easels } from './registry'

// Where the kid is and where the camera looks. All plain mutable data: the Player component moves it every frame,
// the camera rig reads it, the HUD reads it. Directions are unit vectors from the planet's center.
export const player = {
  dir: SPAWN.clone(),
  fwd: northAt(SPAWN), // the way the kid is facing
  camFwd: northAt(SPAWN), // the way the camera looks (kept tangent, carried along as the kid walks)
  pitch: 0.62, // camera height: 0 = level, 1.2 = nearly straight down
  zoom: 1,
  speed: 0,
  phase: 0,
  goal: null as Vector3 | null, // a spot the kid is walking to (click or tap)
  goalEasel: null as string | null, // open this drawing on arrival
  stick: { x: 0, y: 0 }, // touch joystick, camera-relative: x right, y forward
}

export const keys = new Set<string>()

const _f = new Vector3(), _g = new Vector3(), _o = new Vector3()

// A spot `units` in front of the easel, on dry ground, or null if there is none
function frontSpot(id: string, units: number, out: Vector3) {
  const rt = easels.get(id)
  if (!rt) return false
  for (const k of [1, 0.85, 1.2, 0.7, 1.45, 0.55]) {
    northAt(rt.dir, _f).applyAxisAngle(rt.dir, rt.yaw)
    out.copy(rt.dir)
    _g.copy(_f)
    stepOnSphere(out, _g, (units * k) / R)
    if (onLand(out, 0.15) && !blockedAt(out, 0.3)) return true
  }
  return false
}

// Put the kid down in front of an easel, looking at it
export function standBefore(id: string, units = 2.6) {
  const rt = easels.get(id)
  if (!rt || !frontSpot(id, units, _o)) return false
  player.dir.copy(_o)
  player.fwd.copy(rt.dir).addScaledVector(_o, -rt.dir.dot(_o))
  tangentize(player.fwd, player.dir)
  player.camFwd.copy(player.fwd)
  player.goal = null
  player.goalEasel = null
  player.speed = 0
  return true
}

// From the planet view: fly down and stand in front of an easel
export function flyToEasel(id: string) {
  if (!standBefore(id)) return
  const st = useStore.getState()
  st.setDrawer(false)
  st.setViewing(null)
  st.setCam('walk')
}

// In the world: walk over to a far-away easel and open it when you get there
export function walkToEasel(id: string) {
  if (!frontSpot(id, 2.2, _o)) return
  player.goal = _o.clone()
  player.goalEasel = id
}

// Walk view <-> planet view. Going up, the globe turns so the kid is facing you.
export function togglePlanetView() {
  const st = useStore.getState()
  if (st.screen !== 'world' || st.overlay) return
  if (st.cam === 'walk') {
    faceGlobeTo(player.dir)
    rig.zoom = rig.zoomGoal = 0.85
    st.setCam('globe')
  } else if (st.cam === 'globe') st.setCam('walk')
  st.setViewing(null)
  st.setDrawer(false)
}

// A point a few steps ahead of the kid, e.g. where a new easel should land
export function frontOfPlayer(units = 3.4, out = new Vector3()) {
  out.copy(player.dir)
  _g.copy(player.fwd)
  stepOnSphere(out, _g, units / R)
  return out
}
