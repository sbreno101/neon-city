import { useMemo } from 'react';
import {
  AdditiveBlending,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
} from 'three';
import { useDisposable } from '../../hooks/useDisposable';
import { trafficFragmentShader, trafficVertexShader } from '../../shaders/fxShaders';
import { sharedUniforms } from '../../shaders/uniforms';
import { generateTraffic, type Lane } from '../../utils/cityGenerator';
import { ACCENT_LINEAR, writeColor } from '../../utils/colors';

/**
 * Light trails seen from above. Every trail is one instance; its position is
 * computed in the vertex shader from time, so the CPU does no work per frame.
 */
export function Traffic({ lanes, count }: { lanes: Lane[]; count: number }) {
  const vehicles = useMemo(() => generateTraffic(lanes, count, 4242), [lanes, count]);

  const geometry = useDisposable(() => {
    const base = new PlaneGeometry(1, 1);
    const g = new InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.getAttribute('position'));
    const lane = new Float32Array(vehicles.length * 4);
    const motion = new Float32Array(vehicles.length * 4);
    const accent = new Float32Array(vehicles.length * 3);
    vehicles.forEach((v, i) => {
      const l = lanes[v.lane];
      lane.set([l.axis, l.coord, l.halfLength, l.dir], i * 4);
      motion.set([v.speed, v.offset, v.length, l.avenue ? 0.42 : 0.34], i * 4);
      writeColor(accent, i, ACCENT_LINEAR[v.accent]);
    });
    g.setAttribute('aLane', new InstancedBufferAttribute(lane, 4));
    g.setAttribute('aMotion', new InstancedBufferAttribute(motion, 4));
    g.setAttribute('aAccent', new InstancedBufferAttribute(accent, 3));
    g.instanceCount = vehicles.length;
    return g;
  }, [vehicles, lanes]);

  const material = useDisposable(
    () =>
      new ShaderMaterial({
        uniforms: { ...sharedUniforms },
        vertexShader: trafficVertexShader,
        fragmentShader: trafficFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [],
  );

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
