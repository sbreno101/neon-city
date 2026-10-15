import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Group, Mesh } from 'three';
import { PALETTE } from '../../config/palette';
import type { CityData } from '../../utils/cityGenerator';

/** HDR colour (values > 1 so bloom picks it up). */
const hdr = (hex: string, k: number) => new Color(hex).multiplyScalar(k);

const RING_CYAN = hdr(PALETTE.cyan, 2.2);
const RING_PINK = hdr(PALETTE.neonPink, 2.4);
const HOLO_PINK = hdr(PALETTE.neonPink, 2.6);
const HOLO_INNER = hdr(PALETTE.neonPurple, 1.4);

/** Rotating halo rings around the central tower. */
function LandmarkRings({ landmark }: { landmark: CityData['landmark'] }) {
  const rings = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      ring.rotation.z = t * (i % 2 ? -0.25 : 0.18);
      ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.4 + i) * 0.06;
      ring.position.y = landmark.ringHeights[i] + Math.sin(t * 0.6 + i * 2) * 1.2;
    });
  });
  return (
    <group position={[landmark.x, 0, landmark.z]}>
      {landmark.ringHeights.map((h, i) => (
        <mesh key={h} ref={(m) => void (rings.current[i] = m)} position-y={h} rotation-x={Math.PI / 2}>
          <torusGeometry args={[7.5 + i * 1.6, 0.09, 6, 96]} />
          <meshBasicMaterial
            color={i % 2 ? RING_PINK : RING_CYAN}
            toneMapped={false}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Floating wireframe hologram above a rooftop (inspired by the pink heart of ref. 2). */
function Hologram({ position }: { position: CityData['hologram'] }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.y = t * 0.35;
    g.position.y = position.y + Math.sin(t * 0.8) * 1.4;
    const s = 1 + Math.sin(t * 2.2) * 0.025;
    g.scale.setScalar(s);
  });
  return (
    <group ref={group} position={[position.x, position.y, position.z]}>
      <mesh>
        <icosahedronGeometry args={[7, 1]} />
        <meshBasicMaterial
          color={HOLO_PINK}
          wireframe
          toneMapped={false}
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-y={0.6}>
        <icosahedronGeometry args={[4.2, 0]} />
        <meshBasicMaterial
          color={HOLO_INNER}
          wireframe
          toneMapped={false}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* projector cone towards the roof */}
      <mesh position-y={-9} rotation-x={Math.PI}>
        <coneGeometry args={[6, 12, 24, 1, true]} />
        <meshBasicMaterial
          color={HOLO_INNER}
          toneMapped={false}
          transparent
          opacity={0.12}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function LandmarkFx({ city }: { city: CityData }) {
  return (
    <>
      <LandmarkRings landmark={city.landmark} />
      <Hologram position={city.hologram} />
    </>
  );
}
