import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'

export function SkyDome() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#1F3A4D') }, mid: { value: new THREE.Color('#8E7CC3') }, bot: { value: new THREE.Color('#F7B89A') } },
    vertexShader: 'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 top,mid,bot;varying vec3 p;void main(){float h=p.y;vec3 c=h>0.?mix(mid,top,smoothstep(0.,.8,h)):mix(mid,bot,smoothstep(0.,-.3,h));gl_FragColor=vec4(c,1.);}',
  }), [])
  const sun = useMemo(() => ({ top: new THREE.Color('#4a2c5a'), mid: new THREE.Color('#F7B89A'), bot: new THREE.Color('#F2B544') }), [])
  const day = useMemo(() => ({ top: new THREE.Color('#1F3A4D'), mid: new THREE.Color('#8E7CC3'), bot: new THREE.Color('#F7B89A') }), [])
  useFrame((_, dt) => {
    const f = useStore.getState().finale ? sun : day
    for (const k of ['top', 'mid', 'bot'] as const) mat.uniforms[k].value.lerp(f[k], 1 - Math.exp(-dt * 0.8))
  })
  return <mesh material={mat}><sphereGeometry args={[150, 24, 16]} /></mesh>
}

const COLORS = ['#F4E9D8', '#F7B89A', '#F2B544', '#8E7CC3']
export function PaperDrift({ count = 60 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const data = useMemo(() => Array.from({ length: count }, () => ({
    r: 6 + Math.random() * 22, a: Math.random() * 6.28, y: 1 + Math.random() * 14,
    sp: 0.02 + Math.random() * 0.06, rot: Math.random() * 6, s: 0.25 + Math.random() * 0.35,
  })), [count])
  const d = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    data.forEach((p, i) => {
      const a = p.a + t * p.sp
      d.position.set(Math.cos(a) * p.r, p.y + Math.sin(t * 0.6 + i) * 0.5, Math.sin(a) * p.r)
      d.rotation.set(t * 0.5 + p.rot, t * 0.3 + i, t * 0.4)
      d.scale.setScalar(p.s)
      d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix)
      ref.current.setColorAt(i, new THREE.Color(COLORS[i % 4]))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[1, 0.7]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  )
}
