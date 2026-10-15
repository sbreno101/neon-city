import { useEffect, useMemo } from 'react';
import {
  BoxGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three';
import { PITCH } from '../../config/city';
import { SCENE_COLORS } from '../../config/palette';
import { useDisposable } from '../../hooks/useDisposable';
import { buildingFragmentShader, buildingVertexShader } from '../../shaders/buildingShader';
import { sharedUniforms } from '../../shaders/uniforms';
import { ACCENT_LINEAR, WINDOW_LINEAR, writeColor } from '../../utils/colors';
import type { BoxInstance } from '../../utils/cityGenerator';

/** Buildings are grouped in square chunks so three.js can frustum-cull them. */
const CHUNK_SIZE = PITCH * 6;

/** Unit box with its base at y = 0 and without the (never visible) bottom face. */
function createBoxGeometry(): BoxGeometry {
  const geometry = new BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);
  const index = geometry.getIndex()!;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z (6 indices each).
  // Dropping -y also avoids z-fighting between stacked sections.
  const kept = Array.from(index.array as ArrayLike<number>).filter((_, i) => i < 18 || i >= 24);
  geometry.setIndex(kept);
  geometry.clearGroups();
  return geometry;
}

function buildChunk(boxes: BoxInstance[]): InstancedMesh {
  const geometry = createBoxGeometry();
  const count = boxes.length;
  const accent = new Float32Array(count * 3);
  const windows = new Float32Array(count * 3);
  const params = new Float32Array(count * 4);

  const mesh = new InstancedMesh(geometry, undefined, count);
  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const pos = new Vector3();
  const scale = new Vector3();

  boxes.forEach((b, i) => {
    q.setFromAxisAngle(up, b.rotY);
    m.compose(pos.set(b.x, b.y, b.z), q, scale.set(b.w, b.h, b.d));
    mesh.setMatrixAt(i, m);
    writeColor(accent, i, ACCENT_LINEAR[b.accent]);
    writeColor(windows, i, WINDOW_LINEAR[b.windowColor]);
    params.set([b.seed, b.style, b.edge, b.lit], i * 4);
  });

  geometry.setAttribute('aAccent', new InstancedBufferAttribute(accent, 3));
  geometry.setAttribute('aWindow', new InstancedBufferAttribute(windows, 3));
  geometry.setAttribute('aParams', new InstancedBufferAttribute(params, 4));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}

export function Buildings({ boxes }: { boxes: BoxInstance[] }) {
  const material = useDisposable(
    () =>
      new ShaderMaterial({
        uniforms: {
          ...sharedUniforms,
          uBody: { value: new Color(SCENE_COLORS.buildingBody) },
          uRoof: { value: new Color(SCENE_COLORS.buildingTop) },
          uWindowGain: { value: 1 },
        },
        vertexShader: buildingVertexShader,
        fragmentShader: buildingFragmentShader,
      }),
    [],
  );

  const chunks = useMemo(() => {
    const groups = new Map<string, BoxInstance[]>();
    for (const b of boxes) {
      const key = `${Math.floor(b.x / CHUNK_SIZE)}:${Math.floor(b.z / CHUNK_SIZE)}`;
      let list = groups.get(key);
      if (!list) groups.set(key, (list = []));
      list.push(b);
    }
    return [...groups.values()].map(buildChunk);
  }, [boxes]);

  useEffect(
    () => () => {
      for (const mesh of chunks) {
        mesh.geometry.dispose();
        mesh.dispose();
      }
    },
    [chunks],
  );

  return (
    <group name="buildings">
      {chunks.map((mesh, i) => (
        <primitive key={i} object={mesh} material={material} />
      ))}
    </group>
  );
}
