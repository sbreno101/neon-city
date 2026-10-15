/** GLSL snippets reused by several materials. */

export const COMMON_UNIFORMS_GLSL = /* glsl */ `
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec2 uFade;
uniform vec3 uSunDir;
uniform float uNeonGain;
`;

export const HASH_GLSL = /* glsl */ `
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

/** Anti-aliased line: 1 when distance `d` < `w`, smooth falloff of ~1.5px. */
export const LINE_GLSL = /* glsl */ `
float lineAA(float d, float w) {
  float fw = max(fwidth(d), 1e-4);
  return 1.0 - smoothstep(w, w + fw * 1.5, d);
}
/* Energy-conserving line: once thinner than a pixel it dims instead of
   growing, so distant buildings do not turn into solid blobs of neon. */
float lineE(float d, float w) {
  float fw = max(fwidth(d), 1e-4);
  float ww = max(w, fw * 0.75);
  float cov = 1.0 - smoothstep(ww, ww + fw, d);
  return cov * clamp(w / ww, 0.07, 1.0);
}
`;

/** Exponential-squared distance fog combined with a radial fade of the city edge. */
export const FOG_GLSL = /* glsl */ `
float fogFactor(vec3 worldPos) {
  float dist = distance(worldPos, cameraPosition);
  float f = 1.0 - exp(-pow(uFogDensity * dist, 2.0));
  float radial = smoothstep(uFade.x, uFade.y, length(worldPos.xz));
  return clamp(max(f, radial), 0.0, 1.0);
}
`;
