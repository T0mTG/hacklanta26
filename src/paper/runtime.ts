import { Vector3 } from 'three'
import { player } from '../entities/playerState'
import { makeId } from '../lib/artwork'
import { R, angleBetween, stepOnSphere, tangentize } from '../lib/sphere'
import { dynamicObstacles, onLand } from '../world/collide'
import { yawToward } from '../world/place'
import { SPAWN } from '../world/regions'
import { useStore } from '../store'
import type { PaperAdded } from '../data/types'
import type { Element } from './ai'
import { prepareEntry, saveOfEntry } from './custom'
import { newItem, paperItems, type PaperItem } from './items'
import { BY_ID } from './library'
import { paperClock } from './paperMaterial'
import type { PaperScene } from './PaperScene'
import { findPaperSpot } from './spots'
import { DropLife, lifeAfterLanding } from './spawn'

// The bridge between the screens (the AI screen, the picture view, the drag) and the scene that lives inside the canvas.
export const paperRuntime = { scene: null as PaperScene | null, waiting: [] as (() => void)[] }

export function setPaperScene(scene: PaperScene | null) {
  paperRuntime.scene = scene
  if (scene) { const todo = paperRuntime.waiting.splice(0); for (const fn of todo) fn() }
}
export function whenPaperReady(fn: () => void) {
  if (paperRuntime.scene) fn()
  else paperRuntime.waiting.push(fn)
}

// things that stand in the way register a circle, so walkers and new things go around them
function registerObstacle(it: PaperItem) {
  if (it.entry.behavior === 'static' && it.entry.radius >= 0.3) dynamicObstacles.set(it.uid, { d: it.dir, r: it.entry.radius * it.scale })
}

// A drawing the AI has found an element in: put it on the planet near `near`, falling in after `delay` seconds
export function addElement(found: Element, o: { picture?: string; near: Vector3; delay: number; face: Vector3 }) {
  whenPaperReady(() => {
    const scene = paperRuntime.scene!
    const e = found.entry
    const put = () => {
      const scale = e.custom ? 1.3 : 1.05 // the kid's own drawing stands a little bigger than the library's, so it is easy to spot
      const radius = e.radius * scale
      const dir = findPaperSpot(o.near, radius, { avoid: [player.dir], avoidGap: 0.1 }) ?? o.near.clone()
      const uid = `add-${makeId()}`
      const it = newItem(uid, e, dir, { source: 'added', label: found.label, picture: o.picture, scale, seed: Math.random(), yaw: yawToward(dir, o.face) })
      it.life = new DropLife(scene, o.delay)
      registerObstacle(it)
      scene.add(it, paperClock.value + o.delay)
      useStore.getState().paperAdd({
        uid, entry: e.id, custom: e.custom ? saveOfEntry(e) : undefined, name: found.label, src: o.picture, at: Date.now(), dir: dir.toArray(), yaw: it.yaw, scale, flip: false,
      })
    }
    // a drawing the kid made is not in the library: the scene needs its picture first
    if (e.custom) void prepareEntry(e, scene).then(put)
    else put()
  })
}

// bring back what the kid added in an earlier visit: no falling, they are simply there
export function restoreAdded(scene: PaperScene, a: PaperAdded) {
  const e = BY_ID.get(a.entry)
  if (!e) return
  const it = newItem(a.uid, e, new Vector3(...a.dir), { source: 'added', label: a.name, picture: a.src, scale: a.scale, seed: Math.random(), yaw: a.yaw })
  registerObstacle(it)
  scene.add(it)
  const life = lifeAfterLanding(it)
  if (life) it.life = life
}

// take something the kid added away again
export function removeAdded(uid: string) {
  paperRuntime.scene?.remove(uid)
  dynamicObstacles.delete(uid)
  useStore.getState().paperRemove(uid)
}

// remember where the kid put something down
export function rememberPlacement(it: PaperItem) {
  const st = useStore.getState()
  if (it.source === 'added') st.paperPatchAdded(it.uid, { dir: it.dir.toArray(), yaw: it.yaw })
  else st.paperMove(it.uid, { dir: it.dir.toArray(), yaw: it.yaw })
}

// Where something new lands: a few steps ahead of the kid and a little to the right, so the kid does not stand in front of it
const _lf = new Vector3()
export function landingSpot(units = 3.3, out = new Vector3()) {
  _lf.copy(player.camFwd).applyAxisAngle(player.dir, -1.2)
  out.copy(player.dir)
  stepOnSphere(out, _lf, units / R)
  return out
}

// A point `units` away from `from`, toward `toward`, on the ground
export function towards(from: Vector3, toward: Vector3, units: number, out = new Vector3()) {
  out.copy(from)
  const heading = new Vector3().copy(toward).addScaledVector(from, -toward.dot(from))
  if (heading.lengthSq() < 1e-8) return out
  tangentize(heading, from)
  stepOnSphere(out, heading, units / R)
  return out
}

// Walk over to something that is far away and look at it when you get there; or, from the planet view, fly down next to it
export function walkToItem(uid: string) {
  const it = paperItems.get(uid)
  if (!it) return
  const spot = towards(it.dir, player.dir, 2.4 + it.entry.size * it.scale * 0.25)
  const goal = onLand(spot, 0.15) ? spot : it.dir.clone()
  player.goal = goal
  player.goalEasel = uid // usePlayer opens whatever id is here when the kid arrives
}

export function standBeforeItem(uid: string) {
  const it = paperItems.get(uid)
  if (!it) return false
  const spot = towards(it.dir, player.dir.lengthSq() ? player.dir : SPAWN, 2.6 + it.entry.size * it.scale * 0.25)
  const at = onLand(spot, 0.15) ? spot : it.dir.clone()
  player.dir.copy(at)
  player.fwd.copy(it.dir).addScaledVector(at, -it.dir.dot(at))
  tangentize(player.fwd, player.dir)
  player.camFwd.copy(player.fwd)
  player.goal = null
  player.goalEasel = null
  player.speed = 0
  return true
}

export const distanceToKid = (it: PaperItem) => angleBetween(player.dir, it.dir) * R
