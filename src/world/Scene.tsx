import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

// Phase 0 placeholder: a faceted green ball turning in front of the CSS sky. Phase 1 replaces it with the real planet.
function PlaceholderPlanet() {
  const ref = useRef<Mesh>(null)
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.25 })
  return (
    <mesh ref={ref} position={[0, -2, 0]}>
      <icosahedronGeometry args={[12, 2]} />
      <meshStandardMaterial color="#79c257" flatShading roughness={1} />
    </mesh>
  )
}

export default function Scene() {
  return (
    <div className="stage">
      <Canvas flat dpr={[1, 1.75]} camera={{ fov: 36, position: [0, 6, 62], near: 0.1, far: 500 }} gl={{ alpha: true, antialias: true }}>
        <hemisphereLight args={['#dff6ee', '#5a9a62', 1.4]} />
        <directionalLight position={[20, 24, 30]} intensity={2.4} />
        <PlaceholderPlanet />
      </Canvas>
    </div>
  )
}
