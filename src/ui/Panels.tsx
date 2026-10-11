import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Vector3 } from 'three'
import { flyToEasel } from '../entities/playerState'
import { useStore } from '../store'
import { nearestRegion } from '../world/regions'
import Icon from './Icon'
import { Btn, IconBtn } from './kit'

// The list of every drawing on the planet. Tap one to be taken there.
export function Drawer() {
  const open = useStore((s) => s.drawer)
  const artworks = useStore((s) => s.artworks)
  const setDrawer = useStore((s) => s.setDrawer)
  const setOverlay = useStore((s) => s.setOverlay)
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
              <h2 className="font-display font-bold text-2xl">My drawings</h2>
              <IconBtn icon="close" label="Close" onClick={() => setDrawer(false)} />
            </div>
            <ul className="flex-1 overflow-y-auto px-4 py-2 grid gap-2.5 content-start">
              {artworks.map((a, i) => (
                <li key={a.id}>
                  <button
                    className="sticker-btn !w-full !justify-start !gap-3 !p-2 !text-left !text-base" onClick={() => flyToEasel(a.id)}
                  >
                    <span className="thumb !cursor-pointer !opacity-100 !w-14 !h-14"><img src={a.src} alt="" draggable={false} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display font-semibold">{i + 1}. {a.title}</span>
                      <span className="block text-xs font-bold opacity-70 truncate">
                        {a.artist ? `by ${a.artist} · ` : ''}{nearestRegion(new Vector3(...a.dir)).region.name}
                      </span>
                    </span>
                    {a.kind !== 'neighbor' && <Icon name="star" size={20} />}
                  </button>
                </li>
              ))}
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

const HELP: [string, string][] = [
  ['Walk', 'W A S D or the arrow keys. Or tap the ground.'],
  ['Look around', 'Drag with the mouse or your finger. Scroll or pinch to zoom.'],
  ['See a drawing', 'Walk up to an easel and press E, or just tap it.'],
  ['Move an easel', 'Press and hold an easel, then drag it somewhere new.'],
  ['Whole planet', 'Press G or the globe button. Spin it, then tap a drawing.'],
]

const HELP_PAPER: [string, string][] = [
  ['Walk', 'W A S D or the arrow keys. Or tap the ground.'],
  ['Look around', 'Drag with the mouse or your finger. Scroll or pinch to zoom.'],
  ['See a drawing', 'Walk up to anything and press E, or just tap it.'],
  ['Carry things', 'Press and hold anything, then drag it somewhere new.'],
  ['Add your own', 'Press the plus button and pick a drawing.'],
  ['Whole planet', 'Press G or the globe button.'],
]

export function Help() {
  const open = useStore((s) => s.help)
  const rows = useStore((s) => s.globe) === 'paper' ? HELP_PAPER : HELP
  const setHelp = useStore((s) => s.setHelp)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setHelp(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setHelp])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 grid place-items-center p-4 modal-back hit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHelp(false)}>
          <motion.div
            className="sticker w-full max-w-md p-5 sm:p-6" onClick={(e) => e.stopPropagation()}
            initial={{ y: 30, scale: 0.95, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display font-bold text-3xl">How to play</h2>
              <IconBtn icon="close" label="Close" onClick={() => setHelp(false)} />
            </div>
            <dl className="mt-3 grid gap-3">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="eyebrow">{k}</dt>
                  <dd className="text-base leading-snug">{v}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
