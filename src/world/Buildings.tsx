import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three'
import type { Built } from '../lib/kit'
import { WATER_R } from '../lib/sphere'
import { getWorld } from './layout'
import { MAT } from './materials'
import * as M from './models'
import { placeMatrix } from './place'
import { REGIONS } from './regions'

function meshes(built: Built, shadow = true) {
  const g = new Group()
  const body = new Mesh(built.body, MAT.body)
  body.castShadow = shadow
  body.receiveShadow = true
  g.add(body)
  if (built.hull) g.add(new Mesh(built.hull, MAT.hull))
  return g
}

// Text painted onto a canvas, used for the plaza signpost
function signFace(text: string) {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 192
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  const draw = () => {
    const g = c.getContext('2d')!
    g.clearRect(0, 0, 512, 192)
    g.fillStyle = '#22333b'
    g.font = '700 74px Fredoka, Nunito, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, 256, 100)
    tex.needsUpdate = true
  }
  draw()
  document.fonts?.load('700 74px Fredoka').then(draw).catch(() => {})
  const mesh = new Mesh(new PlaneGeometry(1.4, 0.5), new MeshBasicMaterial({ map: tex, transparent: true }))
  mesh.position.set(0, 1.2, 0.045)
  return mesh
}

// Cottages, barn, windmill, benches, sign, tractor, haystacks, well, boats, picnic blanket and rainbow
export default function Buildings() {
  const { root, spinners } = useMemo(() => {
    const w = getWorld()
    const root = new Group()
    const spinners: Group[] = []
    const m = new Matrix4()
    for (const s of w.structures) {
      let obj: Group
      switch (s.kind) {
        case 'cottage': obj = meshes(M.COTTAGES()[s.variant % 3]); break
        case 'barn': obj = meshes(M.BARN()); break
        case 'windmill': {
          const { tower, blades } = M.WINDMILL()
          obj = meshes(tower)
          const sails = meshes(blades)
          sails.position.set(0, 3.15, 0.95)
          obj.add(sails)
          spinners.push(sails)
          break
        }
        case 'bench': obj = meshes(M.BENCH()); break
        case 'sign': obj = meshes(M.SIGN()); obj.add(signFace(REGIONS.plaza.name)); break
        case 'haystack': obj = meshes(M.HAYSTACKS()[s.variant % 2]); break
        case 'tractor': obj = meshes(M.TRACTOR()); break
        case 'well': obj = meshes(M.WELL()); break
        case 'boat': obj = meshes(M.BOATS().small); break
        case 'sailboat': obj = meshes(M.BOATS().sail); break
        case 'blanket': obj = meshes(M.PICNIC(), false); break
        case 'rainbow': obj = meshes(M.RAINBOW(), false); break
      }
      obj.applyMatrix4(placeMatrix(s.dir, s.yaw, s.scale, s.onWater ? 0.04 : 0, m, s.onWater ? WATER_R : undefined))
      root.add(obj)
    }
    return { root, spinners }
  }, [])
  useFrame((_, dt) => { for (const s of spinners) s.rotation.z += dt * 0.7 })
  return <primitive object={root} />
}
