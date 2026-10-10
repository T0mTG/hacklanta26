import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { easels } from '../entities/registry'
import { useStore } from '../store'
import { view } from '../world/rig'

// Numbered title pills that float over every easel while you look at the whole planet, like the reference's place labels.
// Positions are written straight to the DOM from a rAF loop, so React never re-renders for them.
export default function EaselLabels() {
  const artworks = useStore((s) => s.artworks)
  const els = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    let raf = 0
    const v = new Vector3()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const cam = view.camera
      const globe = useStore.getState().cam === 'globe'
      const w = window.innerWidth, h = window.innerHeight
      for (const [id, el] of els.current) {
        const rt = easels.get(id)
        if (!cam || !rt || !globe || (rt.spawnAt && !rt.landedAt)) { el.style.opacity = '0'; continue }
        v.copy(rt.top).project(cam)
        const onScreen = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05
        const visible = onScreen && rt.dir.dot(view.camDir) > view.horizon + 0.2
        el.style.opacity = visible ? '1' : '0'
        el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`
      }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {artworks.map((a, i) => (
        <div
          key={a.id}
          ref={(el) => { if (el) els.current.set(a.id, el); else els.current.delete(a.id) }}
          className="label-pill"
          style={{ opacity: 0 }}
        >
          <span className="badge" style={{ background: a.palette[0] ?? '#f2c14e' }}>{i + 1}</span>
          {a.title}
        </div>
      ))}
    </div>
  )
}
