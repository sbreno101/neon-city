import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Color, Mesh, ShaderMaterial } from 'three';
import { PALETTE, SCENE_COLORS } from '../../config/palette';
import { useDisposable } from '../../hooks/useDisposable';
import { skyFragmentShader, skyVertexShader } from '../../shaders/skyShader';
import { sharedUniforms } from '../../shaders/uniforms';

/** Procedural sky dome that follows the camera (never reached, never clipped). */
export function Sky({ stars = 1 }: { stars?: number }) {
  const ref = useRef<Mesh>(null);
  const material = useDisposable(
    () =>
      new ShaderMaterial({
        uniforms: {
          ...sharedUniforms,
          uZenith: { value: new Color(SCENE_COLORS.skyZenith) },
          uMid: { value: new Color(SCENE_COLORS.skyMid) },
          uHorizon: { value: new Color(SCENE_COLORS.skyHorizon) },
          uSunTop: { value: new Color(SCENE_COLORS.sunTop) },
          uSunBottom: { value: new Color(SCENE_COLORS.sunBottom) },
          uGridColor: { value: new Color(PALETTE.neonPurple) },
          uSunSize: { value: 0.115 },
          uStars: { value: stars },
        },
        vertexShader: skyVertexShader,
        fragmentShader: skyFragmentShader,
        side: BackSide,
        depthWrite: false,
      }),
    [stars],
  );

  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position);
  });

  return (
    <mesh ref={ref} material={material} frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[1000, 48, 24]} />
    </mesh>
  );
}
