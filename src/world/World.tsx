import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OC } from 'three-stdlib'
import { Props } from './Props'
import { SkyDome, PaperDrift } from './Sky'
import Entities from '../entities/Entities'
import { entityPos, useStore } from '../store'
import { DEMOS, makeArtwork } from '../lib/artwork'

export const LITE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lite')
const HOME = new THREE.Vector3(17, 11, 17)
const FINALE_CAM = new THREE.Vector3(0, 15, 30)
const INTRO_SECS = 3

/* Cinematic dive in, focus-on-click dolly, finale pull-back. Releases the camera to OrbitControls when done. */
function CameraRig() {
  const ctl = useRef<OC>(null!)
  const t0 = useRef<number | null>(null)
  const goal = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3; until: number } | null>(null)
  const lastFocus = useRef(-1)
  const fin = useRef(false)
  const introDone = useRef(false)

  useFrame(({ clock, camera }, dt) => {
    const c = ctl.current
    if (!c) return
    const now = clock.elapsedTime
    if (t0.current === null) { t0.current = now; camera.position.set(0, 46, 36) }
    const st = useStore.getState()
    const since = now - t0.current
    if (since < INTRO_SECS) {
      const e = 1 - Math.pow(1 - since / INTRO_SECS, 3)
      camera.position.lerpVectors(new THREE.Vector3(0, 46, 36), HOME, e)
      c.target.set(0, 1, 0); c.enabled = false; c.update(); return
    }
    if (!introDone.current) { introDone.current = true; c.enabled = true }

    const focusTo = (id: string, secs: number) => {
      const p = entityPos[id]; if (!p) return
      const tgt = new THREE.Vector3(p[0], 1.4, p[1])
      const dir = camera.position.clone().sub(c.target).normalize()
      goal.current = { tgt, pos: tgt.clone().add(dir.multiplyScalar(11)), until: now + secs }
    }
    if (st.finale && !fin.current) { fin.current = true; goal.current = { tgt: new THREE.Vector3(0, 2, 0), pos: FINALE_CAM.clone(), until: now + 4 } }
    if (!st.finale && fin.current) { fin.current = false; goal.current = { tgt: new THREE.Vector3(0, 1, 0), pos: HOME.clone(), until: now + 2.5 } }
    if (st.focusN !== lastFocus.current) {
      lastFocus.current = st.focusN
      if (st.focusId && !st.finale) focusTo(st.focusId, since < INTRO_SECS + 2 ? 2.6 : 1.8)
    }
    const g = goal.current
    if (g) {
      const k = 1 - Math.exp(-dt * 2.2)
      camera.position.lerp(g.pos, k); c.target.lerp(g.tgt, k)
      c.update()
      if (now > g.until) goal.current = null
    }
  })
  return <OrbitControls ref={ctl as never} makeDefault enablePan={false} minDistance={6} maxDistance={42} maxPolarAngle={Math.PI / 2.1} minPolarAngle={0.3} target={[0, 1, 0]} />
}

function Lighting() {
  const hemi = useRef<THREE.HemisphereLight>(null!), sun = useRef<THREE.DirectionalLight>(null!), fog = useRef<THREE.Fog>(null!)
  const day = useRef({ h: new THREE.Color('#F7B89A'), s: new THREE.Color('#F7B89A'), f: new THREE.Color('#8E7CC3') }).current
  const dusk = useRef({ h: new THREE.Color('#F2B544'), s: new THREE.Color('#ff9a5a'), f: new THREE.Color('#d88a8a') }).current
  useFrame((state, dt) => {
    const fin = useStore.getState().finale, T = fin ? dusk : day, k = 1 - Math.exp(-dt * 0.8)
    hemi.current.color.lerp(T.h, k); sun.current.color.lerp(T.s, k); fog.current.color.lerp(T.f, k)
    sun.current.intensity += ((fin ? 3 : 2.2) - sun.current.intensity) * k
    sun.current.position.y += ((fin ? 3 : 10) - sun.current.position.y) * k
    void state
  })
  return (
    <>
      <fog ref={fog} attach="fog" args={['#8E7CC3', 40, 110]} />
      <hemisphereLight ref={hemi} args={['#F7B89A', '#1F3A4D', 1.2]} />
      <directionalLight ref={sun} position={[-12, 10, 8]} intensity={2.2} color="#F7B89A" />
    </>
  )
}

function Fireflies() {
  const fin = useStore((s) => s.finale)
  if (!fin) return null
  return <Sparkles count={LITE ? 40 : 120} scale={[20, 9, 20]} size={7} speed={0.5} color="#F2B544" position={[0, 4, 0]} />
}

function Caption() {
  const last = useStore((s) => s.artworks[s.artworks.length - 1])
  const [shown, setShown] = useState<string | null>(null)
  useEffect(() => {
    if (!last) return
    setShown(null)
    const a = setTimeout(() => setShown(last.name), 3000)
    const b = setTimeout(() => setShown(null), 9500)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [last])
  if (!shown) return null
  return (
    <div className="absolute top-8 left-0 right-0 text-center pointer-events-none" style={{ animation: 'pop .6s' }}>
      <p className="font-hand text-4xl md:text-5xl text-cream drop-shadow-lg">Welcome to the afterlife, <span className="text-gold">{shown}</span></p>
    </div>
  )
}

const FINALE_AT = 8
function HUD() {
  const { artworks, interactions, finale, setFinale, go, addArtwork, setFocus } = useStore()
  const rehomed = 6 + artworks.length
  const [hint, setHint] = useState(true)
  useEffect(() => { const t = setTimeout(() => setHint(false), 12000); return () => clearTimeout(t) }, [])
  useEffect(() => {
    if (interactions >= FINALE_AT && !finale) { const t = setTimeout(() => setFinale(true), 2200); return () => clearTimeout(t) }
  }, [interactions, finale, setFinale])
  useEffect(() => {
    const k = async (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'f') setFinale(!useStore.getState().finale)
      if (key === 'd') {
        const d = DEMOS[Math.floor(Math.random() * DEMOS.length)]
        const a = await makeArtwork(d.url, d.name); addArtwork(a); setFocus(a.id)
      }
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [setFinale, addArtwork, setFocus])
  return (
    <>
      <div className="absolute top-4 left-4 font-stamp text-sm bg-teal/80 border-2 border-lav rounded px-3 py-2 pointer-events-none">
        Darlings rehomed: <b className="text-gold">{rehomed}</b> · Hellos: <b className="text-gold">{interactions}</b>
      </div>
      {hint && !finale && <div className="absolute bottom-20 left-0 right-0 text-center font-hand text-3xl text-cream pointer-events-none" style={{ animation: 'pop .6s' }}>Drag to look around · click anything to say hello</div>}
      {!finale && (
        <div className="absolute bottom-5 left-5 right-5 flex justify-between">
          <button className="btn !text-base" onClick={() => go('upload')}>Upload another</button>
          <button className="btn !text-base" onClick={() => setFinale(true)}>Close your eyes</button>
        </div>
      )}
      {finale && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 pointer-events-none">
          <p className="font-hand text-5xl md:text-6xl text-cream text-center max-w-3xl drop-shadow-xl" style={{ animation: 'pop 2s 3s both' }}>
            It wasn't worthless. It just needed a different home.
          </p>
          <p className="font-stamp text-peach mt-4 text-center" style={{ animation: 'pop 2s 5s both' }}>
            Adobe gives creators tools to make things. This celebrates the things creators make even when nobody chooses them.
          </p>
          <div className="mt-6 flex gap-4 pointer-events-auto" style={{ animation: 'pop 1s 6s both' }}>
            <button className="btn" onClick={() => { setFinale(false); go('upload') }}>Upload another</button>
            <button className="btn" onClick={() => setFinale(false)}>Stay a while</button>
          </div>
        </div>
      )}
    </>
  )
}

export default function World() {
  return (
    <div className="relative h-full">
      <Canvas dpr={[1, LITE ? 1 : 1.5]} camera={{ position: [0, 46, 36], fov: 45 }}
        onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); location.reload() })}>
        <SkyDome />
        <Lighting />
        <Suspense fallback={null}><Props lite={LITE} /></Suspense>
        <Entities lite={LITE} />
        <PaperDrift count={LITE ? 20 : 60} />
        <Sparkles count={LITE ? 20 : 60} scale={[28, 8, 28]} size={3} speed={0.3} color="#F2B544" position={[0, 4, 0]} />
        <Fireflies />
        <CameraRig />
      </Canvas>
      <Caption />
      <HUD />
    </div>
  )
}
