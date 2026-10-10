import { BackSide, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { withDither } from '../lib/dither'
import { palette } from '../data/theme'

// Shared materials: every prop uses these, so the shader programs compile once and the dither fade applies to all of them.
export const MAT = {
  // flat-shaded props with per-vertex color
  body: withDither(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 })),
  // the dark inflated hull that draws the outline
  hull: withDither(new MeshBasicMaterial({ color: palette.outline, side: BackSide })),
  // terrain never fades out
  ground: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }),
  // lit but not outlined, for things like characters' faces
  soft: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }),
}
