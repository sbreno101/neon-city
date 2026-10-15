import { COMMON_UNIFORMS_GLSL, FOG_GLSL, HASH_GLSL, LINE_GLSL } from './common';

/**
 * Ground: blocks, curbs, streets, avenues and the synthwave grid beyond the
 * city, all computed from world coordinates in a single full-screen-ish plane.
 * The layout constants come from `config/city.ts` (same as the generator).
 */
export const groundVertexShader = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const groundFragmentShader = /* glsl */ `
${COMMON_UNIFORMS_GLSL}
uniform float uPitch;
uniform float uBlock;
uniform float uCore;
uniform float uAvenueEvery;
uniform vec3 uGround;
uniform vec3 uStreet;
uniform vec3 uCyan;
uniform vec3 uPink;
uniform vec3 uPurple;
uniform vec3 uBlue;

varying vec3 vWorld;

${HASH_GLSL}
${LINE_GLSL}
${FOG_GLSL}

float isAvenue(float k) {
  return 1.0 - step(0.5, abs(mod(k, uAvenueEvery) - 1.0));
}

void main() {
  vec2 p = vWorld.xz;
  float t = uTime;
  float r = length(p);
  float hb = uBlock * 0.5;
  vec2 cell = p - uPitch * floor(p / uPitch + 0.5);
  vec2 a = abs(cell);
  float coreMask = 1.0 - smoothstep(uCore - 6.0, uCore + uPitch * 1.5, r);

  float inBlock = step(a.x, hb) * step(a.y, hb);
  float streetX = step(hb, a.x) * step(a.y, hb); // street running along Z
  float streetZ = step(hb, a.y) * step(a.x, hb); // street running along X
  float crossing = step(hb, a.x) * step(hb, a.y);

  vec3 col = mix(uStreet, uGround, inBlock);
  vec3 glow = vec3(0.0);

  // ------------------------------------------------------------ blocks
  float dEdge = min(hb - a.x, hb - a.y);
  float curb = lineAA(abs(dEdge - 0.22), 0.07) * inBlock;
  float curb2 = lineAA(abs(dEdge - 0.95), 0.03) * inBlock;
  vec2 gm = abs(p - 2.0 * floor(p / 2.0 + 0.5));
  float fine = max(lineAA(gm.x, 0.02), lineAA(gm.y, 0.02)) * inBlock;
  float fineLod = 1.0 - smoothstep(0.25, 0.6, max(fwidth(p.x), fwidth(p.y)) / 2.0);
  // per-block colour variety on the platform outline
  vec2 blockId = floor(p / uPitch + 0.5);
  float bh = hash12(blockId + 3.0);
  vec3 curbCol = bh < 0.55 ? uCyan : (bh < 0.8 ? uPurple : uPink);
  glow += curbCol * curb * 1.25 + curbCol * curb2 * 0.35;
  glow += uPurple * fine * 0.07 * fineLod;

  // ------------------------------------------------------------ streets
  float kx = floor(p.x / uPitch);
  float kz = floor(p.y / uPitch);
  float avX = isAvenue(kx);
  float avZ = isAvenue(kz);
  float scx = uPitch * 0.5 - a.x; // distance to the centre line of a Z street
  float scz = uPitch * 0.5 - a.y;

  // regular streets: thin violet centre line + dashed lane dividers
  float dashZ = step(0.45, fract(p.y / 3.2));
  float dashX = step(0.45, fract(p.x / 3.2));
  float lineX = lineAA(scx, 0.05) * (1.0 - avX) + lineAA(abs(scx - 1.0), 0.035) * dashZ * 0.4;
  float lineZ = lineAA(scz, 0.05) * (1.0 - avZ) + lineAA(abs(scz - 1.0), 0.035) * dashX * 0.4;
  glow += uPurple * (lineX * streetX + lineZ * streetZ) * 0.9;

  // avenues: double pink centre lines with data pulses running along them
  float pulseX = pow(0.5 + 0.5 * sin(p.y * 0.06 - t * 2.2 + kx), 10.0);
  float pulseZ = pow(0.5 + 0.5 * sin(p.x * 0.06 - t * 2.2 + kz), 10.0);
  float avLineX = lineAA(abs(scx - 0.18), 0.045) * avX;
  float avLineZ = lineAA(abs(scz - 0.18), 0.045) * avZ;
  float avLaneX = lineAA(abs(scx - 1.05), 0.03) * avX * dashZ;
  float avLaneZ = lineAA(abs(scz - 1.05), 0.03) * avZ * dashX;
  glow += uPink * (avLineX * streetX * (1.0 + 2.5 * pulseX) + avLineZ * streetZ * (1.0 + 2.5 * pulseZ)) * 1.1;
  glow += uBlue * (avLaneX * streetX + avLaneZ * streetZ) * 0.45;

  // intersections: faint diamond marker
  float diamond = lineAA(abs(abs(uPitch * 0.5 - a.x) + abs(uPitch * 0.5 - a.y) - 1.2), 0.04);
  glow += uCyan * diamond * 0.45 * crossing;

  // the detailed street network fades out with the core of the city
  glow *= mix(0.35, 1.0, coreMask) * uNeonGain;

  // ------------------------------------------------------------ synthwave grid
  float gs = uPitch * 0.5;
  vec2 gg = abs(p - gs * floor(p / gs + 0.5));
  float grid = max(lineAA(gg.x, 0.09), lineAA(gg.y, 0.09));
  float outer = smoothstep(uCore * 0.85, uCore + uPitch * 3.0, r);
  glow += mix(uPurple, uPink, 0.35) * grid * outer * 0.9 * uNeonGain;

  // warm glow pooled around downtown
  col += uPurple * 0.06 * exp(-r / 90.0);

  vec3 outColor = mix(col + glow, uFogColor, fogFactor(vWorld));
  gl_FragColor = vec4(outColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
