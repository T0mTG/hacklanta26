import { Text as DText } from '@react-three/drei'
import { Suspense, type ComponentProps } from 'react'
const Text = (p: ComponentProps<typeof DText>) => <Suspense fallback={null}><DText font="/stamp.woff" {...p} /></Suspense>
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

const T = ({ c }: { c: string }) => <meshToonMaterial color={c} />

export function Island() {
  return (
    <group>
      <mesh position={[0, -0.5, 0]}><cylinderGeometry args={[15, 14.6, 1, 48]} /><T c="#9ccf8f" /></mesh>
      <mesh position={[0, -1.4, 0]}><cylinderGeometry args={[14.6, 12, 1, 48]} /><T c="#C9A27A" /></mesh>
      <mesh position={[0, -2.9, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[12, 3, 48]} /><T c="#a07c58" /></mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[14.4, 15, 64]} /><meshBasicMaterial color="#F4E9D8" /></mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3.2, 48]} /><T c="#F4E9D8" /></mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3.0, 3.2, 48]} /><meshBasicMaterial color="#F2B544" /></mesh>
    </group>
  )
}

function Tomb({ x, z, ry, text }: { x: number; z: number; ry: number; text: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.9, 1, 0.2]} /><T c="#d8cfc0" /></mesh>
      <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.45, 0.45, 0.2, 16]} /><T c="#d8cfc0" /></mesh>
      <Text position={[0, 0.6, 0.12]} fontSize={0.13} maxWidth={0.7} color="#1F3A4D" textAlign="center">{text}</Text>
    </group>
  )
}

export function MemorialWall() {
  const eps = ['RIP v1', 'Maybe next quarter.', 'FINAL_FINAL_v7', 'Make it pop.', 'Bigger logo?', 'Loved it. Start over.']
  return (
    <group>
      {eps.map((e, i) => {
        const a = Math.PI * (1.15 + i * 0.14)
        // face inward toward center
        return <Tomb key={i} x={Math.cos(a) * 11.5} z={Math.sin(a) * 11.5} ry={Math.atan2(-Math.cos(a), -Math.sin(a))} text={e} />
      })}
      <pointLight position={[0, 2, -9]} color="#F2B544" intensity={30} distance={10} />
      <Text position={[0, 3.4, -12.5]} fontSize={0.5} color="#F4E9D8" outlineWidth={0.02} outlineColor="#1F3A4D">Here lie 1,204 unused concepts</Text>
    </group>
  )
}

export function FolderStack() {
  const cs = ['#F2B544', '#F7B89A', '#F4E9D8', '#8E7CC3']
  return (
    <group position={[9, 0, 6]} rotation={[0, 0.3, 0.12]}>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[0, 0.1 + i * 0.13, 0]} rotation={[0, Math.sin(i * 2.3) * 0.25, 0]}>
          <boxGeometry args={[1.6, 0.12, 1.1]} /><T c={cs[i % 4]} />
        </mesh>
      ))}
      <Text position={[0, 2.1, 0.6]} fontSize={0.22} color="#F4E9D8" outlineWidth={0.015} outlineColor="#1F3A4D">FINAL_FINAL_v7</Text>
    </group>
  )
}

export function StampPile() {
  return (
    <group position={[-8.5, 0, 7]}>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[Math.sin(i * 2) * 0.3, 0.5 * i + 0.25, Math.cos(i * 2) * 0.2]}>
          <mesh><boxGeometry args={[0.8, 0.5, 0.8]} /><T c="#C7392F" /></mesh>
          <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.12, 0.18, 0.4, 10]} /><T c="#8a5a3a" /></mesh>
        </group>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.6) * 1.1, 0.2, Math.sin(i * 1.6) * 1.1]}>
          <sphereGeometry args={[0.16, 8, 8]} /><T c={['#F7B89A', '#F2B544', '#8E7CC3', '#F4E9D8'][i]} />
        </mesh>
      ))}
    </group>
  )
}

export function Mug({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.3, 0.26, 0.6, 14]} /><T c="#F4E9D8" /></mesh>
      <mesh position={[0.34, 0.3, 0]}><torusGeometry args={[0.13, 0.04, 6, 12]} /><T c="#F4E9D8" /></mesh>
    </group>
  )
}

export function Duck({ x, z }: { x: number; z: number }) {
  const r = useRef<THREE.Group>(null!)
  useFrame(({ clock }) => { r.current.rotation.z = Math.sin(clock.elapsedTime * 2) * 0.08 })
  return (
    <group ref={r} position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.3, 12, 10]} /><T c="#F2B544" /></mesh>
      <mesh position={[0.15, 0.62, 0]}><sphereGeometry args={[0.2, 12, 10]} /><T c="#F2B544" /></mesh>
      <mesh position={[0.35, 0.6, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.07, 0.18, 8]} /><T c="#F7B89A" /></mesh>
    </group>
  )
}

export function Sign() {
  return (
    <group position={[-4, 0, 11]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.8, 0]}><boxGeometry args={[0.12, 1.6, 0.12]} /><T c="#8a5a3a" /></mesh>
      <mesh position={[0, 1.6, 0.1]}><boxGeometry args={[2, 0.8, 0.1]} /><T c="#F4E9D8" /></mesh>
      <Text position={[0, 1.6, 0.17]} fontSize={0.2} maxWidth={1.8} color="#1F3A4D" textAlign="center">No feedback past this point.</Text>
    </group>
  )
}

export function CompostBin() {
  return (
    <group position={[11, 0, -3]} rotation={[0, -1.2, 0]}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.4, 1, 1]} /><T c="#6d8f7a" /></mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} position={[(i - 2) * 0.28, 1.1 + (i % 2) * 0.15, 0]}>
          <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.02, 0.02, 0.3, 5]} /><T c="#4d7a4d" /></mesh>
          <mesh><sphereGeometry args={[0.13, 8, 8]} /><T c={['#F7B89A', '#F2B544', '#C7392F', '#8E7CC3', '#F4E9D8'][i]} /></mesh>
        </group>
      ))}
      <Text position={[0, 0.55, 0.52]} fontSize={0.14} color="#F4E9D8">Client Feedback Compost</Text>
    </group>
  )
}

export function Props({ lite }: { lite?: boolean }) {
  return (
    <>
      <Island />
      <MemorialWall />
      <FolderStack />
      <StampPile />
      <Sign />
      <CompostBin />
      <Mug x={-10} z={-5} />
      {!lite && <><Mug x={8} z={-9} /><Duck x={5.5} z={9.5} /><Duck x={-12} z={1} /></>}
    </>
  )
}
