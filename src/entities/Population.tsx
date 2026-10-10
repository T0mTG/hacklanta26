import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3, type Group } from 'three'
import type { Artwork } from '../data/types'
import { LITE } from '../lib/env'
import { R, WATER_R, angleBetween, frameAt, offsetDir, stepOnSphere, tangentize } from '../lib/sphere'
import { useStore } from '../store'
import { getWorld } from '../world/layout'
import { frameFor, yawToward } from '../world/place'
import { watchSlot } from '../world/spots'
import { REGIONS, FIELDS, type RegionId } from '../world/regions'
import { facing } from '../world/rig'
import { surfaceRadius } from '../world/terrain'
import { CRITTER_SPEC, Critter, Person, newCritterCtl, newPersonCtl, placeOnPlanet, type CritterKind, type PersonMode } from './Actors'
import { hashString, pickLook } from './looks'
import { rtFor, type EaselRT } from './registry'
import { Walker } from './walker'

const half = <T,>(a: T[]) => (LITE ? a.filter((_, i) => i % 2 === 0) : a)

// ------------------------------------------------------------------ animals that wander around a home spot
function Wanderer({ kind, home, range, seed }: { kind: CritterKind; home: Vector3; range: number; seed: number }) {
  const spec = CRITTER_SPEC[kind]
  const g = useRef<Group>(null)
  const { walker, ctl } = useMemo(() => ({
    walker: new Walker({ home, range, walk: spec.walk, run: spec.run, radius: spec.radius, swim: spec.swim, gait: spec.gait }, seed),
    ctl: newCritterCtl(),
  }), []) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, delta) => {
    const o = g.current
    if (!o) return
    const vis = facing(walker.dir, 0.1)
    o.visible = vis
    if (!vis) return
    walker.update(Math.min(delta, 0.05))
    ctl.speed = walker.speed
    ctl.phase = walker.phase
    placeOnPlanet(o, walker.dir, walker.fwd, spec.swim ? WATER_R + 0.015 : undefined)
  })
  return <Critter ref={g} kind={kind} ctl={ctl} seed={seed} />
}

const CRITTERS: { kind: CritterKind; region: RegionId; u: number; v: number; range: number; n: number }[] = [
  { kind: 'sheep', region: 'farm', u: 0.3, v: -0.2, range: 0.07, n: 4 },
  { kind: 'cow', region: 'farm', u: 0.3, v: -0.2, range: 0.07, n: 2 },
  { kind: 'sheep', region: 'twins', u: 0, v: 0, range: 0.22, n: 2 },
  { kind: 'rabbit', region: 'plaza', u: 0, v: 0.3, range: 0.2, n: 2 },
  { kind: 'rabbit', region: 'meadow', u: 0, v: 0, range: 0.25, n: 2 },
  { kind: 'rabbit', region: 'cherry', u: 0, v: 0, range: 0.2, n: 1 },
  { kind: 'rabbit', region: 'pines', u: 0, v: 0, range: 0.2, n: 1 },
  { kind: 'duck', region: 'lily', u: 0, v: 0, range: 0.13, n: 2 },
  { kind: 'duckling', region: 'lily', u: 0, v: 0, range: 0.13, n: 2 },
  { kind: 'duck', region: 'duck', u: 0, v: 0, range: 0.13, n: 2 },
  { kind: 'duckling', region: 'duck', u: 0, v: 0, range: 0.13, n: 1 },
  { kind: 'duck', region: 'lake', u: 0, v: 0, range: 0.28, n: 3 },
  { kind: 'cat', region: 'plaza', u: -0.1, v: -0.2, range: 0.25, n: 1 },
]

// ------------------------------------------------------------------ people
interface Folk { home: Vector3; range: number; seed: number; kind: 'kid' | 'adult' | 'farmer'; work?: boolean }

function Villager({ home, range, seed, kind, work }: Folk) {
  const g = useRef<Group>(null)
  const look = useMemo(() => pickLook(seed, kind), [seed, kind])
  const ctl = useMemo(newPersonCtl, [])
  const walker = useMemo(() => new Walker({ home, range, walk: work ? 0.55 : 0.85, radius: 0.3, gait: 8 }, seed), []) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, delta) => {
    const o = g.current
    if (!o) return
    const vis = facing(walker.dir, 0.1)
    o.visible = vis
    if (!vis) return
    walker.update(Math.min(delta, 0.05))
    ctl.speed = walker.speed
    ctl.phase = walker.phase
    ctl.mode = !walker.moving && work ? 'work' : 'idle'
    placeOnPlanet(o, walker.dir, walker.fwd)
  })
  return <Person ref={g} look={look} ctl={ctl} seed={seed} scale={kind === 'kid' ? 0.85 : 1.1} />
}

// Someone who stays where they are: a kid sitting on the picnic blanket, a parent watching
function Fixed({ dir, face, mode, seed, kind, scale = 1, waves }: { dir: Vector3; face: Vector3; mode: PersonMode; seed: number; kind: 'kid' | 'adult'; scale?: number; waves?: boolean }) {
  const look = useMemo(() => pickLook(seed, kind), [seed, kind])
  const ctl = useMemo(() => ({ ...newPersonCtl(), mode }), [mode])
  const place = useMemo(() => {
    const q = frameFor(dir, yawToward(dir, face), new Quaternion())
    return { position: dir.clone().multiplyScalar(surfaceRadius(dir)), quaternion: q }
  }, [dir, face])
  const g = useRef<Group>(null)
  useFrame((state) => {
    const o = g.current
    if (!o) return
    o.visible = facing(dir, 0.1)
    if (waves) ctl.mode = Math.sin(state.clock.elapsedTime * 0.3 + seed) > 0.55 ? 'sitwave' : 'sit'
  })
  return (
    <group ref={g} position={place.position} quaternion={place.quaternion}>
      <Person look={look} ctl={ctl} seed={seed} scale={scale} />
    </group>
  )
}

// The picnic family: mom waving from the blanket, a girl sitting with her, dad looking on, a toddler and a dog exploring
function Family() {
  const blanket = getWorld().structures.find((s) => s.kind === 'blanket')!
  const c = blanket.dir
  const frame = useMemo(() => frameAt(c), [c])
  const at = (u: number, v: number) => offsetDir(c, u, v, new Vector3(), frame)
  const mom = useMemo(() => at(-0.04, 0.012), []) // eslint-disable-line react-hooks/exhaustive-deps
  const girl = useMemo(() => at(0.04, -0.005), []) // eslint-disable-line react-hooks/exhaustive-deps
  const dad = useMemo(() => at(0.01, 0.1), []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Fixed dir={mom} face={c} mode="sit" seed={101} kind="adult" scale={1.05} waves />
      <Fixed dir={girl} face={c} mode="sit" seed={102} kind="kid" scale={0.85} />
      <Fixed dir={dad} face={c} mode="watch" seed={103} kind="adult" scale={1.12} />
      <Villager home={c} range={0.05} seed={104} kind="kid" />
      <Wanderer kind="dog" home={c} range={0.07} seed={105} />
    </>
  )
}

// ------------------------------------------------------------------ people who come to look at a drawing
const slotOf = (rt: EaselRT, i: number, n: number, out: Vector3) => watchSlot(rt.dir, rt.yaw, i, n, out)

function Watcher({ art, index, n }: { art: Artwork; index: number; n: number }) {
  const rt = rtFor(art)
  const g = useRef<Group>(null)
  const seed = (hashString(art.id) % 997) + index * 31
  const look = useMemo(() => pickLook(seed, index === 0 && n > 1 ? 'adult' : 'kid'), [seed, index, n])
  const ctl = useMemo(newPersonCtl, [])
  const slot = useMemo(() => new Vector3(), [])
  const walker = useMemo(() => {
    const s = slotOf(rt, index, n, new Vector3())
    // people who come for a brand new easel walk in from a few steps away
    const start = rt.spawnAt && !rt.landedAt ? stepAway(s, rt.dir, 6) : s
    return new Walker({ home: s, range: 0.04, walk: 0.9, run: 2.4, radius: 0.25, gait: 8 }, seed, start)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, delta) => {
    const o = g.current
    if (!o) return
    const dt = Math.min(delta, 0.05)
    if (rt.spawnAt && !rt.landedAt) { o.visible = false; return }
    slotOf(rt, index, n, slot)
    const vis = facing(walker.dir, 0.1) || facing(slot, 0.1)
    o.visible = vis
    if (!vis) { walker.dir.copy(slot); return } // out of sight: no need to walk laps
    const dist = angleBetween(walker.dir, slot) * R
    if (dist > 0.4) {
      walker.update(dt, { at: slot, stop: 0.25, run: true })
      if (walker.stuck > 3 || dist > 30) { walker.dir.copy(slot); walker.stuck = 0 }
    } else {
      walker.speed *= Math.exp(-dt * 8)
      walker.faceToward(rt.dir, dt, 3)
    }
    ctl.speed = walker.speed
    ctl.phase = walker.phase
    ctl.mode = performance.now() < rt.cheerUntil ? 'cheer' : walker.speed > 0.2 ? 'idle' : 'watch'
    placeOnPlanet(o, walker.dir, walker.fwd)
  })
  return <Person ref={g} look={look} ctl={ctl} seed={seed} scale={look.style === 'pigtails' || look.style === 'bun' ? 0.88 : index === 0 && n > 1 ? 1.1 : 0.85} />
}

// A point `units` further from `awayFrom` than `from` is, along the great circle through both
function stepAway(from: Vector3, awayFrom: Vector3, units: number) {
  const out = from.clone()
  const heading = tangentize(new Vector3().copy(from).sub(awayFrom), from)
  stepOnSphere(out, heading, units / R)
  return out
}

function Watchers({ art }: { art: Artwork }) {
  const n = art.kind === 'upload' || art.kind === 'sample' ? 2 : 1 + (hashString(art.id) % 3)
  const count = LITE ? Math.min(n, 2) : n
  return <>{Array.from({ length: count }, (_, i) => <Watcher key={i} art={art} index={i} n={count} />)}</>
}

export default function Population() {
  const artworks = useStore((s) => s.artworks)
  const critters = useMemo(() => {
    const out: { kind: CritterKind; home: Vector3; range: number; seed: number; key: string }[] = []
    CRITTERS.forEach((c, ci) => {
      const home = offsetDir(REGIONS[c.region].dir, c.u, c.v)
      const n = LITE ? Math.ceil(c.n / 2) : c.n
      for (let i = 0; i < n; i++) out.push({ kind: c.kind, home, range: c.range, seed: ci * 17 + i * 5 + 3, key: `${c.kind}-${ci}-${i}` })
    })
    return out
  }, [])
  const folk = useMemo(() => {
    const village = REGIONS.village.dir
    const fieldA = FIELDS[0].c
    const list: (Folk & { key: string })[] = [
      { key: 'v1', home: village, range: 0.2, seed: 201, kind: 'adult' },
      { key: 'v2', home: village, range: 0.2, seed: 202, kind: 'kid' },
      { key: 'v3', home: offsetDir(village, 0.1, -0.25), range: 0.18, seed: 203, kind: 'adult' },
      { key: 'f1', home: fieldA, range: 0.07, seed: 211, kind: 'farmer', work: true },
      { key: 'f2', home: offsetDir(FIELDS[1].c, 0, 0), range: 0.07, seed: 212, kind: 'farmer', work: true },
    ]
    return half(list)
  }, [])
  return (
    <>
      {critters.map((c) => <Wanderer key={c.key} kind={c.kind} home={c.home} range={c.range} seed={c.seed} />)}
      {folk.map(({ key, ...f }) => <Villager key={key} {...f} />)}
      <Family />
      {artworks.map((a) => <Watchers key={a.id} art={a} />)}
    </>
  )
}
