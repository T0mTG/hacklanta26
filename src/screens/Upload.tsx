import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { SAMPLES, sampleUrl, type Sample } from '../data/samples'
import { buildArtwork, checkFile, processBlob, processUrl, titleFromName } from '../lib/artwork'
import { clamp } from '../lib/rng'
import DrawBoard from '../paper/draw/DrawBoard'
import { SHELF } from '../paper/library'
import type { PaperEntry } from '../paper/types'
import type { PaperPending } from '../data/types'
import Icon from '../ui/Icon'
import { Btn, IconBtn } from '../ui/kit'

interface Draft { kind: 'upload' | 'sample'; src: string; aspect: number; palette: string[]; title: string; story: string }

// Step one picks a drawing (drop, choose, camera, or a sample). Step two names it. Then it goes to "building your easel".
export default function Upload() {
  const setOverlay = useStore((s) => s.setOverlay)
  const say = useStore((s) => s.say)
  const stage = useStore((s) => s.stage)
  const myName = useStore((s) => s.myName)
  const stagePaper = useStore((s) => s.stagePaper)
  const paper = useStore((s) => s.globe) === 'paper'
  const setMyName = useStore((s) => s.setMyName)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [drawing, setDrawing] = useState(false) // the whiteboard (Paper Globe)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState(myName)
  const [story, setStory] = useState('')
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [shake, setShake] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const touch = useMemo(() => window.matchMedia?.('(pointer: coarse)').matches ?? false, [])

  const fail = (msg: string) => { say(msg); setShake((n) => n + 1) }
  const take = (d: Draft) => { setDraft(d); setTitle(d.title); setStory(d.story) }

  const submit = (d: Draft, t: string, a: string, s: string) => {
    const name = a.trim()
    if (name) setMyName(name)
    stage(buildArtwork({ title: t.trim() || 'My Drawing', artist: name, story: s.trim(), src: d.src, aspect: d.aspect, palette: d.palette, kind: d.kind }))
    setOverlay('processing')
  }

  const onFile = async (file: File) => {
    const err = checkFile(file)
    if (err) return fail(err)
    setBusy(true)
    try {
      const p = await processBlob(file, true)
      // on the Paper Globe there is nothing to name: the drawing goes straight to the AI
      if (paper) goPaper({ src: p.dataUrl, picture: p.dataUrl, name: file.name })
      else take({ kind: 'upload', src: p.dataUrl, aspect: p.aspect, palette: p.palette, title: titleFromName(file.name), story: '' })
    } catch {
      fail("Hmm, we couldn't open that picture. Try a different one!")
    } finally {
      setBusy(false)
    }
  }

  const goPaper = (p: PaperPending) => {
    stagePaper(p)
    setOverlay('processing')
  }
  const onShelf = (e: PaperEntry) => goPaper({ src: e.rawUrl!, entryId: e.id, name: e.label })

  const onSample = async (s: Sample, quick = false) => {
    setBusy(true)
    try {
      const p = await processUrl(sampleUrl(s))
      const d: Draft = { kind: 'sample', src: sampleUrl(s), aspect: p.aspect, palette: p.palette, title: s.title, story: s.story }
      if (quick) submit(d, s.title, myName, s.story)
      else take(d)
    } catch {
      fail("Hmm, we couldn't open that picture. Try a different one!")
    } finally {
      setBusy(false)
    }
  }

  // Esc steps back; D picks a surprise drawing and goes straight to the planet
  const latest = useRef({ draft, busy, onSample, onShelf, paper, drawing })
  latest.current = { draft, busy, onSample, onShelf, paper, drawing }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
      const { draft, busy, onSample, onShelf, paper, drawing } = latest.current
      if (e.key === 'Escape') { if (drawing) setDrawing(false); else if (draft) setDraft(null); else setOverlay(null) }
      else if (!typing && !draft && !drawing && !busy && (e.key === 'd' || e.key === 'D')) {
        if (paper) onShelf(SHELF[Math.floor(Math.random() * SHELF.length)])
        else onSample(SAMPLES[Math.floor(Math.random() * SAMPLES.length)], true)
      }
    }
    const stop = (e: Event) => e.preventDefault() // a picture dropped beside the zone should not navigate the page away
    window.addEventListener('keydown', onKey)
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('dragover', stop)
      window.removeEventListener('drop', stop)
    }
  }, [setOverlay])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }
  const picked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // so choosing the same file twice still fires
    if (f) onFile(f)
  }

  return (
    <motion.div className="absolute inset-0 grid place-items-center p-3 sm:p-4 hit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="sticker w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-4 sm:p-7"
        initial={{ y: 40, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight">{drawing ? 'Draw it!' : draft ? 'Almost there!' : 'Show us your drawing!'}</h2>
            <p className={`mt-1 text-base sm:text-lg ${drawing ? 'hidden sm:block' : ''}`}>{drawing ? 'Pick a color and draw. Press Done when it is finished.' : draft ? 'Give it a name, then put it on the planet.' : paper ? 'Draw one, drop a picture, or try one of ours.' : 'Drop a picture, snap a photo, or try one of ours.'}</p>
          </div>
          <IconBtn icon="close" label="Close" className="shrink-0" onClick={() => setOverlay(null)} />
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={picked} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={picked} />

        {drawing ? (
          <DrawBoard
            onBack={() => setDrawing(false)}
            onDone={(cut) => goPaper({ src: cut.picture, picture: cut.picture, name: 'My drawing', drawn: cut })}
          />
        ) : !draft ? (
          <div className="mt-4 grid gap-4 md:grid-cols-[1.05fr_1fr]">
            <div
              key={shake}
              className={`dropzone ${over ? 'over' : ''} ${shake ? 'shake' : ''}`}
              onDragEnter={(e) => { e.preventDefault(); setOver(true) }}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
            >
              {busy ? (
                <>
                  <div className="text-5xl" style={{ animation: 'wobble 1s ease-in-out infinite' }} aria-hidden>🖍️</div>
                  <p className="font-display text-xl font-semibold">Opening your picture...</p>
                </>
              ) : (
                <>
                  <Icon name="upload" size={46} />
                  <p className="font-display text-xl font-semibold leading-tight">Drop your picture here</p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {paper && <Btn tone="coral" icon="brush" onClick={() => setDrawing(true)}>Draw one!</Btn>}
                    <Btn tone="yellow" icon="upload" onClick={() => fileRef.current?.click()}>Choose a picture</Btn>
                    {touch && <Btn icon="camera" onClick={() => camRef.current?.click()}>Take a photo</Btn>}
                  </div>
                  <p className="text-sm opacity-75">Your drawing stays on this device.</p>
                </>
              )}
            </div>

            <div>
              <p className="font-display font-semibold text-lg mb-2">No drawing handy? Try one of these:</p>
              {paper ? (
                <div className="grid grid-cols-4 gap-2">
                  {SHELF.map((e) => (
                    <button key={e.id} className="sticker-btn !p-1 !min-h-0 aspect-square overflow-hidden hit bg-white" title={e.label} aria-label={e.label} disabled={busy} onClick={() => onShelf(e)}>
                      <img src={e.rawUrl} alt="" className="w-full h-full object-contain rounded-lg bg-white" draggable={false} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {SAMPLES.map((s) => (
                    <button key={s.id} className="sticker-btn !p-1 !min-h-0 aspect-square overflow-hidden hit" title={s.title} aria-label={s.title} disabled={busy} onClick={() => onSample(s)}>
                      <img src={sampleUrl(s)} alt="" className="w-full h-full object-cover rounded-lg" draggable={false} />
                    </button>
                  ))}
                </div>
              )}
              {!touch && <p className="mt-3 text-sm">Press <span className="keycap">D</span> for a surprise drawing.</p>}
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,.9fr)_1.1fr] items-start">
            <div className="polaroid mx-auto w-full max-w-sm" style={{ transform: 'rotate(-2deg)' }}>
              <div style={{ aspectRatio: clamp(draft.aspect, 0.6, 1.6) }}>
                <img src={draft.src} alt="Your drawing" draggable={false} />
              </div>
            </div>
            <div className="grid gap-3">
              <label className="field">
                <span>Name your drawing</span>
                <input
                  className="input" value={title} maxLength={28} placeholder="My Happy Dog" autoFocus={!touch}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(draft, title, artist, story) }}
                />
              </label>
              <label className="field">
                <span>Your name <i className="font-normal opacity-70">(optional)</i></span>
                <input className="input" value={artist} maxLength={20} placeholder="Artist name" onChange={(e) => setArtist(e.target.value)} />
              </label>
              <label className="field">
                <span>Tell us about it <i className="font-normal opacity-70">(optional)</i></span>
                <textarea className="input resize-none" rows={3} value={story} maxLength={140} placeholder="What is it? What do you love about it?" onChange={(e) => setStory(e.target.value)} />
              </label>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold">Colors</span>
                {draft.palette.map((c) => <i key={c} className="swatch" style={{ background: c }} />)}
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <Btn icon="back" onClick={() => setDraft(null)}>Back</Btn>
                <Btn tone="yellow" icon="check" className="grow" onClick={() => submit(draft, title, artist, story)}>Put it on the planet!</Btn>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
