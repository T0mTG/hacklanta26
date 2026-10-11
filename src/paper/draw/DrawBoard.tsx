import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useStore } from '../../store'
import Icon from '../../ui/Icon'
import { Btn } from '../../ui/kit'
import { aiEnabled } from './classify'
import { makeCutout, type DrawnCutout } from './cutout'

// A whiteboard to draw on, with crayon colors. The ink lives on its own transparent canvas over a white board, so when the kid is
// done the drawing is already separated from its background (see cutout.ts) and needs no guessing.

const W = 1000, H = 750 // the board, in its own units (the canvas is drawn at this size and shown at whatever size fits)

const COLORS = [
  '#22333b', '#8a5a3c', '#e8483c', '#f28c28', '#f7d02c', '#8fd14f',
  '#2f9e44', '#2bb3b1', '#2f7fe0', '#8e5bd9', '#f58ab8', '#9ad4f5',
]
const SIZES = [{ px: 9, dot: 9 }, { px: 20, dot: 17 }, { px: 40, dot: 27 }] // the line width on the board, and the dot shown on its button

interface Stroke { color: string; size: number; erase: boolean; pts: number[] }

function paint(ctx: CanvasRenderingContext2D, st: Stroke) {
  ctx.save()
  ctx.globalCompositeOperation = st.erase ? 'destination-out' : 'source-over'
  ctx.strokeStyle = st.color; ctx.fillStyle = st.color
  ctx.lineWidth = st.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const p = st.pts
  if (p.length <= 2) {
    ctx.beginPath(); ctx.arc(p[0], p[1], st.size / 2, 0, Math.PI * 2); ctx.fill()
  } else {
    // a smooth line through the points: curves between the midpoints, so there are no corners where the pointer was sampled
    ctx.beginPath(); ctx.moveTo(p[0], p[1])
    for (let i = 2; i < p.length - 2; i += 2) ctx.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2)
    ctx.lineTo(p[p.length - 2], p[p.length - 1])
    ctx.stroke()
  }
  ctx.restore()
}

export default function DrawBoard({ onDone, onBack }: { onDone: (cut: DrawnCutout) => void; onBack: () => void }) {
  const say = useStore((s) => s.say)
  const ink = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Stroke[]>([])
  const cur = useRef<Stroke | null>(null)
  const pointer = useRef<number | null>(null)
  const [color, setColor] = useState(COLORS[2])
  const [size, setSize] = useState(1)
  const [erase, setErase] = useState(false)
  const [count, setCount] = useState(0)
  const [sure, setSure] = useState(false) // the second tap on "clear"
  const [busy, setBusy] = useState(false)

  const redraw = () => {
    const c = ink.current, ctx = c?.getContext('2d')
    if (!c || !ctx) return
    ctx.clearRect(0, 0, W, H)
    for (const st of strokes.current) paint(ctx, st)
  }
  const at = (e: RPointerEvent) => {
    const r = ink.current!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]
  }

  const down = (e: RPointerEvent) => {
    if (pointer.current !== null || busy || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.preventDefault()
    try { ink.current!.setPointerCapture(e.pointerId) } catch { /* a pointer that cannot be captured still draws while it is over the board */ }
    pointer.current = e.pointerId
    const [x, y] = at(e)
    const st: Stroke = { color, size: SIZES[size].px * (erase ? 1.6 : 1), erase, pts: [x, y] }
    strokes.current.push(st)
    cur.current = st
    paint(ink.current!.getContext('2d')!, st)
    setSure(false)
  }
  const move = (e: RPointerEvent) => {
    const st = cur.current
    if (!st || e.pointerId !== pointer.current) return
    // every position the pointer passed through since the last event, so quick strokes stay smooth
    const list = e.nativeEvent.getCoalescedEvents?.() ?? []
    const evs = list.length ? list : [e.nativeEvent]
    const r = ink.current!.getBoundingClientRect()
    for (const ev of evs) {
      const x = ((ev.clientX - r.left) / r.width) * W, y = ((ev.clientY - r.top) / r.height) * H
      const n = st.pts.length
      if (Math.hypot(x - st.pts[n - 2], y - st.pts[n - 1]) < 2.5) continue
      st.pts.push(x, y)
    }
    const ctx = ink.current!.getContext('2d')!
    paint(ctx, st)
  }
  const up = (e: RPointerEvent) => {
    if (e.pointerId !== pointer.current) return
    pointer.current = null
    cur.current = null
    redraw() // paint it once more from scratch, so the line is the same as after an undo
    setCount(strokes.current.length)
  }

  const undo = () => { strokes.current.pop(); redraw(); setCount(strokes.current.length); setSure(false) }
  const clear = () => {
    if (!count) return
    if (!sure) { setSure(true); return }
    strokes.current = []; redraw(); setCount(0); setSure(false)
  }
  useEffect(() => {
    if (!sure) return
    const id = window.setTimeout(() => setSure(false), 2600)
    return () => window.clearTimeout(id)
  }, [sure])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const done = async () => {
    const c = ink.current
    if (!c || busy) return
    if (!count) { say('Draw something first!'); return }
    setBusy(true)
    await new Promise((r) => setTimeout(r, 60)) // let the button say it is working before the thinking starts
    let cut: DrawnCutout | null = null
    try { cut = makeCutout(c) } catch (err) { if (import.meta.env.DEV) console.warn('[draw] could not cut it out', err) }
    setBusy(false)
    if (!cut) { say('Draw a little bigger, then press Done!'); return }
    onDone(cut)
  }

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] items-start">
      <div className="mx-auto w-full" style={{ maxWidth: 'min(100%, calc((100dvh - 11rem) * 1.3333))' }}>
        <div className="draw-board">
          <canvas
            ref={ink} width={W} height={H} aria-label="Whiteboard"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}
          />
        </div>
      </div>

      <div className="grid gap-3 md:w-[15.5rem]">
        <div className="grid grid-cols-6 md:grid-cols-4 gap-2 justify-items-center" role="group" aria-label="Colors">
          {COLORS.map((c) => (
            <button
              key={c} aria-label={`Color ${c}`} aria-pressed={!erase && color === c}
              className={`swatch-btn hit ${!erase && color === c ? 'on' : ''}`} style={{ background: c }}
              onClick={() => { setColor(c); setErase(false) }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2" role="group" aria-label="Brush">
          {SIZES.map((s, i) => (
            <button key={s.px} aria-label={`Brush ${i + 1}`} aria-pressed={size === i} className={`sticker-btn icon-btn hit ${size === i ? 'tone-yellow' : ''}`} onClick={() => setSize(i)}>
              <i className="block rounded-full" style={{ width: s.dot, height: s.dot, background: erase ? '#9aa7ab' : color, border: '2.5px solid var(--ink)' }} />
            </button>
          ))}
          <button aria-label="Eraser" aria-pressed={erase} className={`sticker-btn icon-btn hit ${erase ? 'tone-yellow' : ''}`} onClick={() => setErase((v) => !v)}>
            <Icon name="eraser" size={26} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button aria-label="Undo" disabled={!count} className="sticker-btn icon-btn hit" onClick={undo}><Icon name="undo" size={26} /></button>
          <button aria-label={sure ? 'Really clear?' : 'Clear'} disabled={!count} className={`sticker-btn icon-btn hit ${sure ? 'tone-coral' : ''}`} onClick={clear}><Icon name="trash" size={26} /></button>
          <Btn icon="back" className="grow" onClick={onBack}>Back</Btn>
        </div>
        <Btn big tone="yellow" icon="check" disabled={busy} onClick={done}>{busy ? 'Cutting it out...' : 'Done!'}</Btn>
        <p className="text-xs leading-snug opacity-70">{aiEnabled() ? 'A cloud AI (Gemini) will look at your drawing to see what it is.' : 'Your drawing stays on this device.'}</p>
      </div>
    </div>
  )
}
