import type React from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { Artwork, Role } from '../data/types'
import { easeOutBack, type RoleProps } from './common'
import { Billboard, Creature, Doll, House, Relic } from './roles'

const COMPONENTS: Record<Role, (p: RoleProps) => React.ReactElement> = {
  creature: Creature, billboard: Billboard, house: House, doll: Doll, relic: Relic,
}
const WANDERERS: Role[] = ['creature', 'doll']

export interface EntityProps { art: Artwork; pos: [number, number]; delay?: number; drop?: boolean; hero?: boolean }

export default function Entity({ art, pos, delay = 0, drop = false }: EntityProps) {
  const g = useRef<THREE.Group>(null!), burst = useRef<THREE.Group>(null!)
  const rx = useRef(0)
  const born = useRef<number | null>(null)
  const Comp = COMPONENTS[art.role]
  const facing = WANDERERS.includes(art.role) ? 0 : Math.atan2(-pos[0], -pos[1])
  const seed = useRef(Math.random()).current

  useFrame(({ clock }) => {
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
  })

  return (
    <group ref={g} position={[pos[0], 0, pos[1]]} visible={false}>
      <group rotation={[0, facing, 0]}><Comp art={art} rx={rx} seed={seed} /></group>
      <group ref={burst} visible={false}>
        <Sparkles count={36} scale={[4, 3, 4]} size={8} speed={1.2} color="#F2B544" position={[0, 1.5, 0]} />
      </group>
    </group>
  )
}
