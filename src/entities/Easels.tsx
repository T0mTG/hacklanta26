import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from 'three'
import type { Artwork } from '../data/types'
import { Kit, P, type Built } from '../lib/kit'
import { clamp, damp } from '../lib/rng'
import { useArtTexture } from '../lib/textures'
import { useStore } from '../store'
import { emitBurst } from '../world/Burst'
import { dynamicObstacles } from '../world/collide'
import { MAT } from '../world/materials'
import { frameFor } from '../world/place'
import { facing, view } from '../world/rig'
import { surfaceRadius } from '../world/terrain'
import { hashString } from './looks'
import { BOARD_FIT, EASEL, NOTE_SPOTS } from './models'
import { easels, rtFor } from './registry'

const _q = new Quaternion(), _p = new Vector3()

// a small bobbing gem in the drawing's main color, so easels can be spotted from far away
const gems = new Map<string, Built>()
function gemFor(color: string) {
  let g = gems.get(color)
  if (!g) {
    g = new Kit(hashString(color)).add(P.octa(0.15), color, { s: [1, 1.35, 1], outline: 0.035, shade: 0.1 }).build()
    gems.set(color, g)
  }
  return g
}

const FALL = 0.9 // seconds from the sky to the ground

function Easel({ art }: { art: Artwork }) {
  const rt = useMemo(() => rtFor(art), [art.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const root = useRef<Group>(null), body = useRef<Group>(null), ring = useRef<Mesh>(null), gem = useRef<Group>(null)
  const parts = EASEL()
  const gemParts = gemFor(art.palette[0] ?? '#f2c14e')
  const seed = useMemo(() => hashString(art.id) % 100, [art.id])

  const tex = useArtTexture(art)
  const mat = useMemo(() => new MeshBasicMaterial({ map: tex, toneMapped: false }), [tex])
  const plane = useMemo(() => {
    // contain-fit: never cropped, always inside the paper border
    const a = art.aspect
    const w = a >= BOARD_FIT.w / BOARD_FIT.h ? BOARD_FIT.w : BOARD_FIT.h * a
    return new PlaneGeometry(w, w / a)
  }, [art.aspect])
  const ringMat = useMemo(() => new MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.85, depthWrite: false }), [])

  // a freshly uploaded easel waits for the camera to arrive, then falls out of the sky
  useMemo(() => {
    const s = useStore.getState()
    if (s.spawn === art.id && !rt.landedAt) {
      rt.spawnAt = performance.now() + s.spawnDelay * 1000
      rt.lift = 16
    }
  }, [art.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    dynamicObstacles.set(art.id, { d: rt.dir, r: 0.75 })
    return () => { easels.delete(art.id); dynamicObstacles.delete(art.id) }
  }, [art.id, rt])

  useFrame((state, delta) => {
    const g = root.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    const now = performance.now()
    let squash = 0

    if (rt.spawnAt && !rt.landedAt) {
      if (now < rt.spawnAt) { g.visible = false; return } // still waiting for the camera
      const t = (now - rt.spawnAt) / 1000
      if (t < FALL) rt.lift = 16 * (1 - (t / FALL) ** 2)
      else {
        rt.lift = 0
        rt.landedAt = now
        rt.cheerUntil = now + 2600
        const up = rt.dir
        emitBurst(_p.copy(up).multiplyScalar(surfaceRadius(up) + 0.3), up, art.palette.length ? art.palette : ['#f2c14e', '#f6a6b8', '#9ad4f5'], 26)
        if (useStore.getState().spawn === art.id) useStore.getState().setSpawn(null)
      }
    } else {
      rt.lift = damp(rt.lift, rt.dragging ? 0.5 + Math.sin(now / 130) * 0.05 : 0, 14, dt)
    }

    const vis = facing(rt.dir, 0.05)
    g.visible = vis
    if (!vis) return

    const age = rt.landedAt ? (now - rt.landedAt) / 1000 : 9
    if (age < 0.8) squash = Math.sin(age * 18) * Math.exp(-age * 6) * 0.3

    g.position.copy(_p.copy(rt.dir).multiplyScalar(surfaceRadius(rt.dir) + rt.lift))
    g.quaternion.copy(frameFor(rt.dir, rt.yaw, _q))

    // small when idle, perks up when the kid is near, lifts when held
    rt.scale = damp(rt.scale, rt.dragging ? 1.12 : rt.near ? 1.18 : rt.hover ? 1.06 : 0.85, 9, dt)
    body.current?.scale.set(rt.scale * (1 + squash * 0.6), rt.scale * (1 - squash), rt.scale * (1 + squash * 0.6))

    const show = rt.near || rt.dragging || rt.hover
    if (ring.current) {
      ring.current.visible = show
      ring.current.scale.setScalar(1 + Math.sin(now / 260) * 0.06)
    }
    if (gem.current) {
      const dist = view.camera ? view.camera.position.distanceTo(g.position) : 20
      gem.current.position.y = 2.15 * rt.scale + Math.sin(now / 420 + seed) * 0.08
      gem.current.rotation.y += dt * 1.4
      gem.current.scale.setScalar(clamp(dist / 20, 1, 2.8))
    }
    rt.top.copy(rt.dir).multiplyScalar(surfaceRadius(rt.dir) + rt.lift + 2.5 * rt.scale)
  })

  return (
    <group ref={root} visible={false}>
      <group ref={body}>
        <mesh geometry={parts.frame.body} material={MAT.body} castShadow receiveShadow />
        <group position={[0, 0.78, 0.04]} rotation={[-0.14, 0, 0]}>
          <mesh geometry={parts.board.body} material={MAT.body} castShadow />
          {parts.board.hull && <mesh geometry={parts.board.hull} material={MAT.hull} />}
          <mesh geometry={plane} material={mat} position={[0, 0, 0.022]} />
          <mesh geometry={plane} material={mat} position={[0, 0, -0.022]} rotation={[0, Math.PI, 0]} />
          {art.notes.slice(-6).map((n, i) => (
            <mesh key={n.id} position={[NOTE_SPOTS[i][0], NOTE_SPOTS[i][1], 0.03]} rotation={[0, 0, NOTE_SPOTS[i][2]]}>
              <boxGeometry args={[0.15, 0.15, 0.012]} />
              <meshBasicMaterial color={n.color} />
            </mesh>
          ))}
        </group>
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={ringMat} visible={false}>
          <ringGeometry args={[0.85, 1.0, 28]} />
        </mesh>
      </group>
      <group ref={gem}>
        <mesh geometry={gemParts.body} material={MAT.body} />
        {gemParts.hull && <mesh geometry={gemParts.hull} material={MAT.hull} />}
      </group>
    </group>
  )
}

export default function Easels() {
  const artworks = useStore((s) => s.artworks)
  return <>{artworks.map((a) => <Easel key={a.id} art={a} />)}</>
}
