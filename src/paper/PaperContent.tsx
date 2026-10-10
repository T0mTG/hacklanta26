import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Texture } from 'three'
import { player } from '../entities/playerState'
import { Clouds } from '../world/Atmosphere'
import { dynamicObstacles, staticObstacles } from '../world/collide'
import { getPlan } from './layout'
import { paperHealth } from './health'
import { paperItems } from './items'
import { entryFromSave } from './custom'
import { BY_ID, LIBRARY, registerEntry } from './library'
import { paperClock } from './paperMaterial'
import { spawnPopulation } from './population'
import { addElement, landingSpot, restoreAdded, setPaperScene } from './runtime'
import { useStore } from '../store'
import PaperDrag from './PaperDrag'
import PaperKid from './PaperKid'
import { PaperScene } from './PaperScene'
import { findPaperSpot, paperCapacity } from './spots'
import { loadCutouts, loadedCutout } from './textures'

// Everything that stands on the Paper Globe: the cut-outs (instanced, one draw call per cut-out) and the shared clouds.
export default function PaperContent() {
  const plan = useMemo(getPlan, [])
  const [ready, setReady] = useState(false)

  // the solid things (trees, houses, rocks) are what walkers and new drawings must go around
  useEffect(() => {
    staticObstacles.list = plan.obstacles
    return () => { staticObstacles.list = null }
  }, [plan])

  // load the pictures the planet uses, then build it
  useEffect(() => {
    let alive = true
    // what the kid drew on an earlier visit is not in the library: stand those entries up from their saved data first
    const mine = useStore.getState().paper.added.filter((a) => a.custom).map((a) => entryFromSave(a.entry, a.custom!))
    for (const e of mine) registerEntry(e)
    // every cut-out: the world's statics and every creature (and whatever the kid adds later)
    loadCutouts([...LIBRARY, ...mine]).then(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [plan])

  const scene = useMemo(() => {
    if (!ready) return null
    const textures = new Map<string, Texture>()
    for (const e of BY_ID.values()) { const t = loadedCutout(e.id); if (t) textures.set(e.id, t) }
    const s = new PaperScene(textures)
    s.expect(plan.items)
    const t0 = performance.now()
    for (const it of plan.items) s.add(it)
    spawnPopulation(s, plan)
    // what the kid did on an earlier visit: things they carried somewhere else, and things they added
    const saved = useStore.getState().paper
    for (const [uid, p] of Object.entries(saved.moved)) {
      const it = paperItems.get(uid)
      if (!it) continue
      it.dir.set(p.dir[0], p.dir[1], p.dir[2]).normalize()
      it.yaw = p.yaw
      it.life?.rehome?.(it, it.dir)
      s.writePose(it)
    }
    for (const a of saved.added) restoreAdded(s, a)
    if (import.meta.env.DEV) console.info(`[paper] ${s.drawn} cut-outs in ${s.batchCount} batches built in ${Math.round(performance.now() - t0)} ms`)
    return s
  }, [ready, plan])

  useEffect(() => {
    if (!scene) return
    setPaperScene(scene)
    if (import.meta.env.DEV) {
      const w = window as unknown as Record<string, unknown>
      w.__paper = scene
      w.__plan = plan
      w.__items = paperItems
      w.__solids = staticObstacles
      w.__dyn = dynamicObstacles
      // __paperCapacity() says how many more things could be put down; check it after adding trees or houses
      w.__paperCapacity = paperCapacity
      w.__paperSpot = findPaperSpot
      // __paperAdd('cat-glasses') drops that element out of the sky in front of the kid, as if the AI had just found it
      w.__paperAdd = (id: string, delay = 0.2) => {
        const e = BY_ID.get(id)
        if (!e) return false
        addElement({ entry: e, label: e.label, how: 'shelf' }, { near: landingSpot(), delay, face: player.dir })
        return true
      }
      // __paperHealth(120) runs the world for two minutes and reports anything stuck, never moving, or in the wrong place
      w.__paperHealth = (seconds = 90) => paperHealth((sec, hz) => (w.__sim as (a: number, b: number) => void)(sec, hz), seconds)
    }
    return () => { setPaperScene(null); scene.dispose() }
  }, [scene, plan])

  useFrame((state, delta) => {
    paperClock.value = state.clock.elapsedTime
    scene?.update(Math.min(delta, 0.05), state.clock.elapsedTime)
  })

  return (
    <>
      <Clouds />
      {scene && <primitive object={scene.group} />}
      <PaperKid scene={scene} />
      <PaperDrag />
    </>
  )
}
