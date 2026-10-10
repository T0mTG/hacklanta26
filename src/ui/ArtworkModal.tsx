import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { easels } from '../entities/registry'
import { NOTE_COLORS } from '../data/theme'
import { makeId } from '../lib/artwork'
import { useStore } from '../store'
import { emitBurst } from '../world/Burst'
import Icon from './Icon'
import { Btn, IconBtn } from './kit'

// The big picture: the drawing in a polaroid frame, who made it, what it is, and sticky notes anyone can add
export default function ArtworkModal() {
  const id = useStore((s) => s.viewing)
  const artworks = useStore((s) => s.artworks)
  const myName = useStore((s) => s.myName)
  const setMyName = useStore((s) => s.setMyName)
  const setViewing = useStore((s) => s.setViewing)
  const addNote = useStore((s) => s.addNote)
  const removeNote = useStore((s) => s.removeNote)
  const say = useStore((s) => s.say)

  const index = artworks.findIndex((a) => a.id === id)
  const art = index >= 0 ? artworks[index] : null
  const n = artworks.length

  const [text, setText] = useState('')
  const [color, setColor] = useState<string>(NOTE_COLORS[0])
  const [name, setName] = useState(myName)

  const go = (step: number) => { if (n > 1) setViewing(artworks[(index + step + n) % n].id) }

  // the watchers cheer when a drawing is opened
  useEffect(() => {
    if (!id) return
    const rt = easels.get(id)
    if (rt) rt.cheerUntil = performance.now() + 1700
  }, [id])

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
      if (e.key === 'Escape') { setViewing(null); return }
      if (typing) return
      if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const stick = () => {
    if (!art) return
    const t = text.trim()
    if (!t) { say('Write a little note first!'); return }
    const by = name.trim() || 'A friend'
    if (name.trim()) setMyName(name.trim())
    addNote(art.id, { id: makeId(), text: t.slice(0, 120), color, by, at: Date.now(), mine: true })
    setText('')
    const rt = easels.get(art.id)
    if (rt) {
      rt.cheerUntil = performance.now() + 1800
      emitBurst(rt.top.clone(), rt.dir.clone(), [color, '#f2c14e', '#f6a6b8'], 14)
    }
  }

  return (
    <AnimatePresence>
      {art && (
        <motion.div
          key="modal"
          className="absolute inset-0 grid place-items-center p-2 sm:p-5 modal-back hit"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setViewing(null)}
        >
          <motion.div
            className="sticker relative w-full max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2.5rem)] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row !rounded-[24px]"
            initial={{ y: 40, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 24, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-label={art.title}
          >
            <IconBtn icon="close" label="Close" className="!absolute right-3 top-3 z-10" onClick={() => setViewing(null)} />

            <div className="relative flex-1 min-h-[38vh] md:min-h-[26rem] bg-paper grid place-items-center p-4 sm:p-8">
              <div className="polaroid max-w-full" style={{ transform: 'rotate(-0.8deg)' }}>
                <img src={art.src} alt={art.title} draggable={false} style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: 'min(56vh, 34rem)' }} />
              </div>
              {n > 1 && (
                <>
                  <IconBtn icon="left" label="Previous drawing" className="round !absolute left-3 top-1/2 -translate-y-1/2" onClick={() => go(-1)} />
                  <IconBtn icon="right" label="Next drawing" className="round !absolute right-3 top-1/2 -translate-y-1/2" onClick={() => go(1)} />
                </>
              )}
            </div>

            <div className="md:w-[23rem] lg:w-[26rem] shrink-0 border-t-[3px] md:border-t-0 md:border-l-[3px] border-ink bg-cream md:overflow-y-auto p-4 sm:p-5 flex flex-col gap-3">
              <div className="pr-14">
                <div className="eyebrow">Drawing {index + 1} / {n}</div>
                <h2 className="font-display font-bold text-3xl leading-tight mt-1">{art.title}</h2>
                <p className="mt-1 font-semibold opacity-80">
                  by {art.artist || 'a young artist'}
                  {art.kind !== 'neighbor' && <span className="pill !text-xs !py-0 ml-2 align-middle">yours</span>}
                </p>
              </div>
              <p className="text-base leading-snug">
                {art.story || 'Every drawing has a story. Leave a note to say what you love about it!'}
              </p>
              <div className="flex items-center gap-2">
                <span className="eyebrow">Colors</span>
                {art.palette.map((c) => <i key={c} className="swatch" style={{ background: c }} />)}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <Icon name="note" size={20} />
                <span className="font-display font-semibold text-lg">Notes</span>
                <span className="badge-dark">{art.notes.length}</span>
              </div>
              <div className="grid gap-3">
                {art.notes.length === 0 && <p className="text-sm opacity-70">No notes yet. Be the first!</p>}
                {art.notes.map((note, i) => (
                  <div key={note.id} className="note" style={{ background: note.color, transform: `rotate(${(i % 2 ? 1 : -1) * 0.9}deg)` }}>
                    {note.text}
                    <small>{note.by}</small>
                    {note.mine && (
                      <button className="x" aria-label="Take this note back" title="Take this note back" onClick={() => removeNote(art.id, note.id)}>
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid gap-2 border-t-[3px] border-dashed border-ink/30 pt-3">
                <textarea
                  className="input resize-none !text-base" rows={2} maxLength={120} value={text} placeholder="Write a nice note..."
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stick() } }}
                />
                <div className="flex items-center gap-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c} aria-label="Note color" onClick={() => setColor(c)}
                      className="swatch cursor-pointer" style={{ background: c, outline: c === color ? '3px solid var(--ink)' : 'none', outlineOffset: 2 }}
                    />
                  ))}
                  <input className="input !py-1.5 !text-sm min-w-0 flex-1" value={name} maxLength={20} placeholder="Your name" onChange={(e) => setName(e.target.value)} />
                </div>
                <Btn tone="yellow" icon="note" onClick={stick}>Stick it!</Btn>
              </div>

              {n > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 pt-1 mt-auto">
                  {artworks.map((a) => (
                    <button key={a.id} className={`thumb ${a.id === art.id ? 'on' : ''}`} title={a.title} aria-label={a.title} onClick={() => setViewing(a.id)}>
                      <img src={a.src} alt="" draggable={false} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
