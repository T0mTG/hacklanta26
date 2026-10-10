import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { Artwork, Role } from '../data/types'
import { easeOutBack, type RoleProps } from './common'
import { Billboard, Creature, Doll, House, Relic } from './roles'
import { entityPos, useStore } from '../store'
import { QUOTES, pick } from '../lib/artwork'

const COMPONENTS: Record<Role, (p: RoleProps) => React.ReactElement> = {
  creature: Creature, billboard: Billboard, house: House, doll: Doll, relic: Relic,
}
const WANDERERS: Role[] = ['creature', 'doll']
const TOP: Record<Role, number> = { creature: 2.8, billboard: 5.2, house: 4.6, doll: 3.6, relic: 4.2 }
const LINES: Record<Role, () => string> = {
  creature: () => pick(['Hi, little guy!', 'Wheee!', ...QUOTES]),
  billboard: () => 'APPROVED*  (*by no one)',
  house: () => pick(['Welcome home!', 'The windows are on. Come in.', 'Nobody asked for revisions here.']),
  doll: () => pick(['*curtsies*', 'Oh! Hello!', ...QUOTES]),
  relic: () => pick(['v1 … v12 … FINAL_FINAL_v7', 'Version history: lovingly preserved.', ...QUOTES]),
}
const FX: Record<Role, string> = { creature: '#F7B89A', billboard: '#F2B544', house: '#F4E9D8', doll: '#F7B89A', relic: '#F2B544' }

export interface EntityProps {
  art: Artwork; pos: [number, number]; delay?: number; drop?: boolean
  idx: number; total: number; user?: boolean
}

export default function Entity({ art, pos, delay = 0, drop = false, idx, total, user }: EntityProps) {
  const g = useRef<THREE.Group>(null!), rg = useRef<THREE.Group>(null!)
  const burst = useRef<THREE.Group>(null!), fx = useRef<THREE.Group>(null!), ring = useRef<THREE.Mesh>(null!)
  const rx = useRef(0), clickT = useRef(-99), hov = useRef(false)
  const born = useRef<number | null>(null)
  const [bubble, setBubble] = useState<string | null>(null)
  const [hover, setHover] = useState(false)
  const Comp = COMPONENTS[art.role]
  const facing = WANDERERS.includes(art.role) ? 0 : Math.atan2(-pos[0], -pos[1])
  const seed = useRef(Math.random()).current
  const spin = useRef(0)

  useEffect(() => { entityPos[art.id] = pos; return () => { delete entityPos[art.id] } }, [art.id, pos])
  useEffect(() => { if (!bubble) return; const t = setTimeout(() => setBubble(null), 3200); return () => clearTimeout(t) }, [bubble])
  useEffect(() => () => { document.body.style.cursor = '' }, [])

  const onClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    const st = useStore.getState()
    clickT.current = performance.now() / 1000
    setBubble(LINES[art.role]())
    st.bump(); st.setFocus(art.id)
  }

  useFrame(({ clock }, dt) => {
    if (born.current === null) born.current = clock.elapsedTime
    const t = clock.elapsedTime - born.current - delay
    const G = g.current
    if (t < 0) { G.visible = false; return }
    G.visible = true
    if (drop) {
      const T = 1.1
      if (t < T) { G.position.y = 14 * (1 - (t / T) ** 2); G.scale.setScalar(1) }
      else {
        const s = Math.exp(-(t - T) * 5) * Math.sin((t - T) * 16) * 0.35
        G.position.y = 0; G.scale.set(1 + s, 1 - s, 1 + s)
      }
      burst.current.visible = t > T && t < T + 2.2
    } else {
      G.position.y = 0
      G.scale.setScalar(Math.max(0.001, easeOutBack(Math.min(1, t / 0.7))))
    }
    // gather for the finale, otherwise sit at home
    const fin = useStore.getState().finale
    const a = (idx / Math.max(1, total)) * Math.PI * 2, R = user ? 2.6 : 5
    const tx = fin ? Math.cos(a) * R : pos[0], tz = fin ? Math.sin(a) * R : pos[1]
    const k = 1 - Math.exp(-dt * 1.6)
    G.position.x += (tx - G.position.x) * (fin || Math.abs(G.position.x - tx) > 0.02 ? k : 1)
    G.position.z += (tz - G.position.z) * (fin || Math.abs(G.position.z - tz) > 0.02 ? k : 1)
    if (hov.current && t > 1.2) G.scale.multiplyScalar(1.05)

    // click reaction
    const rt = performance.now() / 1000 - clickT.current
    const R_ = rg.current
    rx.current = rt < 2.4 ? Math.max(0, 1 - rt / 2.4) : 0
    R_.rotation.y = 0; R_.position.y = 0; R_.scale.set(1, 1, 1)
    if (rt < 1.4) {
      const p = rt / 1.2
      const e = 1 - Math.pow(1 - Math.min(1, p), 3)
      if (art.role === 'creature') { R_.rotation.y = e * Math.PI * 2; R_.position.y = Math.sin(Math.min(1, p) * Math.PI) * 0.9 }
      else if (art.role === 'billboard') { R_.rotation.y = e * Math.PI * 2 }
      else if (art.role === 'house') { R_.position.y = Math.abs(Math.sin(rt * 9)) * 0.25 * Math.max(0, 1 - rt) }
      else if (art.role === 'doll') { R_.scale.y = 1 - Math.sin(Math.min(1, p) * Math.PI) * 0.14 }
      else { R_.position.y = Math.sin(Math.min(1, p) * Math.PI) * 0.5 }
    }
    fx.current.visible = rt < 1.6
    spin.current += dt
    ring.current.visible = hov.current
    ring.current.rotation.z = spin.current
  })

  return (
    <group ref={g} position={[pos[0], 0, pos[1]]} visible={false}
      onPointerOver={(e) => { e.stopPropagation(); hov.current = true; setHover(true); document.body.style.cursor = 'pointer'; useStore.getState().screen }}
      onPointerOut={() => { hov.current = false; setHover(false); document.body.style.cursor = '' }}
      onClick={onClick}>
      <group ref={rg}>
        <group rotation={[0, facing, 0]}><Comp art={art} rx={rx} seed={seed} /></group>
      </group>
      <mesh ref={ring} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[1.7, 1.95, 6]} /><meshBasicMaterial color="#F2B544" side={THREE.DoubleSide} />
      </mesh>
      <group ref={burst} visible={false}>
        <Sparkles count={36} scale={[4, 3, 4]} size={8} speed={1.2} color="#F2B544" position={[0, 1.5, 0]} />
      </group>
      <group ref={fx} visible={false}>
        <Sparkles count={18} scale={[3, 2.5, 3]} size={14} speed={2.5} color={FX[art.role]} position={[0, 1.8, 0]} />
      </group>
      {hover && !bubble && (
        <Html position={[0, TOP[art.role], 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="font-stamp text-xs bg-cream text-teal px-3 py-1.5 rounded shadow-lg border-2 border-teal" style={{ width: 210, whiteSpace: 'normal', textAlign: 'center' }}>{art.label}</div>
        </Html>
      )}
      {bubble && (
        <Html position={[0, TOP[art.role], 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div className="font-hand text-2xl bg-white text-teal px-4 py-2 rounded-2xl shadow-xl border-2 border-gold" style={{ width: 'max-content', maxWidth: 240, animation: 'pop .25s' }}>{bubble}</div>
        </Html>
      )}
    </group>
  )
}
