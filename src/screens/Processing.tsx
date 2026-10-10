import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Vector3 } from 'three'
import { useStore } from '../store'
import { clamp } from '../lib/rng'
import { offsetDir } from '../lib/sphere'
import { SPAWN } from '../world/regions'
import { faceGlobeTo, rig } from '../world/rig'
import { placeNewArtwork } from '../world/spots'

const SPAWN_FRONT = offsetDir(SPAWN, 0, 0.12)

const LINES = ['Unpacking your crayons...', 'Building a wooden easel...', 'Finding the perfect spot...', 'Calling the butterflies...']
const DURATION = 2600 // fixed so the demo always takes the same time

export default function Processing() {
  const pending = useStore((s) => s.pending)
  const [k, setK] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    const id = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / DURATION)
      setK(p)
      if (p >= 1) {
        window.clearInterval(id)
        const s = useStore.getState()
        if (s.pending) {
          // drop it just in front of where the kid appears, and turn the globe to watch it land
          const placed = placeNewArtwork(s.pending, SPAWN_FRONT)
          s.addArtwork(placed)
          s.setSpawn(placed.id, 1.0)
          s.stage(null)
          faceGlobeTo(new Vector3(...placed.dir))
          rig.zoomGoal = 0.6
        }
        s.setScreen('world'); s.setCam('globe'); s.setOverlay(null)
      }
    }, 50)
    return () => window.clearInterval(id)
  }, [])
  return (
    <motion.div className="absolute inset-0 grid place-items-center p-4 hit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="sticker w-full max-w-md p-6 sm:p-7 text-center"
        initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        {pending ? (
          <div className="polaroid mx-auto w-44" style={{ animation: 'wobble 1.4s ease-in-out infinite' }}>
            <div style={{ aspectRatio: clamp(pending.aspect, 0.6, 1.6) }}>
              <img src={pending.src} alt="" draggable={false} />
            </div>
          </div>
        ) : (
          <div className="text-6xl" style={{ animation: 'wobble 1s ease-in-out infinite' }} aria-hidden>🎨</div>
        )}
        <h2 className="font-display text-3xl font-bold mt-4">Building your easel...</h2>
        <p className="mt-1 h-7 text-lg">{LINES[Math.min(LINES.length - 1, Math.floor(k * LINES.length))]}</p>
        <div className="mt-4 h-6 rounded-full border-[3px] border-ink bg-paper overflow-hidden">
          <div className="h-full bg-sun border-r-[3px] border-ink" style={{ width: `${Math.max(4, k * 100)}%` }} />
        </div>
      </motion.div>
    </motion.div>
  )
}
