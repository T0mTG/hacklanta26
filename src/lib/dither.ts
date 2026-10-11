import { Vector3, type Material, type WebGLProgramParametersWithUniforms } from 'three'

// Screen-door fade for anything standing between the camera and the kid, like the stippled trees in the reference.
// The camera rig sets uDOn to 1 in walk mode and points uDTarget at the kid. Everything shares these two uniforms.
export const ditherU = { uDTarget: { value: new Vector3() }, uDOn: { value: 0 } }

const BAYER = `
float bayer4(vec2 p) {
  int x = int(mod(p.x, 4.0)); int y = int(mod(p.y, 4.0));
  float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  return (m[x + y * 4] + 0.5) / 16.0;
}`

// The patch itself, so a material with its own shader changes (the paper cards) can apply it in the same onBeforeCompile
// `spare`: things this close to the kid (in view-space units) never fade, so the kid's own paper body is not stippled away
export function patchDither(shader: WebGLProgramParametersWithUniforms, spare = 0) {
  shader.uniforms.uDTarget = ditherU.uDTarget
  shader.uniforms.uDOn = ditherU.uDOn
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uDTarget;\nuniform float uDOn;\nvarying float vDither;')
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        // distance of this vertex from the camera-to-kid line, in view space (the camera sits at the origin there)
        vec3 tv = (viewMatrix * vec4(uDTarget, 1.0)).xyz;
        float tt = dot(mvPosition.xyz, tv) / max(dot(tv, tv), 1e-4);
        float dd = length(mvPosition.xyz - tv * tt);
        float rr = 0.55 + 1.25 * tt;
        float near = ${spare > 0 ? `smoothstep(${spare.toFixed(2)}, ${(spare * 1.7).toFixed(2)}, length(mvPosition.xyz - tv))` : '1.0'};
        vDither = uDOn * near * step(0.03, tt) * step(tt, 0.96) * (1.0 - smoothstep(rr * 0.5, rr, dd));
      }`,
    )
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nvarying float vDither;\n${BAYER}`)
    .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (vDither > 0.01 && bayer4(gl_FragCoord.xy) < vDither * 0.92) discard;')
}

export function withDither<T extends Material>(mat: T): T {
  mat.onBeforeCompile = (shader) => patchDither(shader)
  return mat
}
