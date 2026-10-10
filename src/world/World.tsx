import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import { Props } from './Props'
import { SkyDome, PaperDrift } from './Sky'
import Entities from '../entities/Entities'
import { useStore } from '../store'

export const LITE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lite')

function Caption() {
  const last = useStore((s) => s.artworks[s.artworks.length - 1])
  const [shown, setShown] = useState<string | null>(null)
  useEffect(() => {
    if (!last) return
    setShown(last.name)
    const t = setTimeout(() => setShown(null), 6500)
    return () => clearTimeout(t)
  }, [last])
  if (!shown) return null
  return (
    <div className="absolute top-8 left-0 right-0 text-center pointer-events-none" style={{ animation: 'pop .6s' }}>
      <p className="font-hand text-4xl md:text-5xl text-cream drop-shadow-lg">Welcome to the afterlife, <span className="text-gold">{shown}</span></p>
    </div>
  )
}

export default function World() {
  return (
    <div className="relative h-full">
      <Canvas dpr={[1, LITE ? 1 : 1.5]} camera={{ position: [17, 11, 17], fov: 45 }}
        onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); location.reload() })}>
        <SkyDome />
        <fog attach="fog" args={['#8E7CC3', 40, 110]} />
        <hemisphereLight args={['#F7B89A', '#1F3A4D', 1.2]} />
        <directionalLight position={[-12, 10, 8]} intensity={2.2} color="#F7B89A" />
        <Suspense fallback={null}><Props lite={LITE} /></Suspense>
        <Entities lite={LITE} />
        <PaperDrift count={LITE ? 20 : 60} />
        <Sparkles count={LITE ? 20 : 60} scale={[28, 8, 28]} size={3} speed={0.3} color="#F2B544" position={[0, 4, 0]} />
        <OrbitControls enablePan={false} minDistance={8} maxDistance={40} maxPolarAngle={Math.PI / 2.1} minPolarAngle={0.3} target={[0, 1, 0]} />
      </Canvas>
      <Caption />
    </div>
  )
}
