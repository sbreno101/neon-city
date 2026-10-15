import { COMMON_UNIFORMS_GLSL, HASH_GLSL, LINE_GLSL } from './common';

/**
 * Sky dome: purple gradient, magenta horizon, striped synthwave sun, a faint
 * digital grid near the horizon, twinkling stars and slow atmospheric bands.
 * Rendered at the far plane on a sphere that follows the camera.
 */
export const skyVertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = clip.xyww; // always at the far plane
}
`;

export const skyFragmentShader = /* glsl */ `
${COMMON_UNIFORMS_GLSL}
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunTop;
uniform vec3 uSunBottom;
uniform vec3 uGridColor;
uniform float uSunSize;
uniform float uStars;

varying vec3 vDir;

${HASH_GLSL}
${LINE_GLSL}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float t = uTime;

  // vertical gradient — the horizon blends into the fog colour
  vec3 col = mix(uFogColor, uHorizon, smoothstep(-0.03, 0.07, h));
  col = mix(col, uMid, smoothstep(0.05, 0.32, h));
  col = mix(col, uZenith, smoothstep(0.28, 0.9, h));

  // pink haze towards the sun
  vec2 dxz = normalize(d.xz + 1e-5);
  float towardSun = max(dot(dxz, normalize(uSunDir.xz)), 0.0);
  col += uSunBottom * pow(towardSun, 5.0) * exp(-max(h, 0.0) * 7.0) * 0.28;

  // slow atmospheric bands
  float band = sin(h * 38.0 + sin(atan(d.z, d.x) * 3.0 + t * 0.05) * 1.6 - t * 0.08);
  col += uMid * smoothstep(0.6, 1.0, band) * 0.06 * smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.25, 0.5, h));

  // horizon line
  col += uSunBottom * lineAA(abs(h - 0.004), 0.0015) * 0.5;

  // digital grid near the horizon
  float az = atan(d.z, d.x) / 6.2831853 * 72.0;
  float elev = asin(clamp(h, -1.0, 1.0)) / 1.5707963 * 18.0;
  float gl = max(lineAA(abs(fract(az + 0.5) - 0.5), 0.02), lineAA(abs(fract(elev + 0.5) - 0.5), 0.03));
  float gridMask = smoothstep(0.0, 0.03, h) * (1.0 - smoothstep(0.1, 0.42, h));
  col += uGridColor * gl * gridMask * 0.09 * uNeonGain;

  // stars
  vec2 sc = vec2(atan(d.z, d.x) * 140.0, asin(clamp(h, -1.0, 1.0)) * 140.0);
  vec2 sid = floor(sc);
  float sh = hash12(sid);
  vec2 sp = fract(sc) - vec2(hash12(sid + 1.3), hash12(sid + 7.1)) * 0.6 - 0.2;
  float star = step(0.985, sh) * smoothstep(0.12, 0.0, length(sp));
  float twinkle = 0.55 + 0.45 * sin(t * (1.0 + sh * 3.0) + sh * 50.0);
  col += vec3(0.85, 0.9, 1.0) * star * twinkle * smoothstep(0.08, 0.35, h) * uStars;

  // synthwave sun
  vec3 right = normalize(cross(uSunDir, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, uSunDir);
  vec2 s = vec2(dot(d, right), dot(d, up)) / uSunSize;
  float facing = step(0.0, dot(d, uSunDir));
  float sr = length(s);
  float aa = fwidth(sr) * 1.5;
  float disc = (1.0 - smoothstep(1.0 - aa, 1.0 + aa, sr)) * facing;
  // horizontal cuts that thicken towards the bottom and scroll slowly
  float cutAmount = smoothstep(0.3, -1.0, s.y) * 0.62;
  float stripe = fract(s.y * 6.5 + t * 0.12);
  float cuts = smoothstep(cutAmount - 0.03, cutAmount + 0.03, stripe);
  vec3 sunCol = mix(uSunBottom, uSunTop, smoothstep(-0.9, 0.85, s.y));
  col = mix(col, sunCol * 1.9, disc * mix(1.0, cuts, step(s.y, 0.3)));
  col += uSunBottom * exp(-max(sr - 1.0, 0.0) * 2.4) * 0.22 * facing;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
