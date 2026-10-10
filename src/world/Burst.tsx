import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, MeshBasicMaterial, OctahedronGeometry, Quaternion, Vector3 } from 'three'

interface Particle { p: Vector3; v: Vector3; up: Vector3; life: number; max: number; size: number; color: Color }
const MAX = 120
const live: Particle[] = []

// Confetti stars: `up` is the local up at the spot, so the burst climbs away from the ground and falls back down
export function emitBurst(at: Vector3, up: Vector3, colors: string[], n = 22) {
  for (let i = 0; i < n && live.length < MAX; i++) {
    const side = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
    side.addScaledVector(up, -side.dot(up)).normalize().multiplyScalar(0.8 + Math.random() * 2.2)
    live.push({
      p: at.clone(), v: side.addScaledVector(up, 2.5 + Math.random() * 3), up: up.clone(),
      life: 0, max: 0.8 + Math.random() * 0.6, size: 0.7 + Math.random() * 0.8, color: new Color(colors[i % colors.length]),
    })
  }
}

const m = new Matrix4(), q = new Quaternion(), s = new Vector3(), zero = new Matrix4().makeScale(0, 0, 0)

export default function Bursts() {
  const mesh = useMemo(() => {
    const im = new InstancedMesh(new OctahedronGeometry(0.09), new MeshBasicMaterial(), MAX)
    im.frustumCulled = false
    for (let i = 0; i < MAX; i++) { im.setMatrixAt(i, zero); im.setColorAt(i, new Color('#ffffff')) }
    return im
  }, [])
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i]
      p.life += dt
      if (p.life >= p.max) { live.splice(i, 1); continue }
      p.v.addScaledVector(p.up, -7 * dt)
      p.p.addScaledVector(p.v, dt)
    }
    for (let i = 0; i < MAX; i++) {
      const p = live[i]
      if (!p) { mesh.setMatrixAt(i, zero); continue }
      const k = 1 - p.life / p.max
      s.setScalar(p.size * Math.pow(k, 0.6))
      q.setFromAxisAngle(p.up, p.life * 6)
      mesh.setMatrixAt(i, m.compose(p.p, q, s))
      mesh.setColorAt(i, p.color)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return <primitive object={mesh} />
}
