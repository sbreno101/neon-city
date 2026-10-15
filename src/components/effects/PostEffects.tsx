import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useMemo } from 'react';
import { Vector2 } from 'three';
import type { QualityProfile } from '../../config/quality';

/**
 * Post-processing chain. The scene is rendered in HDR (neon > 1.0), Bloom
 * only picks up the bright neon thanks to the luminance threshold, then the
 * image is tone mapped once at the end — dark facades and crisp edges stay
 * readable while the lights glow.
 *
 * The list of effects is deliberately the SAME on every quality level:
 * postprocessing merges effects into one generated shader, so adding or
 * removing an effect — or changing a constructor option such as Bloom's
 * `levels` / `resolutionScale` — forces a shader recompile (a 1–2 s freeze
 * measured on an integrated GPU). Profiles only change uniforms (offset,
 * opacity); resolution cost scales through the DPR range instead.
 *
 * MSAA (`multisampling`) is kept off: it produced a black frame through the
 * HDR pipeline on an AMD iGPU (ANGLE / D3D11). The neon lines are already
 * anti-aliased in the shaders.
 */
export function PostEffects({ profile, bloom }: { profile: QualityProfile; bloom: number }) {
  const caOffset = useMemo(
    () => (profile.chromaticAberration ? new Vector2(0.0007, 0.0005) : new Vector2(0, 0)),
    [profile.chromaticAberration],
  );

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        mipmapBlur
        intensity={0.6 * bloom}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.3}
        radius={0.7}
        levels={7}
        resolutionScale={0.75}
      />
      <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.35} />
      <Vignette offset={0.28} darkness={0.62} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={profile.filmGrain ? 0.22 : 0} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}
