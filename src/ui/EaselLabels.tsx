import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { player } from '../entities/playerState'
import { easels } from '../entities/registry'
import { useStore } from '../store'
import { view } from '../world/rig'
import { surfaceRadius } from '../world/terrain'

// Numbered title pills that float over every easel while you look at the whole planet, like the reference's place labels,
// plus a "You" pill so a kid can always find themselves. Positions are written straight to the DOM from a rAF loop,
// so React never re-renders for them.
export default function EaselLabels() {
  const artworks = useStore((s) => s.artworks)
  const els = useRef(new Map<string, HTMLDivElement>())
  const you = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const v = new Vector3()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const cam = view.camera
      const globe = useStore.getState().cam === 'globe'
      const w = window.innerWidth, h = window.innerHeight
      const place = (el: HTMLElement, dir: Vector3, anchor: Vector3, show: boolean) => {
        v.copy(anchor).project(cam!)
        const onScreen = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05
        const visible = show && onScreen && dir.dot(view.camDir) > view.horizon + 0.2
        el.style.opacity = visible ? '1' : '0'
        // keep the pill fully on screen even when its easel is near the edge
        const half = el.offsetWidth / 2 + 6
        const x = Math.min(w - half, Math.max(half, (v.x * 0.5 + 0.5) * w))
        el.style.transform = `translate(${x}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`
      }
      for (const [id, el] of els.current) {
        const rt = easels.get(id)
        if (!cam || !rt || !globe || (rt.spawnAt && !rt.landedAt)) { el.style.opacity = '0'; continue }
        place(el, rt.dir, rt.top, true)
      }
      const y = you.current
      if (y) {
        if (!cam || !globe) y.style.opacity = '0'
        else place(y, player.dir, v.copy(player.dir).multiplyScalar(surfaceRadius(player.dir) + 1.8).clone(), true)
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
      <div ref={you} className="label-pill" style={{ opacity: 0, background: '#f2c14e' }}>
        <span className="badge" style={{ background: '#fff' }}>★</span>You
      </div>
    </div>
  )
}
