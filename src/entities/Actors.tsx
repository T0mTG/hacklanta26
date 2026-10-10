import { forwardRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3, type Group } from 'three'
import { MAT } from '../world/materials'
import { basisQuat } from '../lib/sphere'
import { surfaceRadius } from '../world/terrain'
import type { Look } from './looks'
import { CAT, COW, DOG, DUCK, PERSON_PIVOTS, RABBIT, SHEEP, buildPerson, type Quad } from './models'

const _q = new Quaternion(), _p = new Vector3()

// Stand an object on the planet at `dir`, facing along `fwd`
export function placeOnPlanet(obj: Group, dir: Vector3, fwd: Vector3, radius?: number, lift = 0) {
  obj.position.copy(_p.copy(dir).multiplyScalar((radius ?? surfaceRadius(dir)) + lift))
  obj.quaternion.copy(basisQuat(dir, fwd, _q))
}

// ------------------------------------------------------------------ people
export type PersonMode = 'idle' | 'watch' | 'wave' | 'cheer' | 'sit' | 'sitwave' | 'work'
export interface PersonCtl { mode: PersonMode; speed: number; phase: number }
export const newPersonCtl = (): PersonCtl => ({ mode: 'idle', speed: 0, phase: 0 })

interface PersonProps { look: Look; ctl: PersonCtl; seed?: number; scale?: number }

// A chunky little person. The parent moves the group; this only poses the limbs from `ctl`.
export const Person = forwardRef<Group, PersonProps>(function Person({ look, ctl, seed = 1, scale = 1 }, ref) {
  const parts = useMemo(() => buildPerson(look), [look])
  const root = useRef<Group>(null), upper = useRef<Group>(null)
  const armL = useRef<Group>(null), armR = useRef<Group>(null), legL = useRef<Group>(null), legR = useRef<Group>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime + seed * 7.3
    const g = Math.min(1, ctl.speed / 0.8)
    const sw = Math.sin(ctl.phase)
    let lx = sw * 0.75 * g, rx = -sw * 0.75 * g
    let alx = -sw * 0.6 * g, arx = sw * 0.6 * g, alz = 0.06, arz = -0.06
    let bob = Math.abs(sw) * 0.035 * g, rootY = 0, pitch = 0, yaw = 0

    if (g < 0.1) {
      switch (ctl.mode) {
        case 'idle':
          alx = Math.sin(t * 1.3) * 0.05; arx = -alx
          yaw = Math.sin(t * 0.6) * 0.18
          break
        case 'watch': {
          const clapping = Math.sin(t * 0.37 + seed) > 0.94
          if (clapping) {
            const c = Math.sin(t * 22)
            alx = arx = -1.2; alz = -0.3 + c * 0.1; arz = 0.3 - c * 0.1
          } else {
            alx = arx = 0.3; alz = -0.05; arz = 0.05
            yaw = Math.sin(t * 0.5 + seed) * 0.1
          }
          break
        }
        case 'wave':
          arz = -2.5 + Math.sin(t * 9) * 0.35; alx = 0
          break
        case 'cheer':
          alz = 2.5 + Math.sin(t * 10) * 0.2; arz = -2.5 - Math.sin(t * 10) * 0.2
          lx = rx = 0; rootY = Math.abs(Math.sin(t * 8)) * 0.16
          break
        case 'sit':
          lx = rx = -1.5; rootY = -0.27; alx = arx = -0.5
          yaw = Math.sin(t * 0.5) * 0.15
          break
        case 'sitwave':
          lx = rx = -1.5; rootY = -0.27; alx = -0.5; arx = 0
          arz = -2.5 + Math.sin(t * 9) * 0.35
          break
        case 'work':
          pitch = 0.5; alx = arx = -0.9 + Math.sin(t * 2.4) * 0.15
          break
      }
    }
    if (ctl.mode === 'cheer') { alz = 2.5 + Math.sin(t * 10) * 0.2; arz = -2.5 - Math.sin(t * 10) * 0.2; rootY = Math.abs(Math.sin(t * 8)) * 0.16 }

    if (root.current) { root.current.position.y = rootY + bob; root.current.rotation.x = pitch }
    if (upper.current) upper.current.rotation.y = yaw
    if (legL.current) legL.current.rotation.x = lx
    if (legR.current) legR.current.rotation.x = rx
    armL.current?.rotation.set(alx, 0, alz)
    armR.current?.rotation.set(arx, 0, arz)
  })

  const [hx, hy, hz] = PERSON_PIVOTS.hip, [sx, sy, sz] = PERSON_PIVOTS.shoulder
  return (
    <group ref={ref} scale={scale}>
      <group ref={root}>
        <group ref={legL} position={[hx, hy, hz]}><mesh geometry={parts.leg.body} material={MAT.body} /></group>
        <group ref={legR} position={[-hx, hy, hz]}><mesh geometry={parts.leg.body} material={MAT.body} /></group>
        <group ref={upper}>
          <mesh geometry={parts.body.body} material={MAT.body} castShadow />
          <group ref={armL} position={[sx, sy, sz]}><mesh geometry={parts.arm.body} material={MAT.body} /></group>
          <group ref={armR} position={[-sx, sy, sz]}><mesh geometry={parts.arm.body} material={MAT.body} /></group>
        </group>
      </group>
    </group>
  )
})

// ------------------------------------------------------------------ animals
export type CritterKind = 'sheep' | 'cow' | 'cat' | 'dog' | 'rabbit' | 'duck' | 'duckling'
export interface CritterCtl { speed: number; phase: number; happy: number }
export const newCritterCtl = (): CritterCtl => ({ speed: 0, phase: 0, happy: 0 })

// How each animal moves: units per second, body size for bumping, leg cycle per unit, display scale
export const CRITTER_SPEC: Record<CritterKind, { walk: number; run?: number; radius: number; gait: number; scale: number; swim?: boolean }> = {
  sheep: { walk: 0.5, radius: 0.4, gait: 9, scale: 1 },
  cow: { walk: 0.45, radius: 0.55, gait: 8, scale: 1.05 },
  cat: { walk: 0.9, run: 2.6, radius: 0.2, gait: 12, scale: 1 },
  dog: { walk: 1.1, run: 2.8, radius: 0.3, gait: 10, scale: 1 },
  rabbit: { walk: 1.0, radius: 0.15, gait: 9, scale: 1 },
  duck: { walk: 0.5, radius: 0.2, gait: 5, scale: 1, swim: true },
  duckling: { walk: 0.45, radius: 0.15, gait: 6, scale: 0.6, swim: true },
}

function Quadruped({ q, ctl, seed }: { q: Quad; ctl: CritterCtl; seed: number }) {
  const root = useRef<Group>(null), a = useRef<Group>(null), b = useRef<Group>(null), tail = useRef<Group>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime + seed * 3.1
    const g = Math.min(1, ctl.speed / 0.6)
    const swing = Math.sin(ctl.phase) * q.stride * g
    if (a.current) a.current.rotation.x = swing
    if (b.current) b.current.rotation.x = -swing
    if (root.current) {
      root.current.position.y = Math.abs(Math.sin(ctl.phase)) * 0.025 * g + ctl.happy * Math.abs(Math.sin(t * 9)) * 0.08
      root.current.rotation.x = g < 0.1 ? Math.sin(t * 1.4) * 0.03 : 0
    }
    if (tail.current && q.tail) tail.current.rotation.y = Math.sin(t * (4 + ctl.happy * 9)) * q.tail.wag * (0.5 + ctl.happy)
  })
  return (
    <group ref={root}>
      <mesh geometry={q.body.body} material={MAT.body} castShadow />
      <group ref={a} position={[0, q.hip, 0]}><mesh geometry={q.legsA.body} material={MAT.body} /></group>
      <group ref={b} position={[0, q.hip, 0]}><mesh geometry={q.legsB.body} material={MAT.body} /></group>
      {q.tail && <group ref={tail} position={q.tail.pivot}><mesh geometry={q.tail.built.body} material={MAT.body} /></group>}
    </group>
  )
}

function Hopper({ ctl, seed }: { ctl: CritterCtl; seed: number }) {
  const root = useRef<Group>(null)
  const geo = RABBIT()
  useFrame((state) => {
    const t = state.clock.elapsedTime + seed
    const g = Math.min(1, ctl.speed / 0.7)
    const h = Math.abs(Math.sin(ctl.phase * 0.5))
    if (root.current) {
      root.current.position.y = h * 0.18 * g + ctl.happy * Math.abs(Math.sin(t * 8)) * 0.15
      root.current.rotation.x = Math.cos(ctl.phase * 0.5) * 0.28 * g
      root.current.scale.y = 1 + Math.sin(t * 3) * 0.012
    }
  })
  return <group ref={root}><mesh geometry={geo.body} material={MAT.body} castShadow /></group>
}

function Swimmer({ ctl, seed }: { ctl: CritterCtl; seed: number }) {
  const root = useRef<Group>(null)
  const geo = DUCK()
  useFrame((state) => {
    const t = state.clock.elapsedTime + seed * 2.3
    const g = Math.min(1, ctl.speed / 0.4)
    if (root.current) {
      root.current.position.y = Math.sin(t * 2.2) * 0.012
      root.current.rotation.z = Math.sin(t * 1.6) * 0.04
      root.current.rotation.x = Math.sin(ctl.phase) * 0.06 * g
    }
  })
  return <group ref={root}><mesh geometry={geo.body} material={MAT.body} castShadow /></group>
}

interface CritterProps { kind: CritterKind; ctl: CritterCtl; seed?: number }

export const Critter = forwardRef<Group, CritterProps>(function Critter({ kind, ctl, seed = 1 }, ref) {
  const scale = CRITTER_SPEC[kind].scale
  return (
    <group ref={ref} scale={scale}>
      {kind === 'sheep' && <Quadruped q={SHEEP()} ctl={ctl} seed={seed} />}
      {kind === 'cow' && <Quadruped q={COW()} ctl={ctl} seed={seed} />}
      {kind === 'cat' && <Quadruped q={CAT()} ctl={ctl} seed={seed} />}
      {kind === 'dog' && <Quadruped q={DOG()} ctl={ctl} seed={seed} />}
      {kind === 'rabbit' && <Hopper ctl={ctl} seed={seed} />}
      {(kind === 'duck' || kind === 'duckling') && <Swimmer ctl={ctl} seed={seed} />}
    </group>
  )
})
