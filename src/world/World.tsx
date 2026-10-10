import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sparkles } from '@react-three/drei'
import { Props } from './Props'
import { SkyDome, PaperDrift } from './Sky'

export const LITE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('lite')

export default function World() {
  return (
    <Canvas dpr={[1, LITE ? 1 : 1.5]} camera={{ position: [17, 11, 17], fov: 45 }}
      onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); location.reload() })}>
      <SkyDome />
      <fog attach="fog" args={['#8E7CC3', 40, 110]} />
      <hemisphereLight args={['#F7B89A', '#1F3A4D', 1.2]} />
      <directionalLight position={[-12, 10, 8]} intensity={2.2} color="#F7B89A" />
      <Suspense fallback={null}><Props lite={LITE} /></Suspense>
      <PaperDrift count={LITE ? 20 : 60} />
      <Sparkles count={LITE ? 20 : 60} scale={[28, 8, 28]} size={3} speed={0.3} color="#F2B544" position={[0, 4, 0]} />
      <OrbitControls enablePan={false} minDistance={8} maxDistance={40} maxPolarAngle={Math.PI / 2.1} minPolarAngle={0.3} target={[0, 1, 0]} />
    </Canvas>
  )
}
