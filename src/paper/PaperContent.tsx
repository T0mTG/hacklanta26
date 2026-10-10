import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Texture } from 'three'
import { Clouds } from '../world/Atmosphere'
import { staticObstacles } from '../world/collide'
import { getPlan } from './layout'
import { BY_ID } from './library'
import { paperClock } from './paperMaterial'
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
    const ids = [...new Set(plan.items.map((i) => i.entry.id))].map((id) => BY_ID.get(id)!)
    loadCutouts(ids).then(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [plan])

  const scene = useMemo(() => {
    if (!ready) return null
    const textures = new Map<string, Texture>()
    for (const it of plan.items) { const t = loadedCutout(it.entry.id); if (t) textures.set(it.entry.id, t) }
    const s = new PaperScene(textures)
    s.expect(plan.items)
    const t0 = performance.now()
    for (const it of plan.items) s.add(it)
    if (import.meta.env.DEV) console.info(`[paper] ${s.drawn} cut-outs in ${s.batchCount} batches built in ${Math.round(performance.now() - t0)} ms`)
    return s
  }, [ready, plan])

  useEffect(() => {
    if (!scene) return
    if (import.meta.env.DEV) {
      const w = window as unknown as Record<string, unknown>
      w.__paper = scene
      w.__plan = plan
      // __paperCapacity() says how many more things could be put down; check it after adding trees or houses
      w.__paperCapacity = paperCapacity
      w.__paperSpot = findPaperSpot
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
    </>
  )
}
