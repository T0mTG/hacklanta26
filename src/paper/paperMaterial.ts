import { Color, DoubleSide, MeshDepthMaterial, MeshStandardMaterial, RGBADepthPacking, Vector4, type IUniform, type Texture, type WebGLProgramParametersWithUniforms } from 'three'
import { patchDither } from '../lib/dither'
import { cardDims } from './cardGeometry'
import type { PaperEntry } from './types'

// Every paper card shares one shader. It is a MeshStandardMaterial with a few patches, all in this file, so a three.js update can
// only break one place: the cards bow a little (no two are flat the same way), plants sway, wings fold along the center line,
// fish bend along their body, and every copy can shift its hue. The cardboard and the paper edge are picked out by the `solid` flag.

// The shader clock, in seconds. One object for every material; PaperContent advances it each frame.
export const paperClock: IUniform<number> = { value: 0 }

// 0 still, 1 plant (sway + curl), 2 walker (curl), 3 wings (fold along the center line), 4 fish (sine bend), 5 floater (gentle rock)
export type PaperMode = 0 | 1 | 2 | 3 | 4 | 5
export function modeOf(e: PaperEntry): PaperMode {
  if (e.shape === 'plant') return 1
  if (e.shape !== 'card') return 0
  switch (e.behavior) {
    case 'walker2': case 'walker4': return 2
    case 'bird': case 'insect': return 3
    case 'fish': return 4
    case 'floater': return 5
    default: return 0
  }
}

// frequency, amount, amount, amount: what they mean depends on the mode (see DEFORM below)
function motionOf(e: PaperEntry, mode: PaperMode) {
  switch (mode) {
    case 1: return new Vector4(1.4, 0.022, 0.035, 0) // sway speed, sway (fraction of height), curl (fraction of height)
    case 2: return new Vector4(0, 0, 0.03, 0)
    case 3: return e.behavior === 'bird' ? new Vector4(11, 0.9, 1, 0) : new Vector4(22, 1.1, 0, 0) // flaps per second, fold, crease direction (1 = across, 0 = down)
    case 4: return new Vector4(6, 0.1, 0, 0) // wiggles per second, bend
    case 5: return new Vector4(1.1, 0.02, 0.02, 0)
    default: return new Vector4(0, 0, 0.025, 0)
  }
}

export interface PaperUniforms {
  uTime: IUniform<number>
  uCard: IUniform<Vector4> // width, height, which end is the head (+1 right, -1 left)
  uMotion: IUniform<Vector4>
  uBack: IUniform<Vector4> // the plain back's paper color, and how much of it covers the drawing from behind (0 = the card has no plain back)
  uHue: IUniform<number> // 1: a hue shift only touches green (trees blossom pink, their trunks stay brown), 0: it touches every color
}

const BACKS: Record<string, string> = { default: '#f1e8d3' }

export function uniformsFor(e: PaperEntry): PaperUniforms {
  const { w, h } = cardDims(e)
  const mode = modeOf(e)
  const back = new Color(BACKS.default).lerp(new Color(e.colors[0] ?? BACKS.default), 0.12)
  return {
    uTime: paperClock,
    uCard: { value: new Vector4(w, h, e.face === 'L' ? -1 : 1, 0) },
    uMotion: { value: motionOf(e, mode) },
    uBack: { value: new Vector4(back.r, back.g, back.b, e.back === 'plain' ? e.backMix ?? 0.64 : 0) },
    uHue: { value: e.kind === 'tree' || e.kind === 'pine' || e.kind === 'palm' || e.kind === 'bush' || e.kind === 'fern' ? 1 : 0 },
  }
}

// ---------------------------------------------------------------- GLSL
const DECL = /* glsl */ `
attribute vec4 aInfo;   // u, v on the card, solid, card angle
attribute vec4 aAnim;   // per copy: phase, amplitude, hue shift, curl
attribute float aBirth; // per copy: when it popped up
uniform float uTime;
uniform vec4 uCard;
uniform vec4 uMotion;
varying float vSolid;
varying float vHue;
`

const DEFORM = /* glsl */ `
float paperGrow() {
  float g = clamp((uTime - aBirth) / 0.55, 0.0, 1.0);
  float c1 = 1.70158, c3 = c1 + 1.0;
  return 1.0 + c3 * pow(g - 1.0, 3.0) + c1 * pow(g - 1.0, 2.0);
}
// the sideways slope of the paper's curl, used to tilt the normals so a bowed card shades smoothly
float paperSlope() {
  float k = aInfo.x - 0.5;
  float shape = 0.35 + 0.65 * aInfo.y;
  return aAnim.w * uMotion.z * uCard.y * 8.0 * k * shape / max(uCard.x, 1e-3);
}
void paperNormal(inout vec3 n) {
  if (aInfo.z > 0.5) return;
  float ang = aInfo.w;
  vec3 side = vec3(cos(ang), 0.0, -sin(ang));
  n = normalize(n - side * paperSlope());
}
void paperPosition(inout vec3 p) {
  float u = aInfo.x, v = aInfo.y, ang = aInfo.w;
  vec3 side = vec3(cos(ang), 0.0, -sin(ang));
  vec3 axis = vec3(sin(ang), 0.0, cos(ang));
  float W = uCard.x, H = uCard.y;
  float ph = aAnim.x, amp = aAnim.y;
  float k = u - 0.5;
  // every card bows a little, a different way each time
  vec3 off = axis * (aAnim.w * uMotion.z * H * 4.0 * k * k * (0.35 + 0.65 * v));
  #if PAPER_MODE == 1
    // plants lean back and forth, more toward the top
    off += side * (sin(uTime * uMotion.x + ph + v * 1.2) * uMotion.y * H * pow(v, 1.4) * amp);
  #elif PAPER_MODE == 3
    // wings: fold the card along its center line, both halves toward the front, like a V that opens and closes
    float flap = sin(uTime * uMotion.x + ph);
    float fold = (0.1 + 0.9 * flap) * uMotion.y * amp;
    float away = uMotion.z > 0.5 ? abs(v - 0.5) * 2.0 * H : abs(u - 0.5) * 2.0 * W;
    off += axis * (away * fold * 0.5);
  #elif PAPER_MODE == 4
    // fish: a wave runs from the head to the tail, bigger toward the tail
    float s = (u - 0.5) * 2.0 * uCard.z;
    float wave = sin(uTime * uMotion.x + ph - s * 4.0);
    off += axis * (wave * uMotion.y * W * (0.12 + 0.88 * (1.0 - s) * 0.5) * amp);
  #elif PAPER_MODE == 5
    off += axis * (sin(uTime * uMotion.x + ph) * uMotion.y * H * v * amp);
  #endif
  p = (p + off) * paperGrow();
}
`

const HUE = /* glsl */ `
uniform float uHue;
vec3 hueShift(vec3 c, float a) {
  if (abs(a) < 0.001) return c;
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * c;
  float h0 = atan(yiq.z, yiq.y);
  float chroma = length(yiq.yz);
  // only greens move when uHue is 1 (green sits near -1.5 rad here)
  float w = uHue > 0.5 ? smoothstep(-2.4, -1.9, h0) * (1.0 - smoothstep(-0.9, -0.3, h0)) * smoothstep(0.03, 0.08, chroma) : 1.0;
  float h = h0 + a * w;
  return clamp(toRGB * vec3(yiq.x, chroma * cos(h), chroma * sin(h)), 0.0, 1.0);
}
`

const MAP_FRAG = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  if (vSolid > 0.5) {
    // the paper edge and the cardboard: plain, the vertex color gives the tone
    sampledDiffuseColor = vec4(1.0);
  } else {
    sampledDiffuseColor.rgb = hueShift(sampledDiffuseColor.rgb, vHue);
    // the back of a person is the plain side of the paper, with the ink only faintly showing through
    if (!gl_FrontFacing && uBack.w > 0.0) sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, uBack.rgb, uBack.w);
  }
  diffuseColor *= sampledDiffuseColor;
#endif
`

const DEPTH_MAP_FRAG = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  if (vSolid > 0.5) sampledDiffuseColor = vec4(1.0);
  diffuseColor *= sampledDiffuseColor;
#endif
`

function patchMain(shader: WebGLProgramParametersWithUniforms, u: PaperUniforms) {
  patchDither(shader, 2.2)
  Object.assign(shader.uniforms, u)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${DECL}\n${DEFORM}`)
    .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  paperNormal(objectNormal);')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n  paperPosition(transformed);\n  vSolid = aInfo.z;\n  vHue = aAnim.z;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nvarying float vSolid;\nvarying float vHue;\nuniform vec4 uBack;\n${HUE}`)
    .replace('#include <map_fragment>', MAP_FRAG)
}

function patchDepth(shader: WebGLProgramParametersWithUniforms, u: PaperUniforms) {
  Object.assign(shader.uniforms, u)
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${DECL}\n${DEFORM}`)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n  paperPosition(transformed);\n  vSolid = aInfo.z;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vSolid;')
    .replace('#include <map_fragment>', DEPTH_MAP_FRAG)
}

// A little darker than the picture, so the sunny side of white paper does not blow out
const PAPER_TONE = 0.92

export function paperMaterial(e: PaperEntry, map: Texture, u: PaperUniforms) {
  const mode = modeOf(e)
  const m = new MeshStandardMaterial({ map, alphaTest: 0.5, roughness: 0.95, metalness: 0, vertexColors: true, side: DoubleSide })
  m.color.setScalar(PAPER_TONE)
  m.defines = { ...m.defines, PAPER_MODE: mode }
  m.onBeforeCompile = (shader) => patchMain(shader, u)
  m.customProgramCacheKey = () => `paper-main-${mode}`
  return m
}

// The same bending for the shadow pass, so the shadow follows the cut-out shape (and its sway, fold and bend)
export function paperDepthMaterial(e: PaperEntry, u: PaperUniforms) {
  const mode = modeOf(e)
  const m = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, side: DoubleSide })
  m.defines = { ...m.defines, PAPER_MODE: mode }
  m.onBeforeCompile = (shader) => patchDepth(shader, u)
  m.customProgramCacheKey = () => `paper-depth-${mode}`
  return m
}
