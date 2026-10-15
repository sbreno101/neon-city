import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  CylinderGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  ShaderMaterial,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { beamFragmentShader, beamVertexShader } from '../../shaders/fxShaders';
import { sharedUniforms } from '../../shaders/uniforms';
import type { Beam } from '../../utils/cityGenerator';
import { ACCENT_LINEAR, writeColor } from '../../utils/colors';

/** Vertical light pillars shooting out of rooftops into the purple sky. */
export function LightBeams({ beams }: { beams: Beam[] }) {
  const material = useDisposable(
    () =>
      new ShaderMaterial({
        uniforms: { ...sharedUniforms },
        vertexShader: beamVertexShader,
        fragmentShader: beamFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  const mesh = useMemo(() => {
    const geometry = new CylinderGeometry(1, 1, 1, 10, 1, true);
    geometry.translate(0, 0.5, 0);
    const accent = new Float32Array(beams.length * 3);
    const params = new Float32Array(beams.length * 2);
    const instanced = new InstancedMesh(geometry, undefined, beams.length);
    const m = new Matrix4();
    beams.forEach((b, i) => {
      m.makeScale(b.radius, b.height, b.radius).setPosition(b.x, b.y, b.z);
      instanced.setMatrixAt(i, m);
      writeColor(accent, i, ACCENT_LINEAR[b.accent]);
      params.set([b.phase, b.height > 400 ? 1.4 : 1], i * 2);
    });
    geometry.setAttribute('aAccent', new InstancedBufferAttribute(accent, 3));
    geometry.setAttribute('aBeam', new InstancedBufferAttribute(params, 2));
    instanced.computeBoundingSphere();
    instanced.renderOrder = 3;
    return instanced;
  }, [beams]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      mesh.dispose();
    },
    [mesh],
  );

  return <primitive object={mesh} material={material} />;
}
