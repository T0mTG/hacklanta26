import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { player } from '../entities/playerState'
import { tangentize } from '../lib/sphere'
import { useStore } from '../store'
import { Btn } from '../ui/kit'
import { northAt } from '../world/place'
import { SPAWN } from '../world/regions'
import { faceGlobeTo, rig } from '../world/rig'
import { extractElements, withArticle, type Element } from './ai'
import { addElement, landingSpot } from './runtime'

// The Paper Globe's "AI is looking at your drawing" screen. The AI is a stand-in (see ai.ts), but the show is real:
// scanning lines and sparkles over the picture, scissors snipping along the outline of what it found, then "I found a tree!".
// Then the new cut-out falls out of the sky next to the kid.

const SCAN_MS = 1700, SNIP_MS = 1900, AUTO_MS = 3400
// dev only: window.__aiSlow = 4 plays the whole show four times slower, to look at the scissors
const slow = () => (import.meta.env.DEV ? Number((window as unknown as { __aiSlow?: number }).__aiSlow) || 1 : 1)

type Stage = 'scan' | 'snip' | 'found'

// where the cut-out's outline sits over the picture, in 0..1 picture coordinates (y down)
function placeOutline(el: Element, imgAspect: number) {
  const { entry } = el
  const pts: [number, number][] = []
  for (let i = 0; i < entry.outline.length; i += 2) pts.push([entry.outline[i], 1 - entry.outline[i + 1]])
  let fit = entry.rawFit
  if (!fit) {
    // someone else's picture: we do not know where the thing is, so the scissors cut around the middle of it
    const maxW = 0.7, maxH = 0.76
    const a = entry.w / entry.h
    let w = maxW, h = (w / a) * imgAspect
    if (h > maxH) { h = maxH; w = (h / imgAspect) * a }
    fit = [0.5 - w / 2, 0.5 - h / 2, w, h]
  }
  return pts.map(([u, v]) => [fit![0] + u * fit![2], fit![1] + v * fit![3]] as [number, number])
}

function pathInfo(pts: [number, number][]) {
  const cum = [0]
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length]
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  return { cum, total: cum[cum.length - 1] }
}

// the point `p` (0..1) of the way around the outline, and the direction of travel there
function along(pts: [number, number][], info: { cum: number[]; total: number }, p: number) {
  const d = p * info.total
  let i = 1
  while (i < info.cum.length - 1 && info.cum[i] < d) i++
  const a = pts[i - 1], b = pts[i % pts.length]
  const seg = info.cum[i] - info.cum[i - 1] || 1
  const k = (d - info.cum[i - 1]) / seg
  return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI }
}

function Scissors({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <div className="pointer-events-none absolute" style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: `translate(-50%, -50%) rotate(${angle}deg)`, width: 66, height: 52 }}>
      <svg viewBox="0 0 46 36" width="66" height="52" aria-hidden style={{ filter: 'drop-shadow(2px 3px 0 rgba(34,51,59,.35))' }}>
        <g className="scissor-top"><path d="M6 18L40 8" stroke="#22333b" strokeWidth="5" strokeLinecap="round" /><circle cx="9" cy="10" r="5.5" fill="#ee6c4d" stroke="#22333b" strokeWidth="2.6" /></g>
        <g className="scissor-bottom"><path d="M6 18L40 28" stroke="#22333b" strokeWidth="5" strokeLinecap="round" /><circle cx="9" cy="26" r="5.5" fill="#ee6c4d" stroke="#22333b" strokeWidth="2.6" /></g>
        <circle cx="12" cy="18" r="2.4" fill="#f2c14e" stroke="#22333b" strokeWidth="1.6" />
      </svg>
    </div>
  )
}

// A hop-in confetti of paper stars when the cut-out appears
function Stars({ colors }: { colors: string[] }) {
  const stars = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2 + Math.random() * 0.4, d: 90 + Math.random() * 90, c: colors[i % colors.length], s: 10 + Math.random() * 12 })), [colors])
  return (
    <>
      {stars.map((s, i) => (
        <motion.span
          key={i} className="pointer-events-none absolute left-1/2 top-1/2 block"
          style={{ width: s.s, height: s.s, background: s.c, border: '2.5px solid #22333b', borderRadius: 4, marginLeft: -s.s / 2, marginTop: -s.s / 2 }}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{ x: Math.cos(s.a) * s.d, y: Math.sin(s.a) * s.d, scale: [0, 1.2, 0.8], rotate: 220, opacity: [1, 1, 0] }}
          transition={{ duration: 1.15, ease: 'easeOut' }}
        />
      ))}
    </>
  )
}

export default function PaperProcessing() {
  const pending = useStore((s) => s.paperPending)
  const [stage, setStage] = useState<Stage>('scan')
  const [found, setFound] = useState<Element | null>(null)
  const [aspect, setAspect] = useState(1)
  const [p, setP] = useState(0) // how far the scissors have got around the outline
  const done = useRef(false)

  // the "AI" starts looking as soon as the screen opens
  useEffect(() => {
    if (!pending) return
    let alive = true
    extractElements({ src: pending.src, name: pending.name, entryId: pending.entryId }).then((r) => { if (alive && r[0]) setFound(r[0]) })
    return () => { alive = false }
  }, [pending])

  useEffect(() => {
    const id = window.setTimeout(() => setStage((s) => (s === 'scan' ? 'snip' : s)), SCAN_MS * slow())
    return () => window.clearTimeout(id)
  }, [])

  // the snipping: runs once a result is in and the scan is over
  useEffect(() => {
    if (stage !== 'snip' || !found) return
    const t0 = performance.now()
    const total = SNIP_MS * slow()
    let raf = 0
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / total)
      setP(k)
      if (k < 1) raf = requestAnimationFrame(tick)
      else setStage('found')
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stage, found])

  const finish = () => {
    if (done.current || !found || !pending) return
    done.current = true
    const s = useStore.getState()
    const first = s.cam === 'title'
    if (first) {
      // stand the kid at the spawn point, looking north, where the new thing will land
      player.dir.copy(SPAWN)
      player.fwd.copy(northAt(SPAWN))
      tangentize(player.fwd, player.dir)
      player.camFwd.copy(player.fwd)
      player.goal = null
    }
    const near = landingSpot()
    addElement(found, { picture: pending.picture, near, delay: first ? 2.4 : s.cam === 'walk' ? 0.4 : 1.0, face: first ? SPAWN : player.dir })
    s.stagePaper(null)
    if (first) s.setCam('walk')
    else if (s.cam === 'globe') { faceGlobeTo(near); rig.zoomGoal = 0.6 }
    s.setScreen('world')
    s.setOverlay(null)
  }

  // after the reveal it carries on by itself (a tap does it sooner)
  useEffect(() => {
    if (stage !== 'found') return
    const id = window.setTimeout(finish, AUTO_MS)
    return () => window.clearTimeout(id)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const outline = useMemo(() => (found ? placeOutline(found, aspect) : null), [found, aspect])
  const info = useMemo(() => (outline ? pathInfo(outline) : null), [outline])
  const here = outline && info ? along(outline, info, p) : null
  const trace = outline ? outline.map(([x, y]) => `${x},${y}`).join(' ') : ''
  const progress = outline && info ? [...outline.slice(0, Math.max(2, Math.ceil(outline.length * p))), here ? ([here.x, here.y] as [number, number]) : outline[0]].map(([x, y]) => `${x},${y}`).join(' ') : ''

  const heading = stage === 'scan' ? 'Looking at your drawing...' : stage === 'snip' ? 'Snip snip snip!' : found ? `I found ${withArticle(found.label)}!` : ''
  const revealed = stage === 'found' && found

  return (
    <motion.div className="absolute inset-0 grid place-items-center p-4 hit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (stage === 'found') finish() }}>
      <motion.div
        className="sticker w-full max-w-lg p-5 sm:p-7 text-center overflow-hidden"
        initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <div className="relative mx-auto grid place-items-center" style={{ minHeight: '17rem' }}>
          {/* the drawing, in a polaroid; it steps aside when the cut-out appears */}
          <motion.div
            className="polaroid relative mx-auto w-full max-w-[19rem]"
            animate={revealed ? { opacity: 0.18, scale: 0.86, rotate: -7, y: 8 } : { opacity: 1, scale: 1, rotate: -1.5, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <div className="relative overflow-hidden" style={{ aspectRatio: aspect, maxHeight: '19rem', width: '100%' }}>
              {pending && <img src={pending.src} alt="" draggable={false} className="block h-full w-full object-contain bg-white" onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth) setAspect(Math.min(1.8, Math.max(0.55, i.naturalWidth / i.naturalHeight))) }} />}
              {stage === 'scan' && <div className="scan-line" aria-hidden />}
              {stage === 'scan' && Array.from({ length: 9 }, (_, i) => <i key={i} className="sparkle" style={{ left: `${8 + ((i * 37) % 84)}%`, top: `${6 + ((i * 53) % 86)}%`, animationDelay: `${(i % 5) * 0.18}s` }} aria-hidden />)}
              {stage === 'snip' && outline && (
                <>
                  <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                    <polygon points={trace} fill="none" stroke="#22333b" strokeOpacity=".28" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
                    <polyline points={progress} fill="none" stroke="#ee6c4d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                  {here && <Scissors x={here.x} y={here.y} angle={here.angle} />}
                </>
              )}
            </div>
          </motion.div>

          {/* the cut-out, popping out of the picture */}
          {revealed && found && (
            <>
              <motion.img
                src={found.entry.url} alt={found.label} draggable={false}
                className="absolute"
                style={{ maxHeight: '15.5rem', maxWidth: '82%', objectFit: 'contain', filter: 'drop-shadow(4px 6px 0 rgba(34,51,59,.32))' }}
                initial={{ scale: 0.2, rotate: -16, y: 40, opacity: 0 }} animate={{ scale: 1, rotate: [-16, 7, -3, 0], y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 11, rotate: { duration: 0.7 } }}
              />
              <Stars colors={[...found.entry.colors, '#f2c14e', '#f6a6b8']} />
            </>
          )}
        </div>

        <motion.h2
          key={heading}
          className="font-display text-3xl sm:text-4xl font-bold mt-4 leading-tight"
          initial={{ scale: 0.7, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16 }}
        >
          {heading}
        </motion.h2>
        {stage === 'scan' && <p className="mt-1 text-lg opacity-80">Hmm, what could it be?</p>}
        {revealed && (
          <div className="mt-4 flex justify-center">
            <Btn big tone="yellow" icon="check" onClick={(e) => { e.stopPropagation(); finish() }}>Put it on the planet!</Btn>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
