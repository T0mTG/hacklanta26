import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Group, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from 'three'
import { LITE } from '../lib/env'
import { rng } from '../lib/rng'
import { R, basisQuat, frameAt, offsetDir, tangentize } from '../lib/sphere'
import { getWorld } from './layout'
import { MAT } from './materials'
import * as M from './models'
import { surfaceRadius } from './terrain'

const randomUnit = (rand: () => number) => {
  const z = rand() * 2 - 1, a = rand() * Math.PI * 2, r = Math.sqrt(1 - z * z)
  return new Vector3(Math.cos(a) * r, z, Math.sin(a) * r)
}

const Z = new Vector3(0, 0, 1)
const _body = new Matrix4(), _wing = new Matrix4(), _loc = new Matrix4()
const _qBody = new Quaternion(), _qRoll = new Quaternion(), _qWing = new Quaternion()
const _pos = new Vector3(), _off = new Vector3(), _one = new Vector3(1, 1, 1), _sc = new Vector3()

// Body matrix, then each wing hinged on the body and rotated about the forward axis
function setWingedBody(i: number, body: InstancedMesh, left: InstancedMesh, right: InstancedMesh, shoulder: number, flap: number) {
  body.setMatrixAt(i, _body)
  for (const side of [-1, 1]) {
    _off.set(side * shoulder, 0.04, 0)
    _qWing.setFromAxisAngle(Z, side * flap)
    _wing.multiplyMatrices(_body, _loc.compose(_off, _qWing, _one))
    ;(side < 0 ? left : right).setMatrixAt(i, _wing)
  }
}

// Outlined cream clouds drifting around the planet on their own orbits, like in the reference
function Clouds() {
  const { root, orbits } = useMemo(() => {
    const rand = rng(77)
    const variants = M.CLOUDS()
    const root = new Group()
    const orbits: { pivot: Group; axis: Vector3; speed: number }[] = []
    const n = LITE ? 9 : 17
    for (let i = 0; i < n; i++) {
      const built = variants[i % variants.length]
      const cloud = new Group()
      cloud.add(new Mesh(built.body, MAT.body))
      if (built.hull) cloud.add(new Mesh(built.hull, MAT.hull))
      const p0 = randomUnit(rand)
      cloud.position.copy(p0).multiplyScalar(R + 5.5 + rand() * 6)
      cloud.quaternion.copy(basisQuat(p0, tangentize(randomUnit(rand), p0)))
      cloud.scale.setScalar(0.55 + rand() * 0.7)
      const pivot = new Group()
      pivot.add(cloud)
      pivot.quaternion.setFromAxisAngle(randomUnit(rand), rand() * 6.28)
      root.add(pivot)
      orbits.push({ pivot, axis: randomUnit(rand), speed: (0.012 + rand() * 0.028) * (rand() < 0.5 ? -1 : 1) })
    }
    return { root, orbits }
  }, [])
  useFrame((_, dt) => { for (const o of orbits) o.pivot.rotateOnWorldAxis(o.axis, o.speed * dt) })
  return <primitive object={root} />
}

const BIRD_COLORS = ['#ffffff', '#ffffff', '#fff6e0', '#f6c93a', '#f4a0b8', '#8cc8f0', '#ffffff', '#fff6e0']

// Gulls and a few colorful songbirds circling above the planet with flapping wings
function Birds() {
  const n = LITE ? 4 : 8
  const { root, body, left, right, data } = useMemo(() => {
    const rand = rng(91)
    const B = M.BIRD()
    const make = (geo: typeof B.body.body) => {
      const im = new InstancedMesh(geo, MAT.body, n)
      im.frustumCulled = false
      return im
    }
    const body = make(B.body.body), left = make(B.left.body), right = make(B.right.body)
    const col = new Color()
    const data = Array.from({ length: n }, (_, i) => {
      for (const im of [body, left, right]) im.setColorAt(i, col.set(BIRD_COLORS[i % BIRD_COLORS.length]))
      return {
        p0: randomUnit(rand), axis: randomUnit(rand), w: (0.07 + rand() * 0.07) * (rand() < 0.5 ? -1 : 1),
        alt: R + 3.4 + rand() * 3.4, phase: rand() * 6.28, hz: 6 + rand() * 3, sc: 1.1 + rand() * 0.5,
      }
    })
    const root = new Group()
    root.add(body, left, right)
    return { root, body, left, right, data }
  }, [n])
  const tmp = useMemo(() => ({ p: new Vector3(), f: new Vector3() }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    data.forEach((b, i) => {
      tmp.p.copy(b.p0).applyAxisAngle(b.axis, b.w * t)
      tmp.f.crossVectors(b.axis, tmp.p).multiplyScalar(Math.sign(b.w))
      basisQuat(tmp.p, tangentize(tmp.f, tmp.p), _qBody)
      _qBody.multiply(_qRoll.setFromAxisAngle(Z, Math.sin(t * 0.5 + b.phase) * 0.25)) // gentle banking
      _pos.copy(tmp.p).multiplyScalar(b.alt)
      _body.compose(_pos, _qBody, _sc.setScalar(b.sc))
      setWingedBody(i, body, left, right, 0.08, Math.sin(t * b.hz + b.phase) * 0.75)
    })
    body.instanceMatrix.needsUpdate = left.instanceMatrix.needsUpdate = right.instanceMatrix.needsUpdate = true
  })
  return <primitive object={root} />
}

const BUTTERFLY_COLORS = ['#f6a6b8', '#f6b26b', '#9ad4f5', '#f6dc6b', '#fbf5e6', '#c9b6f2']

// Butterflies flitting over the flowers
function Butterflies() {
  const n = LITE ? 9 : 20
  const { root, body, left, right, data } = useMemo(() => {
    const rand = rng(123)
    const B = M.BUTTERFLY()
    const make = (geo: typeof B.body.body, tinted: boolean) => {
      const im = new InstancedMesh(geo, MAT.body, n)
      im.frustumCulled = false
      if (tinted) {
        const col = new Color()
        for (let i = 0; i < n; i++) im.setColorAt(i, col.set(BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length]))
      }
      return im
    }
    const body = make(B.body.body, false), left = make(B.left.body, true), right = make(B.right.body, true)
    const flowers = getWorld().flowers
    const data = Array.from({ length: n }, () => {
      const home = flowers.length ? flowers[Math.floor(rand() * flowers.length)].dir : randomUnit(rand)
      return {
        home, frame: frameAt(home), A: 0.03 + rand() * 0.07, B: 0.03 + rand() * 0.07,
        w1: 0.35 + rand() * 0.5, w2: 0.3 + rand() * 0.5, p1: rand() * 6.28, p2: rand() * 6.28, p3: rand() * 6.28,
        hz: 16 + rand() * 6, sc: 1.1 + rand() * 0.6,
      }
    })
    const root = new Group()
    root.add(body, left, right)
    return { root, body, left, right, data }
  }, [n])
  const tmp = useMemo(() => ({ d: new Vector3(), f: new Vector3() }), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    data.forEach((b, i) => {
      const u = b.A * Math.sin(b.w1 * t + b.p1), v = b.B * Math.sin(b.w2 * t + b.p2)
      offsetDir(b.home, u, v, tmp.d, b.frame)
      // face the way the wander path is heading
      tmp.f.copy(b.frame.e).multiplyScalar(b.A * b.w1 * Math.cos(b.w1 * t + b.p1)).addScaledVector(b.frame.n, b.B * b.w2 * Math.cos(b.w2 * t + b.p2))
      basisQuat(tmp.d, tangentize(tmp.f, tmp.d), _qBody)
      _pos.copy(tmp.d).multiplyScalar(surfaceRadius(tmp.d) + 0.6 + 0.35 * Math.sin(t * 1.7 + b.p3))
      _body.compose(_pos, _qBody, _sc.setScalar(b.sc))
      setWingedBody(i, body, left, right, 0.0, 0.25 + Math.abs(Math.sin(t * b.hz + b.p3)) * 1.0)
    })
    body.instanceMatrix.needsUpdate = left.instanceMatrix.needsUpdate = right.instanceMatrix.needsUpdate = true
  })
  return <primitive object={root} />
}

export default function Atmosphere() {
  return (
    <>
      <Clouds />
      <Birds />
      <Butterflies />
    </>
  )
}
