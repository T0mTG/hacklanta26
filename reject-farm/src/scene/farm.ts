// The stage. globe.gl owns the renderer, the camera, the orbit controls, the
// atmosphere glow, the ripples (ring layer) and the continent name tags (HTML
// layer). The planet itself, its scenery and the creatures are plain three.js
// added to its scene.
import Globe from 'globe.gl'
import { DirectionalLight, HemisphereLight, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { sfx } from '../lib/sound'
import { useStore } from '../store'
import { createHerd } from './herd'
import { buildScenery } from './scenery'
import { PLANET_R, latLonFromDir, scene } from './sceneState'
import { CONTINENTS, type Continent, buildWorld, groundHeight, isWalkable, sample } from './world'

interface Ring {
  lat: number
  lng: number
  alt: number
  color: string
  size: number
  speed: number
  every: number
}

const camUp = new Vector3()
const camRight = new Vector3()
const ray = new Vector3()

export function createFarm(el: HTMLElement): () => void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const globe = new Globe(el, { rendererConfig: { antialias: true, alpha: true }, animateIn: false })
    .backgroundColor('rgba(0,0,0,0)')
    // our own terrain stands in for globe.gl's sphere
    .showGlobe(false)
    .showAtmosphere(true)
    .atmosphereColor('#A8DCFF')
    .atmosphereAltitude(0.2)
    // we pick creatures ourselves (see herd.pick), so globe.gl needn't raycast
    .enablePointerInteraction(false)
    .ringColor((d: object) => (t: number) => `rgba(${(d as Ring).color}, ${(1 - t) * 0.95})`)
    .ringAltitude((d) => (d as Ring).alt)
    .ringMaxRadius((d) => (d as Ring).size)
    .ringPropagationSpeed((d) => (d as Ring).speed)
    .ringRepeatPeriod((d) => (d as Ring).every)
    // a handwritten name floating over each continent
    .htmlElementsData(CONTINENTS)
    .htmlLat((d) => (d as Continent).lat)
    .htmlLng((d) => (d as Continent).lng)
    .htmlAltitude(0.2)
    .htmlElement((d) => {
      const tag = document.createElement('div')
      tag.className = `place ${(d as Continent).biome}`
      tag.textContent = (d as Continent).name
      return tag
    })
    .htmlElementVisibilityModifier((tag, visible) => tag.classList.toggle('behind', !visible))

  const camera = globe.camera() as PerspectiveCamera
  camera.fov = 35
  camera.updateProjectionMatrix()
  scene.camera = camera

  // dusk: a warm low sun from over the viewer's shoulder, violet in the shadows
  const sun = new DirectionalLight('#FFDDB0', 2.8)
  globe.lights([new HemisphereLight('#DDD2FF', '#8A76A8', 2.4), sun])

  const controls = globe.controls()
  controls.enablePan = false
  controls.autoRotateSpeed = 0.35
  controls.minDistance = 135
  controls.maxDistance = 760

  const world = buildWorld()
  const scenery = buildScenery()
  globe.scene().add(world.root, scenery.root)

  // --- ripples ---
  const rings: Ring[] = []
  let selectedRing: Ring | null = null
  const ringAt = (p: Vector3, color: string, size: number, speed: number, every: number): Ring => ({
    ...latLonFromDir(p),
    alt: groundHeight(p) / PLANET_R + 0.012,
    color,
    size,
    speed,
    every,
  })
  const ripple = (p: Vector3, color: string, size: number, speed: number) => {
    const ring = ringAt(p, color, size, speed, 300)
    rings.push(ring)
    globe.ringsData([...rings])
    setTimeout(() => {
      rings.splice(rings.indexOf(ring), 1)
      globe.ringsData([...rings])
    }, 1100)
  }

  const herd = createHerd(globe.scene(), camera, {
    land: (p) => ripple(p, '255, 236, 160', 7, 9),
    splash: (p) => {
      sfx.splash()
      ripple(p, '220, 240, 255', 9, 8)
    },
  })

  // --- camera ---
  let width = el.clientWidth
  let height = el.clientHeight
  // on a tall phone the planet has to sit further back to fit the width
  const fit = () => Math.max(1, 1.1 / (width / height))
  const altitude = (phase: 'welcome' | 'farm') => (1 + (phase === 'welcome' ? 3.4 : 2.85)) * fit() - 1
  globe.pointOfView({ lat: 20, lng: -14, altitude: altitude(useStore.getState().phase) })

  const resize = () => {
    width = el.clientWidth
    height = el.clientHeight
    globe.width(width).height(height)
    globe.pointOfView({ altitude: altitude(useStore.getState().phase) })
  }
  const observer = new ResizeObserver(resize)
  observer.observe(el)

  /** A direction a little off the middle of the view: `up` and `across` are fractions of the globe's radius. */
  const inView = (up: number, across: number) => {
    camera.updateMatrixWorld()
    camUp.setFromMatrixColumn(camera.matrixWorld, 1)
    camRight.setFromMatrixColumn(camera.matrixWorld, 0)
    return camera.position.clone().normalize().multiplyScalar(0.86).addScaledVector(camUp, up).addScaledVector(camRight, across).normalize()
  }
  scene.findLanding = () => {
    // try the middle of the view first, then work outwards until there's dry land
    for (let ring = 0; ring < 6; ring++) {
      for (let k = 0; k < 8; k++) {
        const angle = (k / 8) * Math.PI * 2 + ring
        const spot = inView(0.2 + Math.sin(angle) * ring * 0.14 + (Math.random() - 0.5) * 0.1, Math.cos(angle) * ring * 0.14 + (Math.random() - 0.5) * 0.1)
        if (isWalkable(spot) && sample(spot).f > 0.09) return spot
      }
    }
    // nothing but sea in sight: land on the nearest continent
    const here = camera.position.clone().normalize()
    return [...CONTINENTS].sort((a, b) => here.angleTo(a.lobes[0].dir) - here.angleTo(b.lobes[0].dir))[0].lobes[0].dir.clone()
  }
  scene.aim = () => {
    const dir = inView(0.3, -0.2)
    scene.introDir = dir
    const v = dir.clone().multiplyScalar(PLANET_R * 1.04).project(camera)
    const rect = el.getBoundingClientRect()
    return { x: rect.left + (v.x * 0.5 + 0.5) * rect.width, y: rect.top + (-v.y * 0.5 + 0.5) * rect.height }
  }

  /** Where a ray from the camera through a point on screen first meets the planet, as a direction from its centre. */
  const groundUnder = (x: number, y: number): Vector3 | null => {
    ray.set((x / width) * 2 - 1, -(y / height) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize()
    const o = camera.position
    const half = o.dot(ray)
    const disc = half * half - (o.lengthSq() - (PLANET_R + 1.5) ** 2)
    if (disc < 0) return null
    return o.clone().addScaledVector(ray, -half - Math.sqrt(disc)).normalize()
  }

  // --- react to the store ---
  let carrying: string | null = null
  const applyState = (s: ReturnType<typeof useStore.getState>) => {
    controls.autoRotate = !reducedMotion && !s.selectedId && !s.sheetOpen && !carrying
  }
  herd.sync(useStore.getState().creatures)
  applyState(useStore.getState())

  const unsubscribe = useStore.subscribe((s, prev) => {
    if (s.creatures !== prev.creatures) herd.sync(s.creatures)
    applyState(s)

    if (s.phase !== prev.phase) {
      // the swoop in from the front page
      const pov = globe.pointOfView()
      globe.pointOfView({ lat: 18, lng: pov.lng + 18, altitude: altitude(s.phase) }, reducedMotion ? 0 : 1900)
      if (scene.introDir) ripple(scene.introDir, '255, 236, 160', 16, 18)
      scene.introDir = null
    }

    if (s.selectedId !== prev.selectedId) {
      if (selectedRing) rings.splice(rings.indexOf(selectedRing), 1)
      selectedRing = null
      const p = s.selectedId ? scene.positions.get(s.selectedId) : null
      if (p) {
        const { lat, lng } = latLonFromDir(p)
        rings.push((selectedRing = ringAt(p, '255, 226, 150', 4, 2.6, 1100)))
        // look from a little below, so the creature stands tall in the upper half
        globe.pointOfView({ lat: MathUtils.clamp(lat - 9, -70, 70), lng }, reducedMotion ? 0 : 1000)
      }
      globe.ringsData([...rings])
    }
  })

  // --- pointer: hover, tap, and pick creatures up ---
  let pointer: { x: number; y: number } | null = null
  let down: { x: number; y: number; id: string | null } | null = null
  const local = (e: PointerEvent) => {
    const r = el.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onDown = (e: PointerEvent) => {
    const at = local(e)
    const s = useStore.getState()
    const id = s.phase === 'farm' ? herd.pick(at.x, at.y, width, height) : null
    down = { ...at, id }
    // a press on a creature must not also spin the globe; this runs before the orbit controls see it
    if (id) controls.enabled = false
  }
  const onMove = (e: PointerEvent) => (pointer = local(e))
  // dragging is tracked on the window, so a creature can be carried over the UI and back
  const onDrag = (e: PointerEvent) => {
    if (!down?.id) return
    pointer = local(e)
    if (!carrying && Math.hypot(pointer.x - down.x, pointer.y - down.y) > 6 && herd.hold(down.id)) {
      carrying = down.id
      sfx.tick()
      const s = useStore.getState()
      if (s.selectedId) s.select(null)
      applyState(s)
    }
    if (carrying) {
      const spot = groundUnder(pointer.x, pointer.y)
      if (spot) herd.carry(carrying, spot)
    }
  }
  const onUp = (e: PointerEvent) => {
    const at = local(e)
    const pressed = down
    down = null
    controls.enabled = true
    if (!pressed) return
    const s = useStore.getState()
    if (carrying) {
      herd.release(carrying)
      carrying = null
      applyState(s)
      return
    }
    if (Math.hypot(at.x - pressed.x, at.y - pressed.y) >= 6) return
    const id = herd.pick(at.x, at.y, width, height)
    if (s.phase === 'welcome') {
      // on the front page a tap on a creature is as good as the front door
      if (id) {
        s.enter()
        setTimeout(() => useStore.getState().select(id), 900)
      }
      return
    }
    s.select(id)
    if (!id) {
      // the world answers every touch: a ripple on water, a puff of light on land
      const spot = groundUnder(at.x, at.y)
      if (spot) ripple(spot, sample(spot).f > 0 ? '255, 236, 160' : '200, 232, 255', 4.5, 7)
    }
  }
  const onLeave = () => {
    pointer = null
    useStore.getState().hover(null)
  }
  const onWindowMove = (e: PointerEvent) => {
    onDrag(e)
    scene.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    scene.pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    // the front page's headline drifts against the pointer too (see .welcome-copy)
    document.documentElement.style.setProperty('--px', scene.pointer.x.toFixed(3))
    document.documentElement.style.setProperty('--py', scene.pointer.y.toFixed(3))
  }
  el.addEventListener('pointerdown', onDown, true)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerleave', onLeave)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointermove', onWindowMove)

  // in development only: lets a test script find a creature on screen
  if (import.meta.env.DEV) {
    ;(window as unknown as Record<string, unknown>).__farm = {
      screenOf: (id: string) => {
        const p = scene.positions.get(id)
        if (!p) return null
        const v = p.clone().multiplyScalar(PLANET_R + groundHeight(p) + 8).project(camera)
        return [(v.x * 0.5 + 0.5) * width, (-v.y * 0.5 + 0.5) * height]
      },
    }
  }

  // --- the frame loop (globe.gl renders; this just moves things) ---
  const slide = { x: NaN, y: NaN, px: 0, py: 0 }
  let raf = 0
  let last = performance.now()
  const frame = (ms: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min((ms - last) / 1000, 0.05)
    last = ms
    const s = useStore.getState()
    camera.updateMatrixWorld()

    // Slide the planet across the frame without moving the camera: right of the
    // headline on the front page, and out from under an open name tag.
    const wide = width >= 860
    const welcome = s.phase === 'welcome'
    const tx = (welcome ? (wide ? 0.2 : 0) : s.selectedId && wide ? -0.1 : 0) - (welcome ? scene.pointer.x * 0.012 : 0)
    const ty = (welcome && !wide ? 0.07 : 0) - (welcome ? scene.pointer.y * 0.012 : 0)
    slide.x = Number.isNaN(slide.x) ? tx : MathUtils.damp(slide.x, tx, 3.2, dt)
    slide.y = Number.isNaN(slide.y) ? ty : MathUtils.damp(slide.y, ty, 3.2, dt)
    const px = Math.round(slide.x * width)
    const py = Math.round(slide.y * height)
    if (px !== slide.px || py !== slide.py) {
      slide.px = px
      slide.py = py
      globe.globeOffset([px, py])
    }

    // the sun follows the camera, so the side you're looking at is always lit
    camUp.setFromMatrixColumn(camera.matrixWorld, 1)
    camRight.setFromMatrixColumn(camera.matrixWorld, 0)
    sun.position.copy(camera.position).normalize().addScaledVector(camUp, 0.9).addScaledVector(camRight, -0.85).multiplyScalar(400)

    if (pointer && !carrying) {
      const id = down ? null : herd.pick(pointer.x, pointer.y, width, height)
      if (id !== s.hoveredId) s.hover(id)
      el.style.cursor = id ? 'grab' : ''
    } else if (carrying) el.style.cursor = 'grabbing'

    herd.update(dt, s.selectedId, s.hoveredId)
    world.tick(ms / 1000)
    scenery.tick(ms / 1000, dt)
  }
  raf = requestAnimationFrame(frame)

  return () => {
    cancelAnimationFrame(raf)
    unsubscribe()
    observer.disconnect()
    el.removeEventListener('pointerdown', onDown, true)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointermove', onWindowMove)
    herd.dispose()
    scene.aim = null
    scene.findLanding = null
    scene.camera = null
    globe._destructor()
    el.replaceChildren()
  }
}
