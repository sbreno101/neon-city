import { COMMON_UNIFORMS_GLSL, FOG_GLSL, HASH_GLSL, LINE_GLSL } from './common';

/**
 * Building material.
 *
 * One unit box (base at y = 0) is instanced thousands of times; the instance
 * matrix carries position, rotation and size. Everything that makes the
 * buildings look like neon architecture — outlines, windows, light strips,
 * scan bands — is drawn procedurally here, in metres, so no textures are
 * downloaded and every building looks different.
 *
 * aParams = (seed, facade style, outline gain, lit window ratio)
 */
export const buildingVertexShader = /* glsl */ `
attribute vec3 aAccent;
attribute vec3 aWindow;
attribute vec4 aParams;

varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vNormalObj;
varying vec3 vWorld;
varying vec3 vWorldNormal;
varying vec3 vAccent;
varying vec3 vWin;
varying vec4 vParams;

void main() {
  vScale = vec3(
    length(instanceMatrix[0].xyz),
    length(instanceMatrix[1].xyz),
    length(instanceMatrix[2].xyz)
  );
  vLocal = position * vScale;
  vNormalObj = normal;
  vWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vAccent = aAccent;
  vWin = aWindow;
  vParams = aParams;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const buildingFragmentShader = /* glsl */ `
${COMMON_UNIFORMS_GLSL}
uniform vec3 uBody;
uniform vec3 uRoof;
uniform float uWindowGain;

varying vec3 vLocal;
varying vec3 vScale;
varying vec3 vNormalObj;
varying vec3 vWorld;
varying vec3 vWorldNormal;
varying vec3 vAccent;
varying vec3 vWin;
varying vec4 vParams;

${HASH_GLSL}
${LINE_GLSL}
${FOG_GLSL}

/* Smooth box mask on a [0,1] cell coordinate, anti-aliased with derivatives. */
float cellMask(vec2 f, vec2 fw, vec2 lo, vec2 hi) {
  vec2 a = smoothstep(lo - fw, lo + fw, f) * (1.0 - smoothstep(hi - fw, hi + fw, f));
  return a.x * a.y;
}

void main() {
  float seed = vParams.x;
  float style = vParams.y;
  float edgeK = vParams.z;
  float lit = vParams.w;
  float t = uTime;
  vec3 n = vNormalObj;
  float H = vScale.y;
  float pulse = 0.86 + 0.14 * sin(t * 1.1 + seed * 0.37);

  vec3 color;
  vec3 glow = vec3(0.0);

  if (n.y > 0.5) {
    // ---------------------------------------------------------------- roof
    vec2 halfSize = vScale.xz * 0.5;
    vec2 q = halfSize - abs(vLocal.xz);
    float d = min(q.x, q.y);
    float rim = lineE(d, 0.13);
    float inner = lineE(abs(d - 0.75), 0.04) * step(1.8, min(halfSize.x, halfSize.y));
    color = uRoof;
    glow += vAccent * (rim * 2.8 * edgeK * pulse + inner * 0.7) * uNeonGain;
  } else if (n.y < -0.5) {
    color = uBody;
  } else {
    // ---------------------------------------------------------------- walls
    bool xFace = abs(n.x) > 0.5;
    float u = xFace ? vLocal.z : vLocal.x;
    float W = xFace ? vScale.z : vScale.x;
    float y = vLocal.y;
    float faceSeed = seed + (xFace ? 3.7 : 9.1) + (xFace ? n.x : n.z) * 1.3;
    float uu = u + W * 0.5;

    float dCorner = W * 0.5 - abs(u);
    float dTop = H - y;
    float edge = max(lineE(dCorner, 0.09), lineE(dTop, 0.13));

    color = uBody * (0.65 + 0.7 * clamp(y / 140.0, 0.0, 1.0));

    // window grid ------------------------------------------------------
    bool pixels = style > 2.5 && style < 3.5;
    float fh = pixels ? 0.62 : mix(0.95, 1.55, hash11(seed * 1.3));
    float cw = pixels ? 0.5 : mix(0.75, 1.45, hash11(seed * 2.1));
    vec2 g = vec2(uu / cw, y / fh);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    vec2 fw = fwidth(g);
    float mask = pixels
      ? cellMask(f, fw, vec2(0.14, 0.2), vec2(0.86, 0.8))
      : cellMask(f, fw, vec2(0.2, 0.3), vec2(0.8, 0.76));

    float on = step(hash12(cell + faceSeed), lit);
    // a few windows switch on and off over time
    float dyn = step(hash12(cell * 1.7 + faceSeed + 5.0), 0.14);
    float phase = floor(t * 0.12 + hash12(cell + 11.0) * 23.0);
    float onDyn = step(hash12(cell + phase * 1.31 + faceSeed), lit);
    on = mix(on, onDyn, dyn);

    float bright = 0.3 + 0.95 * hash12(cell + 2.3);
    vec3 wc = mix(vWin, vec3(1.0), hash12(cell + 7.7) * 0.4);
    float inside = step(0.55, dCorner) * step(0.6, y) * step(0.9, dTop);
    float windows = mask * on * bright * inside;

    // fade the pattern into its average when cells get smaller than a pixel
    float lod = 1.0 - smoothstep(0.3, 0.85, max(fw.x, fw.y));
    float avgArea = pixels ? 0.43 : 0.28;
    windows = mix(lit * avgArea * 0.8 * inside, windows, lod);

    float windowGain = 1.0;
    // facade patterns fade with distance so far towers keep dark faces + outline
    float metresPerPixel = max(fwidth(uu), fwidth(y));
    float detail = mix(0.12, 1.0, 1.0 - smoothstep(0.06, 0.45, metresPerPixel));

    if (style > 0.5 && style < 1.5) {
      // vertical neon strips with a slow travelling wave
      float sp = mix(1.6, 3.2, hash11(seed * 4.7));
      float k = floor(uu / sp + 0.5);
      float ds = abs(uu - k * sp);
      float strip = lineE(ds, 0.06) * step(0.45, dCorner) * step(0.3, y);
      float wave = 0.45 + 0.55 * sin(y * 0.22 - t * 1.8 + k * 1.7 + seed);
      glow += vAccent * strip * (0.5 + wave) * 1.35 * detail * uNeonGain;
      windowGain = 0.4;
    } else if (style > 1.5 && style < 2.5) {
      // horizontal floor bands + a scanner sweeping up the facade
      float bs = fh * floor(mix(3.0, 7.0, hash11(seed * 5.3)));
      float db = abs(y - bs * floor(y / bs + 0.5));
      float band = lineE(db, 0.07) * step(0.5, y) * step(0.3, dCorner);
      glow += vAccent * band * 1.15 * detail * uNeonGain;
      float sy = mod(t * 6.0 + seed * 13.0, H + 40.0) - 20.0;
      float scan = exp(-pow((y - sy) / 1.1, 2.0));
      glow += vAccent * scan * 1.4 * mix(0.3, 1.0, detail) * uNeonGain;
      windowGain = 0.8;
    } else if (pixels) {
      windowGain = 1.15;
    } else if (style > 3.5) {
      // dark monolith: a single central light seam
      float seam = lineE(abs(u), 0.07) * step(5.0, H) * step(1.2, W);
      glow += vAccent * seam * 1.3 * detail * uNeonGain;
      windowGain = 0.12;
    }

    glow += wc * windows * 0.85 * windowGain * mix(0.45, 1.0, detail) * uWindowGain;
    glow += vAccent * edge * 2.3 * edgeK * pulse * uNeonGain;
    // reflected street neon at the foot of the building
    glow += vAccent * 0.22 * exp(-y * 0.55);
  }

  // magenta sheen on faces turned towards the synthwave sun, sky fresnel
  float facing = max(dot(vWorldNormal, uSunDir), 0.0);
  color += vec3(0.16, 0.012, 0.14) * pow(facing, 2.0) * 0.07;
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(vWorldNormal, V), 0.0), 3.0);
  color += vec3(0.05, 0.012, 0.12) * fres * 0.3;

  vec3 outColor = color + glow;
  outColor = mix(outColor, uFogColor, fogFactor(vWorld));
  gl_FragColor = vec4(outColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
