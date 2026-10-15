import { Color, ShaderMaterial } from 'three';
import { CITY, PITCH } from '../../config/city';
import { PALETTE, SCENE_COLORS } from '../../config/palette';
import { useDisposable } from '../../hooks/useDisposable';
import { groundFragmentShader, groundVertexShader } from '../../shaders/groundShader';
import { sharedUniforms } from '../../shaders/uniforms';

export function Ground({ coreRadius, farRadius }: { coreRadius: number; farRadius: number }) {
  const material = useDisposable(
    () =>
      new ShaderMaterial({
        uniforms: {
          ...sharedUniforms,
          uPitch: { value: PITCH },
          uBlock: { value: CITY.block },
          uCore: { value: coreRadius },
          uAvenueEvery: { value: CITY.avenueEvery },
          uGround: { value: new Color(SCENE_COLORS.ground) },
          uStreet: { value: new Color(SCENE_COLORS.street) },
          uCyan: { value: new Color(PALETTE.cyan) },
          uPink: { value: new Color(PALETTE.neonPink) },
          uPurple: { value: new Color(PALETTE.neonPurple) },
          uBlue: { value: new Color(PALETTE.electricBlue) },
        },
        vertexShader: groundVertexShader,
        fragmentShader: groundFragmentShader,
      }),
    [coreRadius],
  );

  const size = (farRadius + 900) * 2;
  return (
    <mesh rotation-x={-Math.PI / 2} material={material} matrixAutoUpdate={false} onUpdate={(m) => m.updateMatrix()}>
      <planeGeometry args={[size, size, 1, 1]} />
    </mesh>
  );
}
