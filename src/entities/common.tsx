import { Suspense, type ComponentProps, type MutableRefObject } from 'react'
import { Text as DText } from '@react-three/drei'
import * as THREE from 'three'
import type { Artwork } from '../data/types'

export const Txt = (p: ComponentProps<typeof DText>) => (
  <Suspense fallback={null}><DText font="/stamp.woff" {...p} /></Suspense>
)

export interface RoleProps { art: Artwork; rx: MutableRefObject<number>; seed: number }

export const fit = (aspect: number, maxW: number, maxH: number): [number, number] => {
  let w = maxW, h = w / aspect
  if (h > maxH) { h = maxH; w = h * aspect }
  return [w, h]
}

// Contain-fit artwork on a cardboard backing with a thin paper border (never cropped).
export function Art({ art, maxW, maxH, border = 0.07, paper = '#F4E9D8', thick = 0.06 }:
  { art: Artwork; maxW: number; maxH: number; border?: number; paper?: string; thick?: number }) {
  const [w, h] = fit(art.aspect, maxW, maxH)
  return (
    <group>
      <mesh><boxGeometry args={[w + border * 2, h + border * 2, thick]} /><meshToonMaterial color={paper} /></mesh>
      <mesh position={[0, 0, thick / 2 + 0.003]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={art.texture} toneMapped={false} transparent fog={false} />
      </mesh>
    </group>
  )
}

export function Eye({ x, y, z = 0.1 }: { x: number; y: number; z?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh><sphereGeometry args={[0.15, 12, 10]} /><meshToonMaterial color="#ffffff" /></mesh>
      <mesh position={[0.02, -0.01, 0.12]}><sphereGeometry args={[0.07, 10, 8]} /><meshBasicMaterial color="#1F3A4D" /></mesh>
    </group>
  )
}

const v = new THREE.Vector3()
// Rotate around Y so +Z faces the camera (flat art stays readable).
export function faceCam(g: THREE.Object3D, camera: THREE.Camera, k = 0.12, extra = 0) {
  g.getWorldPosition(v)
  const target = Math.atan2(camera.position.x - v.x, camera.position.z - v.z) + extra
  let d = target - g.rotation.y
  d = Math.atan2(Math.sin(d), Math.cos(d))
  g.rotation.y += d * k
}

export const easeOutBack = (x: number) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }
