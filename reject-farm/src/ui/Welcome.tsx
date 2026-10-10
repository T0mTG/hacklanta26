import { useEffect, useRef, useState } from 'react'
import { sfx } from '../lib/sound'
import { scene } from '../scene/sceneState'
import { useStore } from '../store'

function PaperBall() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g strokeLinejoin="round" stroke="rgba(59,42,32,.16)" strokeWidth="1">
        <path d="M50 6 78 14 58 34Z" fill="#F2E6CC" />
        <path d="M78 14 94 40 70 44 58 34Z" fill="#FFFDF4" />
        <path d="M94 40 88 70 66 62 70 44Z" fill="#E9DBBE" />
        <path d="M88 70 64 92 52 70 66 62Z" fill="#F6ECD6" />
        <path d="M64 92 34 94 40 72 52 70Z" fill="#DFCFAF" />
        <path d="M34 94 12 76 28 58 40 72Z" fill="#F2E6CC" />
        <path d="M12 76 6 46 26 40 28 58Z" fill="#FFFDF4" />
        <path d="M6 46 22 18 38 30 26 40Z" fill="#E9DBBE" />
        <path d="M22 18 50 6 58 34 38 30Z" fill="#FFF8E7" />
        {/* a glimpse of the logo that got crumpled */}
        <path d="M38 30 58 34 70 44 66 62 52 70 40 72 28 58 26 40Z" fill="#BEE3F5" />
        <path d="M44 40 60 42 62 56 50 62 40 54Z" fill="#F6D35B" />
      </g>
    </svg>
  )
}

export function Welcome() {
  const enter = useStore((s) => s.enter)
  const ball = useRef<HTMLButtonElement>(null)
  const offset = useRef({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [spun, setSpun] = useState(false)

  // the "you can spin it" note retires once they've tried
  useEffect(() => {
    const onDown = (e: PointerEvent) => (e.target as Element).closest?.('.farm') && setSpun(true)
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  /** Throws the paper ball at the planet from wherever it is; the farm opens when it lands. */
  const toss = () => {
    if (leaving) return
    setLeaving(true)
    const el = ball.current
    if (!el || !el.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return enter()

    const r = el.getBoundingClientRect()
    const target = scene.aim?.() ?? { x: window.innerWidth * 0.7, y: window.innerHeight * 0.42 }
    const { x: ox, y: oy } = offset.current
    const dx = target.x - (r.left + r.width / 2)
    const dy = target.y - (r.top + r.height / 2)
    const arc = Math.max(120, Math.abs(dx) * 0.26)
    const frames = Array.from({ length: 17 }, (_, i) => {
      const t = i / 16
      return {
        offset: t,
        transform: `translate(${ox + dx * t}px, ${oy + dy * t - arc * 4 * t * (1 - t)}px) rotate(${t * 560}deg) scale(${1 - 0.62 * t})`,
      }
    })
    sfx.whoosh()
    el.animate(frames, { duration: 900, easing: 'cubic-bezier(.35,.05,.6,1)', fill: 'forwards' }).onfinish = enter
  }

  // ?toss throws the ball by itself: a quick way to watch the opening
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('toss')) return
    const t = setTimeout(toss, 1500)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`welcome${leaving ? ' leaving' : ''}`}>
      <div className="welcome-copy fade">
        <p className="hand eyebrow">a tiny world for the work that didn&rsquo;t make it</p>
        <h1>
          Every reject deserves <em>a second life.</em>
        </h1>
        <p className="lede">A whole little planet for the designs you gave up on. Set them loose, carry them between continents, and see who would have picked them.</p>
      </div>

      <div className="toss">
        <div className="ball-wrap">
          <p className="hand ball-note fade">
            a design nobody picked
            <svg viewBox="0 0 40 30" width="34" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M4 4c10 0 22 4 26 18M22 17l8 6 5-9" />
            </svg>
          </p>
          <button
            ref={ball}
            className="ball"
            aria-label="Toss the crumpled reject onto the farm"
            onClick={toss}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              drag.current = { x: e.clientX, y: e.clientY, ox: offset.current.x, oy: offset.current.y }
            }}
            onPointerMove={(e) => {
              const d = drag.current
              if (!d || leaving) return
              offset.current = { x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }
              e.currentTarget.style.transform = `translate(${offset.current.x}px, ${offset.current.y}px) rotate(${offset.current.x * 0.2}deg)`
            }}
            onPointerUp={() => {
              drag.current = null
              toss()
            }}
          >
            <PaperBall />
          </button>
        </div>
        <div className="toss-cta fade">
          <button className="btn primary big" onClick={toss} autoFocus>
            Toss it to the farm
          </button>
          <span className="hand small">
            or drag it there yourself
          </span>
        </div>
      </div>

      {!spun && (
        <p className="hand spin-note fade" aria-hidden="true">
          <svg viewBox="0 0 60 44" width="52" height="38" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M56 6C40 2 16 8 8 34M4 22l4 13 12-6" />
          </svg>
          psst, you can spin it
        </p>
      )}
    </div>
  )
}
