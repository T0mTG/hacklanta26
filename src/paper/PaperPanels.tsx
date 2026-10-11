import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Vector3 } from 'three'
import { useStore } from '../store'
import { nearestRegion } from '../world/regions'
import { view } from '../world/rig'
import { surfaceRadius } from '../world/terrain'
import { player } from '../entities/playerState'
import Icon from '../ui/Icon'
import { Btn, IconBtn } from '../ui/kit'
import { paperItems } from './items'
import { removeAdded, standBeforeItem } from './runtime'
import TalkPanel from './talk/TalkPanel'
import { kindName } from './draw/classify'

// Tapping something on the Paper Globe: its original drawing, big, with its name.
export function PaperViewer() {
  const id = useStore((s) => s.viewing)
  const setViewing = useStore((s) => s.setViewing)
  const say = useStore((s) => s.say)
  const [sure, setSure] = useState(false)
  const it = id ? paperItems.get(id) : null
  useEffect(() => { setSure(false) }, [id])
  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewing(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, setViewing])

  const e = it?.entry
  const original = it?.picture ?? e?.rawUrl // the kid's own picture, or the original drawing; else the cut-out itself
  const place = it ? nearestRegion(it.dir).region : null
  const mine = it?.source === 'added'
  return (
    <AnimatePresence>
      {it && e && (
        <motion.div
          key="paper-view" className="absolute inset-0 grid place-items-center p-3 sm:p-5 modal-back hit"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewing(null)}
        >
          <motion.div
            className="sticker relative w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto !rounded-[24px] flex flex-col sm:flex-row"
            initial={{ y: 40, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 24, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            onClick={(ev) => ev.stopPropagation()} role="dialog" aria-label={it.label ?? e.label}
          >
            <IconBtn icon="close" label="Close" className="!absolute right-3 top-3 z-10" onClick={() => setViewing(null)} />
            <div className="relative flex-1 min-h-[16rem] bg-paper grid place-items-center p-5 sm:p-8">
              {original ? (
                <div className="polaroid max-w-full" style={{ transform: 'rotate(-1deg)' }}>
                  <img src={original} alt={it.label ?? e.label} draggable={false} style={{ maxWidth: '100%', maxHeight: 'min(52vh, 26rem)', width: 'auto', height: 'auto', display: 'block' }} />
                </div>
              ) : (
                <img src={e.url} alt={e.label} draggable={false} style={{ maxWidth: '100%', maxHeight: 'min(52vh, 26rem)', filter: 'drop-shadow(5px 7px 0 rgba(34,51,59,.28))' }} />
              )}
            </div>
            <div className="sm:w-64 shrink-0 border-t-[3px] sm:border-t-0 sm:border-l-[3px] border-ink bg-cream p-5 flex flex-col gap-3 justify-center">
              <div className="pr-12 sm:pr-0">
                <div className="eyebrow">{mine ? 'You put this here' : place?.name ?? 'On the planet'}</div>
                <h2 className="font-display font-bold text-4xl leading-tight mt-1">{it.label ?? e.label}</h2>
                {original && <p className="mt-2 text-sm opacity-70">This is the drawing it was cut out of.</p>}
              </div>
              {original && (
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm opacity-70">Cut out:</span>
                  <img src={e.url} alt="" className="h-16 w-auto" draggable={false} style={{ filter: 'drop-shadow(3px 4px 0 rgba(34,51,59,.25))' }} />
                </div>
              )}
              <TalkPanel id={it.uid} kind={e.kind} who={{ name: it.label ?? e.label, kind: kindName(e.kind), place: place?.name }} />
              {mine && (
                sure
                  ? <Btn tone="coral" icon="trash" onClick={() => { removeAdded(it.uid); setViewing(null); say('Bye bye!') }}>Really take it down?</Btn>
                  : <Btn icon="trash" onClick={() => setSure(true)}>Take it down</Btn>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// "My stuff": everything the kid has put on the planet. Tap one to be taken there.
export function PaperDrawer() {
  const open = useStore((s) => s.drawer)
  const added = useStore((s) => s.paper.added)
  const setDrawer = useStore((s) => s.setDrawer)
  const setOverlay = useStore((s) => s.setOverlay)
  const setCam = useStore((s) => s.setCam)
  const setViewing = useStore((s) => s.setViewing)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setDrawer])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 hit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)}>
          <motion.aside
            className="sticker absolute right-3 top-3 bottom-3 w-[min(24rem,calc(100%-1.5rem))] flex flex-col"
            initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 p-4 pb-2">
              <h2 className="font-display font-bold text-2xl">My stuff</h2>
              <IconBtn icon="close" label="Close" onClick={() => setDrawer(false)} />
            </div>
            <ul className="flex-1 overflow-y-auto px-4 py-2 grid gap-2.5 content-start">
              {added.length === 0 && <li className="text-base opacity-75 p-2">Nothing yet. Add a drawing and watch it come alive!</li>}
              {added.map((a) => {
                const it = paperItems.get(a.uid)
                return (
                  <li key={a.uid}>
                    <button
                      className="sticker-btn !w-full !justify-start !gap-3 !p-2 !text-left !text-base"
                      onClick={() => { if (standBeforeItem(a.uid)) { setDrawer(false); setCam('walk'); setViewing(a.uid) } }}
                    >
                      <span className="thumb !cursor-pointer !opacity-100 !w-14 !h-14 grid place-items-center">
                        <img src={a.src ?? it?.entry.url ?? ''} alt="" draggable={false} style={{ objectFit: 'contain' }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display font-semibold">{a.name}</span>
                        <span className="block text-xs font-bold opacity-70 truncate">{it ? nearestRegion(it.dir).region.name : 'On the planet'}</span>
                      </span>
                      <Icon name="star" size={20} />
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="p-4 pt-2 flex gap-3">
              <Btn tone="yellow" icon="plus" className="grow" onClick={() => { setDrawer(false); setOverlay('upload') }}>Add a drawing</Btn>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Name pills over what the kid added, while looking at the whole planet, and a "You" pill
export function PaperLabels() {
  const added = useStore((s) => s.paper.added)
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
        const half = el.offsetWidth / 2 + 6
        const x = Math.min(w - half, Math.max(half, (v.x * 0.5 + 0.5) * w))
        el.style.transform = `translate(${x}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`
      }
      for (const [uid, el] of els.current) {
        const it = paperItems.get(uid)
        if (!cam || !it || !globe) { el.style.opacity = '0'; continue }
        place(el, it.dir, it.top, true)
      }
      const y = you.current
      if (y) {
        if (!cam || !globe) y.style.opacity = '0'
        else place(y, player.dir, v.copy(player.dir).multiplyScalar(surfaceRadius(player.dir) + 2.2).clone(), true)
      }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {added.map((a, i) => (
        <div key={a.uid} ref={(el) => { if (el) els.current.set(a.uid, el); else els.current.delete(a.uid) }} className="label-pill" style={{ opacity: 0 }}>
          <span className="badge" style={{ background: '#f2c14e' }}>{i + 1}</span>{a.name}
        </div>
      ))}
      <div ref={you} className="label-pill" style={{ opacity: 0, background: '#f2c14e' }}>
        <span className="badge" style={{ background: '#fff' }}>★</span>You
      </div>
    </div>
  )
}
