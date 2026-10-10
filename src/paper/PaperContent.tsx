import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Texture } from 'three'
import { Clouds } from '../world/Atmosphere'
import { dynamicObstacles, staticObstacles } from '../world/collide'
import { getPlan } from './layout'
import { paperHealth } from './health'
import { paperItems } from './items'
import { LIBRARY } from './library'
import { paperClock } from './paperMaterial'
import { spawnPopulation } from './population'
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
    // every cut-out: the world's statics and every creature (and whatever the kid adds later)
    loadCutouts(LIBRARY).then(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [plan])

  const scene = useMemo(() => {
    if (!ready) return null
    const textures = new Map<string, Texture>()
    for (const e of LIBRARY) { const t = loadedCutout(e.id); if (t) textures.set(e.id, t) }
    const s = new PaperScene(textures)
    s.expect(plan.items)
    const t0 = performance.now()
    for (const it of plan.items) s.add(it)
    spawnPopulation(s, plan)
    if (import.meta.env.DEV) console.info(`[paper] ${s.drawn} cut-outs in ${s.batchCount} batches built in ${Math.round(performance.now() - t0)} ms`)
    return s
  }, [ready, plan])

  useEffect(() => {
    if (!scene) return
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
      // __paperHealth(120) runs the world for two minutes and reports anything stuck, never moving, or in the wrong place
      w.__paperHealth = (seconds = 90) => paperHealth((sec, hz) => (w.__sim as (a: number, b: number) => void)(sec, hz), seconds)
    }
    return () => scene.dispose()
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
    </>
  )
}
