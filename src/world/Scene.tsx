import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PCFShadowMap, Vector2, Vector3, type DirectionalLight } from 'three'
import { LITE } from '../lib/env'
import { lerp } from '../lib/rng'
import { useStore } from '../store'
import Atmosphere from './Atmosphere'
import Buildings from './Buildings'
import CameraRig from './CameraRig'
import Flora from './Flora'
import { getWorld } from './layout'
import Planet from './Planet'
import { REGIONS, type RegionId } from './regions'
import { GLOBE_FOV, faceGlobeTo, rig } from './rig'

// One sun that follows the camera, so the side you are looking at is always lit from the upper left.
function Sun() {
  const light = useRef<DirectionalLight>(null)
  const camera = useThree((s) => s.camera)
  const t = useMemo(() => ({ r: new Vector3(), u: new Vector3(), b: new Vector3(), d: new Vector3(), half: 0 }), [])
  useFrame(() => {
    const l = light.current
    if (!l) return
    camera.matrixWorld.extractBasis(t.r, t.u, t.b)
    t.d.set(0, 0, 0).addScaledVector(t.r, -0.45).addScaledVector(t.u, 0.75).addScaledVector(t.b, 0.55).normalize()
    l.position.copy(rig.pose.target).addScaledVector(t.d, 45)
    l.target.position.copy(rig.pose.target)
    l.target.updateMatrixWorld()
    // wide frustum for the whole planet, tight one when walking so shadows stay crisp
    const half = lerp(15, 9.5, rig.pose.sky)
    if (Math.abs(half - t.half) > 0.05) {
      t.half = half
      const c = l.shadow.camera
      c.left = -half; c.right = half; c.top = half; c.bottom = -half
      c.updateProjectionMatrix()
    }
  })
  return (
    <directionalLight
      ref={light} color="#fff4dc" intensity={2.9} castShadow={!LITE}
      shadow-mapSize={[2048, 2048]} shadow-camera-near={1} shadow-camera-far={110} shadow-bias={-0.0004} shadow-normalBias={0.04}
    />
  )
}

// Dev only: window.__shot(name, w, h) renders one frame at that size and saves it through a localhost receiver
function DevHooks() {
  const { gl, scene, camera, advance } = useThree()
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__store = useStore
    w.__rig = rig
    w.__world = getWorld()
    // __look('lily', 0.6) snaps the globe to a region and zooms in (smaller number = closer)
    w.__look = (id: RegionId, zoom = 1) => {
      faceGlobeTo(REGIONS[id].dir)
      rig.zoom = rig.zoomGoal = zoom
      rig.spin.x = rig.spin.y = 0
      rig.mode = 'globe'
      rig.k = 1
      useStore.getState().setCam('globe')
    }
    // draw calls and triangles for the last frame
    w.__stats = () => {
      advance(performance.now())
      gl.info.reset()
      gl.render(scene, camera)
      return { calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures }
    }
    w.__shot = async (name: string, width = 1600, height = 1000) => {
      advance(performance.now()) // the pane only renders while it is being captured, so step one frame by hand
      const size = gl.getSize(new Vector2()), ratio = gl.getPixelRatio()
      const cam = camera as typeof camera & { aspect: number; updateProjectionMatrix(): void }
      const aspect = cam.aspect
      gl.setPixelRatio(1); gl.setSize(width, height, false)
      cam.aspect = width / height; cam.updateProjectionMatrix()
      gl.render(scene, camera)
      const blob = await new Promise<Blob>((res) => gl.domElement.toBlob((b) => res(b!), 'image/jpeg', 0.9))
      gl.setPixelRatio(ratio); gl.setSize(size.x, size.y, false)
      cam.aspect = aspect; cam.updateProjectionMatrix()
      const r = await fetch(`http://127.0.0.1:8800/save?name=${name}.jpg`, { method: 'POST', body: blob })
      return r.ok
    }
  }, [gl, scene, camera, advance])
  return null
}

function World() {
  return (
    <>
      <hemisphereLight args={['#eefaf5', '#86b57a', 1.9]} />
      <Sun />
      <Planet />
      <Flora />
      <Buildings />
      <Atmosphere />
    </>
  )
}

export default function Scene() {
  // let the title screen paint first; building the planet takes a moment
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 60)
    return () => window.clearTimeout(id)
  }, [])
  const say = useStore((s) => s.say)
  return (
    <div className="stage">
      <Canvas
        flat
        shadows={LITE ? false : { type: PCFShadowMap }}
        dpr={LITE ? 1 : [1, 1.75]}
        camera={{ fov: GLOBE_FOV, near: 0.1, far: 600, position: [0, 4, 62] }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            say('The planet fell asleep. Reload the page to wake it up!')
          })
        }}
      >
        <CameraRig />
        {import.meta.env.DEV && <DevHooks />}
        {ready && <World />}
      </Canvas>
    </div>
  )
}
