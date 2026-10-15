import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from 'three';
import { ACCENT } from '../../config/palette';
import { useDisposable } from '../../hooks/useDisposable';
import { glowPointsFragmentShader, glowPointsVertexShader } from '../../shaders/fxShaders';
import { sharedUniforms } from '../../shaders/uniforms';
import type { Beacon } from '../../utils/cityGenerator';
import { ACCENT_LINEAR, writeColor } from '../../utils/colors';
import { mulberry32, range, weighted } from '../../utils/random';

interface Props {
  beacons: Beacon[];
  drones: number;
  particles: number;
  coreRadius: number;
}

/**
 * Every small glowing dot of the scene in ONE draw call:
 * blinking antenna beacons, drones looping between towers and slow rising motes.
 * Motion is computed in the vertex shader (see `glowPointsVertexShader`).
 */
export function GlowPoints({ beacons, drones, particles, coreRadius }: Props) {
  const geometry = useDisposable(() => {
    const rng = mulberry32(777);
    const total = beacons.length + drones + particles;
    const position = new Float32Array(total * 3);
    const accent = new Float32Array(total * 3);
    const mode = new Float32Array(total * 4);
    const path = new Float32Array(total * 4);
    let i = 0;

    for (const b of beacons) {
      position.set([b.x, b.y, b.z], i * 3);
      writeColor(accent, i, ACCENT_LINEAR[b.accent]);
      mode.set([0, b.phase, 1.1 * b.size, range(rng, 1.2, 2.4)], i * 4);
      i++;
    }

    for (let k = 0; k < drones; k++) {
      const r = Math.sqrt(rng()) * coreRadius * 0.75;
      const a = rng() * Math.PI * 2;
      position.set([Math.cos(a) * r, range(rng, 35, 120), Math.sin(a) * r], i * 3);
      const color = [ACCENT.cyan, ACCENT.pink, ACCENT.white][weighted(rng, [45, 40, 15])];
      writeColor(accent, i, ACCENT_LINEAR[color]);
      mode.set([1, rng() * 6.28, range(rng, 0.7, 1.1), range(rng, 0.8, 1.6)], i * 4);
      path.set([range(rng, 10, 45), range(rng, 0.05, 0.16) * (rng() < 0.5 ? -1 : 1), range(rng, 1, 4), 0], i * 4);
      i++;
    }

    for (let k = 0; k < particles; k++) {
      const r = Math.sqrt(rng()) * coreRadius * 1.05;
      const a = rng() * Math.PI * 2;
      position.set([Math.cos(a) * r, rng() * 170, Math.sin(a) * r], i * 3);
      const color = [ACCENT.pink, ACCENT.cyan, ACCENT.purple][weighted(rng, [40, 40, 20])];
      writeColor(accent, i, ACCENT_LINEAR[color]);
      mode.set([2, rng() * 6.28, range(rng, 0.18, 0.4), range(rng, 0.4, 1.4)], i * 4);
      path.set([range(rng, 0.6, 2.2), 170, range(rng, 1, 5), 0], i * 4);
      i++;
    }

    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(position, 3));
    g.setAttribute('aAccent', new BufferAttribute(accent, 3));
    g.setAttribute('aMode', new BufferAttribute(mode, 4));
    g.setAttribute('aPath', new BufferAttribute(path, 4));
    return g;
  }, [beacons, drones, particles, coreRadius]);

  const material = useDisposable(
    () =>
      new ShaderMaterial({
        uniforms: { ...sharedUniforms, uViewportHeight: { value: 1000 } },
        vertexShader: glowPointsVertexShader,
        fragmentShader: glowPointsFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  useFrame(({ size, viewport }) => {
    material.uniforms.uViewportHeight.value = size.height * viewport.dpr;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}
