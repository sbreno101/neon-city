import { PITCH } from '../../config/city';

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

const wave = (t: number, freq: number, phase = 0) => 0.5 - 0.5 * Math.cos(t * freq + phase);

/**
 * Slow cinematic flight around the city. `t` is "cinematic time" (seconds
 * scaled by the speed setting). The orbit radius, altitude and look-at point
 * drift on incommensurable frequencies so the shot never visibly repeats:
 * low horizon views with the synthwave sun alternate with steep aerial views.
 */
export function cinematicPose(t: number, coreRadius: number): CameraPose {
  const R = coreRadius;
  const theta = 0.5 + t * 0.028;
  // 0 = low horizon shot from the city edge, 1 = high aerial view over downtown
  const a = wave(t, 0.024) * (0.78 + 0.22 * wave(t, 0.061)) * 0.85;
  const radius = R * (1.04 - 0.5 * a);
  const height = 42 + R * 0.1 + (R * 0.75 + 20) * a + Math.sin(t * 0.09) * 4;
  const target: [number, number, number] = [
    Math.sin(t * 0.019) * R * 0.12,
    58 - 48 * a + Math.sin(t * 0.07) * 3,
    Math.cos(t * 0.016) * R * 0.12,
  ];
  return {
    position: [Math.sin(theta) * radius, height, Math.cos(theta) * radius],
    target,
  };
}

/**
 * Portrait screens see much less horizontally: pull the camera back along
 * its view direction so the composition still shows the skyline.
 */
export function fitToAspect(pose: CameraPose, aspect: number): CameraPose {
  if (aspect >= 1.2) return pose;
  const k = Math.min(1.9, Math.pow(1.2 / aspect, 0.75));
  const [px, py, pz] = pose.position;
  const [tx, ty, tz] = pose.target;
  return {
    position: [tx + (px - tx) * k, ty + (py - ty) * k, tz + (pz - tz) * k],
    target: pose.target,
  };
}

export function presetPoses(coreRadius: number): Record<'panorama' | 'closeup', CameraPose> {
  const R = coreRadius;
  return {
    // high, wide establishing shot showing the full extent and the skyline
    panorama: {
      position: [-R * 0.62, R * 0.78 + 50, R * 1.32],
      target: [0, 8, -R * 0.2],
    },
    // low above an intersection next to downtown, looking up at the landmark
    closeup: {
      position: [PITCH * 1.5, 46, PITCH * 3.5],
      target: [0, 92, 0],
    },
  };
}
