import { Color, Vector2, Vector3 } from 'three';
import { SCENE_COLORS } from '../config/palette';

/**
 * Uniforms shared by every custom material. Materials spread this object into
 * their own `uniforms`, so they all reference the same `{ value }` holders and
 * a single update per frame (time, fog) reaches the whole scene.
 */
export const sharedUniforms = {
  uTime: { value: 0 },
  uFogColor: { value: new Color(SCENE_COLORS.fog) },
  uFogDensity: { value: 0.003 },
  /** Radial fade [start, end] that dissolves the city edge into the fog. */
  uFade: { value: new Vector2(300, 420) },
  uSunDir: { value: new Vector3(0, 0.075, -1).normalize() },
  /** Global multipliers driven by the UI. */
  uNeonGain: { value: 1 },
};

export type SharedUniforms = typeof sharedUniforms;
