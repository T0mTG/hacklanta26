import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, ShaderMaterial, type BufferGeometry } from 'three'
import { LITE } from '../lib/env'
import { MAT } from './materials'
import { buildPlanetGeometry, buildWaterGeometry, type TerrainStyle } from './terrain'

const VERT = /* glsl */ `
attribute float aDepth;
varying vec3 vDir;
varying float vDepth;
void main() {
  vDir = normalize(position);
  vDepth = aDepth;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// Teal water that gets deeper away from the shore, with drifting white foam patches and a foam rim where it meets the sand
const FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uFoam;
varying vec3 vDir;
varying float vDepth;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
void main() {
  float depth = clamp(vDepth, 0.0, 2.0);
  vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 1.0, depth));
  float n1 = noise(vDir * 9.0 + vec3(uTime * 0.03, 0.0, uTime * 0.02));
  float n2 = noise(vDir * 21.0 - vec3(uTime * 0.05, uTime * 0.02, 0.0));
  float foam = smoothstep(0.69, 0.75, n1 * 0.65 + n2 * 0.35);
  float shore = 1.0 - smoothstep(0.0, 0.12, vDepth);
  float f = clamp(max(foam * 0.85, shore * 0.85), 0.0, 1.0);
  col = mix(col, uFoam, f);
  float alpha = max(f, mix(0.82, 0.97, smoothstep(0.0, 0.7, depth)));
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`

const WATER_COLORS: Record<TerrainStyle, { shallow: string; deep: string }> = {
  toy: { shallow: '#4fc3ba', deep: '#2a9ba3' },
  paper: { shallow: '#86d7cf', deep: '#4db1b6' }, // paler, so cut-outs dipping into the pond still show through
}

// The terrain depends on the globe's palette, the water only on its colors. Both are built once per style and kept, so
// switching globes on the landing screen is instant after the first time.
const terrainCache = new Map<TerrainStyle, BufferGeometry>()
let waterGeometry: BufferGeometry | null = null

export default function Planet({ style = 'toy' }: { style?: TerrainStyle }) {
  const { terrain, water } = useMemo(() => {
    const t0 = performance.now()
    let terrain = terrainCache.get(style)
    if (!terrain) {
      terrain = buildPlanetGeometry(LITE ? 34 : 54, style)
      terrainCache.set(style, terrain)
    }
    waterGeometry ??= buildWaterGeometry(LITE ? 40 : 56)
    if (import.meta.env.DEV) console.info(`[planet] ${style} terrain + water ready in`, Math.round(performance.now() - t0), 'ms')
    return { terrain, water: waterGeometry }
  }, [style])
  const mat = useMemo(() => {
    const c = WATER_COLORS[style]
    return new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uShallow: { value: new Color(c.shallow) }, uDeep: { value: new Color(c.deep) }, uFoam: { value: new Color('#f6fbf7') } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    })
  }, [style])
  useFrame((_, dt) => { mat.uniforms.uTime.value += dt })
  return (
    <>
      <mesh geometry={terrain} material={MAT.ground} receiveShadow />
      <mesh geometry={water} material={mat} renderOrder={2} />
    </>
  )
}
