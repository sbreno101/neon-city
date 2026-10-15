import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, FogExp2 } from 'three';
import { SCENE_COLORS } from '../../config/palette';
import { sharedUniforms } from '../../shaders/uniforms';

interface Props {
  fogDensity: number;
  fadeStart: number;
  fadeEnd: number;
  neonGain: number;
}

/**
 * Drives the shared uniforms once per frame (time, breathing fog, neon gain)
 * and mirrors the fog on `scene.fog` for the few built-in materials.
 */
export function Atmosphere({ fogDensity, fadeStart, fadeEnd, neonGain }: Props) {
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const color = new Color(SCENE_COLORS.fog);
    scene.background = color;
    scene.fog = new FogExp2(color, fogDensity);
    sharedUniforms.uFade.value.set(fadeStart, fadeEnd);
    return () => {
      scene.fog = null;
    };
  }, [scene, fogDensity, fadeStart, fadeEnd]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    sharedUniforms.uTime.value = t;
    // slow "breathing" of the haze
    const density = fogDensity * (1 + 0.06 * Math.sin(t * 0.11) + 0.03 * Math.sin(t * 0.37));
    sharedUniforms.uFogDensity.value = density;
    if (scene.fog instanceof FogExp2) scene.fog.density = density;
    const u = sharedUniforms.uNeonGain;
    u.value += (neonGain - u.value) * 0.1;
  });

  return null;
}
