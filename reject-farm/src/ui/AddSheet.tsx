import { useEffect, useRef, useState } from 'react'
import { type Prepared, prepareArt, readArtFile } from '../lib/image'
import { sfx } from '../lib/sound'
import { useStore } from '../store'
import type { Facing } from '../types'

type Tab = 'drop' | 'draw'
const TABS: [Tab, string][] = [
  ['drop', 'Upload a picture'],
  ['draw', 'Draw one'],
]
const PENS = ['#3B2A20', '#F0765B', '#3F8FD0', '#6FA06B', '#F6D35B', '#C94F6D']
const MAKING = ['Cutting it out…', 'Teaching it to walk…', 'Finding it a home…']
const FACINGS: [Facing, string][] = [
  ['left', '← left'],
  ['front', 'at me'],
  ['right', 'right →'],
]

function DoodlePad({ onUse }: { onUse: (art: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const last = useRef<[number, number] | null>(null)
  const [pen, setPen] = useState(PENS[0])
  const [dirty, setDirty] = useState(false)

  const clear = () => {
    const c = canvas.current!
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#FFFDF6'
    ctx.fillRect(0, 0, c.width, c.height)
    setDirty(false)
  }
  useEffect(clear, [])

  const at = (e: React.PointerEvent): [number, number] => {
    const c = canvas.current!
    const r = c.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height]
  }
  const draw = (e: React.PointerEvent) => {
    if (!last.current) return
    const ctx = canvas.current!.getContext('2d')!
    const [x, y] = at(e)
    ctx.strokeStyle = pen
    ctx.lineWidth = 14
    ctx.lineCap = ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current[0], last.current[1])
    ctx.lineTo(x, y)
    ctx.stroke()
    last.current = [x, y]
    setDirty(true)
  }

  return (
    <div className="doodle">
      <canvas
        ref={canvas}
        width={640}
        height={640}
        aria-label="Drawing pad"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const [x, y] = (last.current = at(e))
          const ctx = e.currentTarget.getContext('2d')!
          ctx.fillStyle = pen
          ctx.beginPath()
          ctx.arc(x, y, 7, 0, Math.PI * 2)
          ctx.fill()
          setDirty(true)
        }}
        onPointerMove={draw}
        onPointerUp={() => (last.current = null)}
        onPointerCancel={() => (last.current = null)}
      />
      <div className="doodle-tools">
        <div className="pens">
          {PENS.map((p) => (
            <button key={p} className={`pen${p === pen ? ' on' : ''}`} style={{ background: p }} onClick={() => setPen(p)} aria-label={`Pen colour ${p}`} />
          ))}
        </div>
        <button className="link" onClick={clear}>
          Start over
        </button>
        <button className="btn primary" disabled={!dirty} onClick={() => onUse(canvas.current!.toDataURL('image/png'))}>
          Use this
        </button>
      </div>
      <p className="hand tip">Give it legs. The paper gets cut away around it.</p>
    </div>
  )
}

export function AddSheet() {
  const droppedArt = useStore((s) => s.droppedArt)
  const lastCreator = useStore((s) => s.lastCreator)
  const closeSheet = useStore((s) => s.closeSheet)
  const addCreature = useStore((s) => s.addCreature)
  const say = useStore((s) => s.say)

  const [tab, setTab] = useState<Tab>('drop')
  /** the picture as it was given to us */
  const [raw, setRaw] = useState<string | null>(droppedArt)
  /** whether to cut away a plain backdrop: decided automatically until the person says otherwise */
  const [cut, setCut] = useState<boolean | 'auto'>('auto')
  const [art, setArt] = useState<Prepared | null>(null)
  const [name, setName] = useState('')
  const [creator, setCreator] = useState(lastCreator)
  const [note, setNote] = useState('')
  const [facing, setFacing] = useState<Facing>('front')
  const [making, setMaking] = useState(-1)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (droppedArt) setRaw(droppedArt)
  }, [droppedArt])

  useEffect(() => {
    if (!raw) return setArt(null)
    let alive = true
    prepareArt(raw, cut)
      .then((p) => alive && setArt(p))
      .catch(() => {
        if (!alive) return
        setRaw(null)
        say('That picture is shy. Try another one.')
      })
    return () => {
      alive = false
    }
  }, [raw, cut, say])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && making < 0 && closeSheet()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeSheet, making])

  // the creation sequence: three beats of anticipation, then the creature drops in
  useEffect(() => {
    if (making < 0 || !art) return
    if (making >= MAKING.length) {
      addCreature({ artSrc: art.src, aspect: art.aspect, name, creator, note, facing })
      return
    }
    sfx.tick()
    const t = setTimeout(() => setMaking((m) => m + 1), 800)
    return () => clearTimeout(t)
  }, [making]) // eslint-disable-line react-hooks/exhaustive-deps

  const takeFile = async (file: File | undefined) => {
    const src = await readArtFile(file)
    if (src) {
      setCut('auto')
      setRaw(src)
    } else say('That file is shy. Try a PNG or a JPG.')
  }

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && making < 0 && closeSheet()}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Add a creature">
        <span className="tape t1" aria-hidden="true" />
        {making >= 0 && art ? (
          <div className="making">
            <div className="making-art">
              <span className="ring" />
              <img src={art.src} alt="" />
            </div>
            <p className="making-line" key={making}>
              {MAKING[Math.min(making, MAKING.length - 1)]}
            </p>
          </div>
        ) : !raw ? (
          <>
            <h2>Add a creature</h2>
            <p className="sub">Anything with legs, wings, wheels or a good attitude. It walks in exactly as you made it.</p>
            <div className="tabs" role="tablist">
              {TABS.map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'drop' && (
              <button className="dropzone" onClick={() => fileInput.current?.click()}>
                <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 28h44l-5 24a4 4 0 0 1-4 3H19a4 4 0 0 1-4-3l-5-24Z" fill="#F4C9A8" />
                  <path d="M18 28c0-10 6-17 14-17s14 7 14 17" />
                  <path d="M24 36v11M32 36v11M40 36v11" />
                </svg>
                <b>Drop a picture here</b>
                <span>or click to pick a file &middot; a see-through PNG works best</span>
                <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => void takeFile(e.target.files?.[0])} />
              </button>
            )}
            {tab === 'draw' && (
              <DoodlePad
                onUse={(src) => {
                  setCut('auto')
                  setRaw(src)
                }}
              />
            )}
          </>
        ) : (
          <form
            className="tell"
            onSubmit={(e) => {
              e.preventDefault()
              if (art) setMaking(0)
            }}
          >
            <figure className="preview">
              <div className="stagebox">{art && <img src={art.src} alt="Your creature" />}</div>
              {art?.hasBackdrop && (
                <label className="check">
                  <input type="checkbox" checked={art.cut} onChange={(e) => setCut(e.target.checked)} />
                  Cut away the background
                </label>
              )}
              <button type="button" className="link" onClick={() => setRaw(null)}>
                Pick a different one
              </button>
            </figure>
            <div className="fields">
              <h2>Who is this?</h2>
              <label>
                Its name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Leave empty and we’ll pick one" maxLength={24} autoFocus />
              </label>
              <label>
                Who made it?
                <input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Your name" maxLength={30} />
              </label>
              <label>
                Its story
                <textarea className="hand" value={note} onChange={(e) => setNote(e.target.value)} placeholder="where it came from, why it didn’t make it…" maxLength={140} rows={2} />
              </label>
              <div className="field">
                <span>Which way is it looking?</span>
                <div className="seg" role="radiogroup" aria-label="Which way is it looking?">
                  {FACINGS.map(([id, label]) => (
                    <button key={id} type="button" role="radio" aria-checked={facing === id} className={facing === id ? 'on' : ''} onClick={() => setFacing(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn primary big" type="submit" disabled={!art}>
                Bring it to life
              </button>
              <p className="fineprint">Only add work that&rsquo;s yours. Your name stays on it for good.</p>
            </div>
          </form>
        )}
        {making < 0 && (
          <button className="icon-btn close" onClick={closeSheet} aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </section>
    </div>
  )
}
