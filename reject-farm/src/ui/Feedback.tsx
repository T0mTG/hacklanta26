import { useEffect, useMemo, useRef } from 'react'
import { useStore } from '../store'

export function Toast() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null
  return (
    <div className="toast" key={toast.id} role="status">
      {toast.msg}
    </div>
  )
}

const SCRAPS = ['#F0765B', '#F6D35B', '#A9C98A', '#9CC5D8', '#C94F6D', '#FFF9EC', '#F4C9A8']

/** A burst of paper scraps each time a creature lands. */
export function Confetti() {
  const burst = useStore((s) => s.confetti)
  const scraps = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const a = (i / 34) * Math.PI * 2 + Math.random() * 0.5
        const d = 120 + Math.random() * 240
        return {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d * 0.7 - 80,
          r: Math.random() * 540 - 270,
          color: SCRAPS[i % SCRAPS.length],
          w: 8 + Math.random() * 10,
          delay: Math.random() * 0.08,
        }
      }),
    [burst],
  )
  if (!burst) return null
  return (
    <div className="confetti" key={burst} aria-hidden="true">
      {scraps.map((s, i) => (
        <i
          key={i}
          style={
            {
              '--x': `${s.x}px`,
              '--y': `${s.y}px`,
              '--r': `${s.r}deg`,
              background: s.color,
              width: s.w,
              height: s.w * 0.62,
              animationDelay: `${s.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** A little handwritten name that follows the pointer over a creature. */
export function HoverLabel() {
  const ref = useRef<HTMLDivElement>(null)
  const name = useStore((s) => {
    if (!s.hoveredId || s.hoveredId === s.selectedId) return null
    return s.creatures.find((c) => c.id === s.hoveredId)?.name ?? null
  })
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY - 34}px)`
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return (
    <div ref={ref} className="hover-label hand" hidden={!name}>
      {name}
    </div>
  )
}
