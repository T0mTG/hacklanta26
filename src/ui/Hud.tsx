import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Vector3 } from 'three'
import { easels } from '../entities/registry'
import { paperItems } from '../paper/items'
import { player, togglePlanetView } from '../entities/playerState'
import { R, angleBetween } from '../lib/sphere'
import { useStore } from '../store'
import { nearestRegion, type Region } from '../world/regions'
import { VARIANTS } from '../world/variants'
import { view } from '../world/rig'
import Icon from './Icon'
import { IconBtn } from './kit'
import MusicButton from './MusicButton'

const goHome = () => {
  const s = useStore.getState()
  s.setViewing(null); s.setDrawer(false); s.setHelp(false)
  s.setScreen('landing'); s.setCam('title')
}

// Big white place name when you walk into a new part of the planet, like the reference
function ZoneBanner() {
  const [zone, setZone] = useState<Region | null>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    let last: string | null = null
    let hide = 0
    const id = window.setInterval(() => {
      if (useStore.getState().cam !== 'walk') return
      const { region, angle } = nearestRegion(player.dir)
      const now = angle < region.r * 0.85 ? region.id : null
      if (now === last) return
      last = now
      if (!now) return
      setZone(region); setShow(true)
      window.clearTimeout(hide)
      hide = window.setTimeout(() => setShow(false), 3600)
    }, 300)
    return () => { window.clearInterval(id); window.clearTimeout(hide) }
  }, [])
  return (
    <AnimatePresence>
      {show && zone && (
        <motion.div
          key={zone.id}
          className="absolute left-4 bottom-4 sm:left-8 sm:bottom-8 pointer-events-none"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <div className="zone-title">{zone.name}</div>
          <div className="pill mt-3 !text-sm">{zone.tip}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// A short reminder of the controls until the kid has walked a few steps
function Hint({ touch }: { touch: boolean }) {
  const cam = useStore((s) => s.cam)
  const paper = useStore((s) => s.globe) === 'paper'
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (gone) return
    const start = player.dir.clone()
    const id = window.setInterval(() => { if (angleBetween(start, player.dir) * R > 4) setGone(true) }, 400)
    return () => window.clearInterval(id)
  }, [gone])
  if (gone || cam !== 'walk') return null
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-24 sm:bottom-6 pointer-events-none flex flex-wrap items-center justify-center gap-2 px-3 max-w-full">
      {touch ? (
        <span className="pill !text-sm !whitespace-normal !text-center">{paper ? 'Stick to walk. Tap to look. Hold and drag to carry!' : 'Drag the stick to walk, tap an easel to look'}</span>
      ) : (
        <>
          <span className="pill !text-sm"><span className="keycap">W</span><span className="keycap">A</span><span className="keycap">S</span><span className="keycap">D</span> walk</span>
          <span className="pill !text-sm">drag to look around</span>
          <span className="pill !text-sm"><span className="keycap">E</span> {paper ? 'see the drawing' : 'look at a drawing'}</span>
          {paper && <span className="pill !text-sm">drag anything to carry it</span>}
        </>
      )}
    </div>
  )
}

// "Look [E]" floating over the easel you are standing next to
function PromptPill() {
  const touch = useMemo(() => window.matchMedia?.('(pointer: coarse)').matches ?? false, [])
  const nearId = useStore((s) => s.nearId)
  const cam = useStore((s) => s.cam)
  const blocked = useStore((s) => !!s.viewing || !!s.overlay || s.drawer)
  const el = useRef<HTMLButtonElement>(null)
  const setViewing = useStore((s) => s.setViewing)
  useEffect(() => {
    let raf = 0
    const v = new Vector3()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const node = el.current, camera = view.camera
      const rt = nearId ? (useStore.getState().globe === 'paper' ? paperItems.get(nearId) : easels.get(nearId)) : null
      if (!node || !camera || !rt) return
      v.copy(rt.top).project(camera)
      const half = node.offsetWidth / 2 + 8 // keep the pill on the screen when what it points at is near an edge
      const x = Math.min(window.innerWidth - half, Math.max(half, (v.x * 0.5 + 0.5) * window.innerWidth))
      node.style.transform = `translate(${x}px, ${(-v.y * 0.5 + 0.5) * window.innerHeight}px) translate(-50%, -100%)`
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [nearId])
  if (!nearId || cam !== 'walk' || blocked) return null
  return (
    <button ref={el} className="pill hit prompt !px-3.5 !py-1.5 cursor-pointer" style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-9999px,-9999px)' }} onClick={() => setViewing(nearId)}>
      <Icon name="camera" size={18} /> Look {!touch && <span className="keycap">E</span>}
    </button>
  )
}

// Touch controls: a thumb stick for walking and a big button to open the drawing you are next to
function Joystick() {
  const knob = useRef<HTMLElement>(null)
  const base = useRef<HTMLDivElement>(null)
  const set = (x: number, y: number) => {
    player.stick.x = x
    player.stick.y = y
    if (knob.current) knob.current.style.transform = `translate(${x * 40}px, ${-y * 40}px)`
  }
  const track = (e: RPointerEvent) => {
    const r = base.current!.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy), k = len > 40 ? 40 / len : 1
    set((dx * k) / 40, (-dy * k) / 40)
  }
  return (
    <div
      ref={base}
      className="stick hit absolute left-5 bottom-5"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); track(e) }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) track(e) }}
      onPointerUp={() => set(0, 0)}
      onPointerCancel={() => set(0, 0)}
    >
      <i ref={knob} />
    </div>
  )
}

function InteractButton() {
  const nearId = useStore((s) => s.nearId)
  const setViewing = useStore((s) => s.setViewing)
  if (!nearId) return null
  return (
    <button className="sticker-btn tone-yellow big hit absolute right-5 bottom-5" onClick={() => setViewing(nearId)}>
      <Icon name="camera" size={28} /> Look
    </button>
  )
}

export default function Hud() {
  const cam = useStore((s) => s.cam)
  const globe = useStore((s) => s.globe)
  const count = useStore((s) => (s.globe === 'toy' ? s.artworks.length : s.paper.added.length))
  const setOverlay = useStore((s) => s.setOverlay)
  const setDrawer = useStore((s) => s.setDrawer)
  const setHelp = useStore((s) => s.setHelp)
  const blocked = useStore((s) => !!s.viewing)
  const touch = useMemo(() => window.matchMedia?.('(pointer: coarse)').matches ?? false, [])
  const [full, setFull] = useState(false)
  useEffect(() => {
    const f = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }
  return (
    <>
      <button
        className="sticker absolute left-3 top-3 sm:left-4 sm:top-4 px-3.5 py-2 flex items-center gap-2.5 hit cursor-pointer"
        title="Back to the title screen" onClick={goHome}
      >
        <span className="font-display font-bold text-lg leading-none">{globe === 'toy' ? 'ARTDOBE' : VARIANTS[globe].name}</span>
        <span className="badge-dark" title="Drawings on the planet">{count}</span>
      </button>
      <div className="absolute right-3 top-3 sm:right-4 sm:top-4 flex flex-col gap-3">
        <IconBtn icon="globe" label="Planet view (G)" active={cam === 'globe'} onClick={togglePlanetView} />
        <IconBtn icon="frame" label={globe === 'toy' ? 'My drawings' : 'My stuff'} onClick={() => setDrawer(true)} />
        <IconBtn icon="plus" label="Add a drawing" onClick={() => setOverlay('upload')} />
        <IconBtn icon={full ? 'shrink' : 'expand'} label="Full screen" onClick={toggleFull} />
        <IconBtn icon="help" label="How to play" onClick={() => setHelp(true)} />
        <MusicButton />
      </div>
      <ZoneBanner />
      <Hint touch={touch} />
      <PromptPill />
      {touch && cam === 'walk' && !blocked && (
        <>
          <Joystick />
          <InteractButton />
        </>
      )}
    </>
  )
}
