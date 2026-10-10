import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { Art, Eye, faceCam, fit, type RoleProps } from './common'

const toon = (c: string) => <meshToonMaterial color={c} />

/* ---------- Creature: logo critter that hop-walks on a loop ---------- */
export function Creature({ art, rx, seed }: RoleProps) {
  const g = useRef<THREE.Group>(null!), body = useRef<THREE.Group>(null!)
  const fl = useRef<THREE.Mesh>(null!), fr = useRef<THREE.Mesh>(null!)
  const [, h] = fit(art.aspect, 1.7, 1.7)
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime + seed * 10
    const a = t * 0.45, R = 1.3
    g.current.position.set(Math.cos(a) * R, 0, Math.sin(a) * R)
    const ph = Math.abs(Math.sin(t * 5))
    body.current.position.y = ph * 0.3
    body.current.scale.set(1 + (1 - ph) * 0.07, 1 - (1 - ph) * 0.09 + ph * 0.05, 1)
    fl.current.position.y = 0.1 + Math.max(0, Math.sin(t * 5)) * 0.1
    fr.current.position.y = 0.1 + Math.max(0, -Math.sin(t * 5)) * 0.1
    faceCam(g.current, camera)
    void rx
  })
  return (
    <group ref={g}>
      <group ref={body}>
        <group position={[0, 0.25 + h / 2, 0]}><Art art={art} maxW={1.7} maxH={1.7} /></group>
        <Eye x={-0.3} y={0.25 + h + 0.02} /><Eye x={0.3} y={0.25 + h + 0.02} />
        <mesh ref={fl} position={[-0.3, 0.1, 0.05]}><boxGeometry args={[0.28, 0.2, 0.34]} />{toon('#F2B544')}</mesh>
        <mesh ref={fr} position={[0.3, 0.1, 0.05]}><boxGeometry args={[0.28, 0.2, 0.34]} />{toon('#F2B544')}</mesh>
      </group>
    </group>
  )
}

/* ---------- Billboard: floating poster on two sticks ---------- */
export function Billboard({ art, seed }: RoleProps) {
  const g = useRef<THREE.Group>(null!)
  const [, h] = fit(art.aspect, 2.6, 3.4)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 7
    g.current.position.y = 0.2 + Math.sin(t * 1.2) * 0.18
    g.current.rotation.z = Math.sin(t * 0.8) * 0.05
    g.current.rotation.y = Math.sin(t * 0.4) * 0.45
  })
  return (
    <group ref={g}>
      <mesh position={[-0.6, 0.7, -0.06]}><boxGeometry args={[0.1, 1.4, 0.08]} />{toon('#8a5a3a')}</mesh>
      <mesh position={[0.6, 0.7, -0.06]}><boxGeometry args={[0.1, 1.4, 0.08]} />{toon('#8a5a3a')}</mesh>
      <group position={[0, 1.4 + h / 2, 0]}><Art art={art} maxW={2.6} maxH={3.4} thick={0.1} paper="#d9c3a0" /></group>
    </group>
  )
}

/* ---------- House: UI becomes a cozy building with lit windows ---------- */
export function House({ art, rx, seed }: RoleProps) {
  const [w, h] = fit(art.aspect, 2.8, 2.2)
  const win1 = useRef<THREE.MeshBasicMaterial>(null!), win2 = useRef<THREE.MeshBasicMaterial>(null!)
  const smoke = useRef<THREE.Group>(null!), door = useRef<THREE.Group>(null!), npc = useRef<THREE.Group>(null!)
  const bw = w + 0.3, bh = h + 0.3, D = 2
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 5
    const f = 0.8 + Math.sin(t * 7) * 0.1 + Math.sin(t * 13.3) * 0.1
    win1.current.color.setRGB(1 * f, 0.72 * f, 0.27 * f)
    win2.current.color.setRGB(1 * (1.7 - f), 0.72 * (1.7 - f), 0.27 * (1.7 - f))
    smoke.current.children.forEach((c, i) => {
      const p = (t * 0.35 + i / 3) % 1
      c.position.set(Math.sin(p * 6 + i) * 0.15, p * 1.4, 0)
      c.scale.setScalar(0.12 + p * 0.25)
      ;(c as THREE.Mesh).visible = true
    })
    door.current.rotation.y = -rx.current * 1.4
    npc.current.position.y = bh + 1.0 + rx.current * 0.5
    npc.current.visible = rx.current > 0.02
    npc.current.rotation.z = Math.sin(t * 14) * 0.3 * rx.current
  })
  return (
    <group>
      <mesh position={[0, bh / 2, 0]}><boxGeometry args={[bw, bh, D]} />{toon('#F4E9D8')}</mesh>
      <group position={[0, bh / 2, D / 2 + 0.01]}><Art art={art} maxW={2.8} maxH={2.2} thick={0.02} border={0.05} /></group>
      <mesh position={[0, bh + 0.55, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[Math.max(bw, D) * 0.78, 1.1, 4]} />{toon('#C7392F')}
      </mesh>
      <mesh position={[bw / 3, bh + 0.7, -0.3]}><boxGeometry args={[0.3, 0.7, 0.3]} />{toon('#8a5a3a')}</mesh>
      <group ref={smoke} position={[bw / 3, bh + 1.1, -0.3]}>
        {[0, 1, 2].map((i) => <mesh key={i}><sphereGeometry args={[1, 8, 8]} /><meshBasicMaterial color="#F4E9D8" transparent opacity={0.7} /></mesh>)}
      </group>
      {/* side windows + door */}
      <mesh position={[bw / 2 + 0.01, bh * 0.62, 0.3]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.5, 0.5]} /><meshBasicMaterial ref={win1} color="#F2B544" /></mesh>
      <mesh position={[-bw / 2 - 0.01, bh * 0.62, 0.3]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.5, 0.5]} /><meshBasicMaterial ref={win2} color="#F2B544" /></mesh>
      <group ref={door} position={[bw / 2 + 0.02, 0, -0.5]}>
        <mesh position={[0, 0.45, 0.3]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.6, 0.9]} />{toon('#8a5a3a')}</mesh>
      </group>
      <group ref={npc} position={[0, bh + 1, 0]} visible={false}>
        <mesh><sphereGeometry args={[0.22, 10, 8]} />{toon('#F7B89A')}</mesh>
        <mesh position={[0.28, 0.05, 0]}><boxGeometry args={[0.3, 0.08, 0.08]} />{toon('#F7B89A')}</mesh>
      </group>
    </group>
  )
}

/* ---------- Paper Doll: illustration with swinging limbs ---------- */
export function Doll({ art, rx, seed }: RoleProps) {
  const g = useRef<THREE.Group>(null!), body = useRef<THREE.Group>(null!)
  const armL = useRef<THREE.Group>(null!), armR = useRef<THREE.Group>(null!)
  const legL = useRef<THREE.Group>(null!), legR = useRef<THREE.Group>(null!)
  const [w, h] = fit(art.aspect, 1.5, 2.1)
  const leg = 0.75
  useFrame(({ clock, camera, pointer }) => {
    const t = clock.elapsedTime + seed * 9
    const a = -t * 0.35, R = 1.4
    g.current.position.set(Math.cos(a) * R, 0, Math.sin(a) * R)
    const s = Math.sin(t * 4.5)
    legL.current.rotation.x = s * 0.6; legR.current.rotation.x = -s * 0.6
    armL.current.rotation.z = -0.25 - s * 0.45
    armR.current.rotation.z = 0.25 - s * 0.45 + rx.current * (2.2 + Math.sin(t * 16) * 0.4)
    body.current.position.y = Math.abs(s) * 0.07
    body.current.rotation.z = Math.sin(t * 2.25) * 0.04
    faceCam(g.current, camera, 0.1, pointer.x * 0.5)
  })
  return (
    <group ref={g}>
      <group ref={body}>
        <group ref={legL} position={[-0.25, leg, 0]}><mesh position={[0, -leg / 2, 0]}><boxGeometry args={[0.16, leg, 0.08]} />{toon('#1F3A4D')}</mesh></group>
        <group ref={legR} position={[0.25, leg, 0]}><mesh position={[0, -leg / 2, 0]}><boxGeometry args={[0.16, leg, 0.08]} />{toon('#1F3A4D')}</mesh></group>
        <group ref={armL} position={[-w / 2 - 0.1, leg + h - 0.2, 0]}><mesh position={[0, -0.35, 0]}><boxGeometry args={[0.14, 0.7, 0.08]} />{toon('#F7B89A')}</mesh></group>
        <group ref={armR} position={[w / 2 + 0.1, leg + h - 0.2, 0]}><mesh position={[0, -0.35, 0]}><boxGeometry args={[0.14, 0.7, 0.08]} />{toon('#F7B89A')}</mesh></group>
        <group position={[0, leg + h / 2, 0]}><Art art={art} maxW={1.5} maxH={2.1} /></group>
      </group>
    </group>
  )
}

/* ---------- Relic: draft in a glowing frame on a pedestal ---------- */
export function Relic({ art, rx, seed }: RoleProps) {
  const fr = useRef<THREE.Group>(null!), glow = useRef<THREE.MeshBasicMaterial>(null!)
  const [, h] = fit(art.aspect, 1.8, 1.8)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 3
    fr.current.rotation.y = t * 0.7
    fr.current.position.y = 1.5 + h / 2 + Math.sin(t * 1.5) * 0.12
    glow.current.opacity = 0.18 + rx.current * 0.5 + Math.sin(t * 2) * 0.05
  })
  return (
    <group>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.55, 0.75, 1, 16]} />{toon('#d8cfc0')}</mesh>
      <group ref={fr}>
        <Art art={art} maxW={1.8} maxH={1.8} paper="#F2B544" border={0.14} thick={0.1} />
        <mesh position={[0, 0, -0.08]}><circleGeometry args={[1.5, 24]} /><meshBasicMaterial ref={glow} color="#F2B544" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      </group>
      <Sparkles count={14} scale={[2.4, 2.4, 2.4]} size={4} speed={0.6} color="#F2B544" position={[0, 2.2, 0]} />
    </group>
  )
}
