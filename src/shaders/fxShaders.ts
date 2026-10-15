import { COMMON_UNIFORMS_GLSL, FOG_GLSL } from './common';

/* ========================================================================== */
/* Vertical light beams (instanced open cylinders, additive)                  */
/* ========================================================================== */

export const beamVertexShader = /* glsl */ `
attribute vec3 aAccent;
attribute vec2 aBeam; // phase, intensity
varying float vY;
varying float vFacing;
varying vec3 vWorld;
varying vec3 vAccent;
varying vec2 vBeam;
void main() {
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 axisN = normalize(vec3(normal.x, 0.0, normal.z));
  vec3 toCam = cameraPosition - world.xyz;
  vec3 v = normalize(vec3(toCam.x, 0.0, toCam.z));
  vFacing = abs(dot(axisN, v));
  vY = position.y;
  vWorld = world.xyz;
  vAccent = aAccent;
  vBeam = aBeam;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const beamFragmentShader = /* glsl */ `
${COMMON_UNIFORMS_GLSL}
varying float vY;
varying float vFacing;
varying vec3 vWorld;
varying vec3 vAccent;
varying vec2 vBeam;
${FOG_GLSL}
void main() {
  float core = pow(vFacing, 3.0);
  float fade = pow(1.0 - vY, 1.7);
  float flicker = 0.78 + 0.22 * sin(uTime * 1.7 + vBeam.x) * sin(uTime * 0.53 + vBeam.x * 2.0);
  float base = exp(-vY * 40.0) * 0.8;
  float a = (core * fade + base * core) * flicker * vBeam.y;
  float fog = fogFactor(vWorld);
  // fade beams that pass right next to the camera
  a *= smoothstep(25.0, 90.0, distance(vWorld.xz, cameraPosition.xz));
  vec3 c = vAccent * a * 2.4 * uNeonGain * (1.0 - 0.65 * fog);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;

/* ========================================================================== */
/* Traffic light trails (instanced quads moved entirely on the GPU)          */
/* ========================================================================== */

export const trafficVertexShader = /* glsl */ `
uniform float uTime;
attribute vec4 aLane;   // axis (0 = along X), coord, halfLength, dir
attribute vec4 aMotion; // speed, offset, length, width
attribute vec3 aAccent;
varying float vAlong;
varying float vAcross;
varying float vEndFade;
varying vec3 vAccent;
varying vec3 vWorld;
void main() {
  float halfLen = aLane.z;
  float s = mod(aMotion.y + uTime * aMotion.x, halfLen * 2.0) - halfLen;
  s *= aLane.w;
  vec2 along = aLane.x < 0.5 ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 across = vec2(along.y, along.x);
  vec2 centre = along * s + across * aLane.y;
  // quad: position.x in [-0.5, 0.5] along the motion, position.y across
  vec2 xz = centre + along * (position.x * aMotion.z * aLane.w) + across * (position.y * aMotion.w);
  vAlong = position.x + 0.5; // 1 = head
  vAcross = position.y * 2.0;
  vEndFade = 1.0 - smoothstep(halfLen - 12.0, halfLen, abs(s));
  vAccent = aAccent;
  vec4 world = modelMatrix * vec4(xz.x, 0.06, xz.y, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const trafficFragmentShader = /* glsl */ `
${COMMON_UNIFORMS_GLSL}
varying float vAlong;
varying float vAcross;
varying float vEndFade;
varying vec3 vAccent;
varying vec3 vWorld;
${FOG_GLSL}
void main() {
  float tail = pow(vAlong, 2.2);
  float head = smoothstep(0.86, 1.0, vAlong) * 2.0;
  float w = 1.0 - smoothstep(0.2, 1.0, abs(vAcross));
  float a = (tail + head) * w * vEndFade;
  vec3 c = vAccent * a * 2.2 * uNeonGain * (1.0 - fogFactor(vWorld));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;

/* ========================================================================== */
/* Glow points: beacons, drones and floating particles                        */
/* ========================================================================== */

/**
 * aMode.x: 0 = static beacon, 1 = drone on a looping path, 2 = rising mote.
 * aPath  : beacon -> unused; drone -> (radius, speed, bob, heightOffset);
 *          mote   -> (riseSpeed, wrapHeight, swayAmount, unused)
 */
export const glowPointsVertexShader = /* glsl */ `
uniform float uTime;
uniform float uViewportHeight;
attribute vec3 aAccent;
attribute vec4 aMode;  // mode, phase, size, blinkSpeed
attribute vec4 aPath;
varying vec3 vAccent;
varying float vBlink;
varying vec3 vWorld;
void main() {
  float mode = aMode.x;
  float phase = aMode.y;
  vec3 p = position;
  float blink = 1.0;
  if (mode < 0.5) {
    blink = 0.15 + 0.85 * pow(0.5 + 0.5 * sin(uTime * aMode.w + phase), 6.0);
  } else if (mode < 1.5) {
    float a = uTime * aPath.y + phase;
    p += vec3(cos(a) * aPath.x, sin(uTime * 0.9 + phase) * aPath.z + aPath.w, sin(a * 1.3) * aPath.x * 0.7);
    blink = 0.55 + 0.45 * step(0.5, fract(uTime * aMode.w + phase));
  } else {
    p.y = mod(p.y + uTime * aPath.x, aPath.y);
    p.x += sin(uTime * 0.3 + phase) * aPath.z;
    p.z += cos(uTime * 0.25 + phase) * aPath.z;
    blink = 0.4 + 0.6 * sin(uTime * aMode.w + phase * 5.0) * sin(uTime * aMode.w + phase * 5.0);
    blink *= smoothstep(0.0, 8.0, p.y) * (1.0 - smoothstep(aPath.y - 20.0, aPath.y, p.y));
  }
  vec4 world = modelMatrix * vec4(p, 1.0);
  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aMode.z * projectionMatrix[1][1] * uViewportHeight * 0.5 / -mv.z, 1.5, 48.0);
  vAccent = aAccent;
  vBlink = blink;
  vWorld = world.xyz;
}
`;

export const glowPointsFragmentShader = /* glsl */ `
${COMMON_UNIFORMS_GLSL}
varying vec3 vAccent;
varying float vBlink;
varying vec3 vWorld;
${FOG_GLSL}
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float core = smoothstep(1.0, 0.0, r);
  float a = core * core * vBlink;
  vec3 c = vAccent * a * 2.6 * uNeonGain * (1.0 - fogFactor(vWorld));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;
