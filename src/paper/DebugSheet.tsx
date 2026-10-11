import { useMemo, useState } from 'react'
import { LIBRARY } from './library'
import type { PaperEntry } from './types'

// A page for checking the cut-outs by eye (open the app with ?sheet): every cut-out on grass, with its silhouette outline
// (the shape the paper edge follows) and its foot (where it stands) drawn on top, and the data the world uses for it.
const outlinePoints = (e: PaperEntry) => {
  const pts: string[] = []
  for (let i = 0; i < e.outline.length; i += 2) pts.push(`${e.outline[i]},${1 - e.outline[i + 1]}`)
  return pts.join(' ')
}

export default function DebugSheet() {
  const [q, setQ] = useState('')
  const [behavior, setBehavior] = useState<string>('all')
  const [outline, setOutline] = useState(true)
  const [tile, setTile] = useState(170)
  const behaviors = useMemo(() => ['all', ...new Set(LIBRARY.map((e) => e.behavior))], [])
  const shown = LIBRARY.filter((e) => (behavior === 'all' || e.behavior === behavior) && (!q || `${e.id} ${e.label} ${e.kind}`.toLowerCase().includes(q.toLowerCase())))
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const e of LIBRARY) c[e.behavior] = (c[e.behavior] ?? 0) + 1
    return c
  }, [])

  return (
    <div className="fixed inset-0 overflow-auto bg-[#cfe9b6] text-ink" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b-[3px] border-ink bg-cream px-4 py-3">
        <h1 className="font-display text-2xl font-bold">Paper library</h1>
        <span className="pill">{LIBRARY.length} cut-outs</span>
        <span className="text-sm opacity-70">{Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(' · ')}</span>
        <input className="input !w-48 !py-1.5 !text-base" placeholder="search..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {behaviors.map((b) => (
            <button key={b} className={`sticker-btn !min-h-0 !px-3 !py-1 !text-sm ${behavior === b ? 'tone-yellow' : ''}`} onClick={() => setBehavior(b)}>{b}</button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm font-bold"><input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} /> outline + foot</label>
        <label className="flex items-center gap-1.5 text-sm font-bold">size <input type="range" min={110} max={360} value={tile} onChange={(e) => setTile(+e.target.value)} /></label>
      </header>
      <div className="grid gap-3 p-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${tile}px, 1fr))` }}>
        {shown.map((e) => (
          <figure key={e.id} className="m-0 rounded-xl border-[3px] border-ink bg-[#b9dca0] p-2 shadow-[3px_3px_0_var(--ink)]">
            <div className="grid place-items-center" style={{ height: tile * 0.85 }}>
              <div className="relative" style={{ aspectRatio: e.aspect, maxWidth: '100%', maxHeight: '100%', height: e.aspect < 1.1 ? '100%' : undefined, width: e.aspect >= 1.1 ? '100%' : undefined }}>
                <img src={e.url} alt={e.label} className="absolute inset-0 h-full w-full" draggable={false} />
                {outline && (
                  <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
                    <polygon points={outlinePoints(e)} fill="none" stroke="#e0115f" strokeWidth="0.012" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.5 }} />
                    <line x1={e.anchor} x2={e.anchor} y1="0.9" y2="1" stroke="#0b6fe0" style={{ strokeWidth: 2 }} vectorEffect="non-scaling-stroke" />
                  </svg>
                )}
              </div>
            </div>
            <figcaption className="mt-1.5 text-[11px] font-bold leading-tight">
              <div className="truncate text-[13px]">{e.id}</div>
              <div className="opacity-80">{e.label} · {e.kind}</div>
              <div className="opacity-70">{e.shape} · {e.behavior} · {e.size} · face {e.face} · {e.outline.length / 2} pts</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
