import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls, type CameraControlsImpl } from '@react-three/drei';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { useAppStore } from '../../state/useAppStore';
import { sampleHeight, type CityData } from '../../utils/cityGenerator';
import { cinematicPose, fitToAspect, presetPoses, type CameraPose } from './cameraPaths';

const USER_SMOOTH = 0.45;
const PRESET_SMOOTH = 1.1;
const CINEMATIC_SMOOTH = 1.5;
/** Minimum clearance kept between the camera and the geometry below it. */
const CLEARANCE = 7;

const apply = (c: CameraControlsImpl, pose: CameraPose, animate: boolean) =>
  c.setLookAt(...pose.position, ...pose.target, animate);

/**
 * Aerial camera: cinematic flight, free orbit, panorama and close-up presets.
 * Built on camera-controls (smooth damping, transitions, zoom limits); the
 * city height field keeps the camera from ever entering a building.
 */
export function CameraRig({ city }: { city: CityData }) {
  const ref = useRef<CameraControlsImpl>(null);
  const cinematicTime = useRef(0);
  const mode = useAppStore((s) => s.mode);
  const nonce = useAppStore((s) => s.viewNonce);
  const R = city.coreRadius;
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const aspectRef = useRef(aspect);
  aspectRef.current = aspect;

  // slightly wider lens on portrait screens
  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = aspect < 1 ? 60 : 50;
      camera.updateProjectionMatrix();
    }
  }, [camera, aspect]);

  // limits & initial framing
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.minDistance = 16;
    c.maxDistance = R * 2.6;
    c.minPolarAngle = 0.12;
    c.maxPolarAngle = 1.38;
    c.dollyToCursor = true;
    c.draggingSmoothTime = 0.12;
    c.smoothTime = USER_SMOOTH;
    c.azimuthRotateSpeed = 0.6;
    c.polarRotateSpeed = 0.6;
    c.truckSpeed = 1.2;
    c.setBoundary(new Box3(new Vector3(-R, 0, -R), new Vector3(R, 160, R)));
  }, [R]);

  // first frame is already well framed: jump (no transition) to the cinematic start
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    apply(c, fitToAspect(cinematicPose(cinematicTime.current, R), aspectRef.current), false);
    if (import.meta.env.DEV) {
      // debugging handle for visual QA from the browser console
      (window as unknown as Record<string, unknown>).__neonCamera = c;
      (window as unknown as Record<string, unknown>).__neonCinematic = cinematicTime;
    }
  }, [R]);

  // presets
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (mode === 'panorama' || mode === 'closeup') {
      c.smoothTime = PRESET_SMOOTH;
      apply(c, fitToAspect(presetPoses(R)[mode], aspectRef.current), true);
    } else if (mode === 'orbit') {
      c.smoothTime = USER_SMOOTH;
    }
  }, [mode, nonce, R]);

  // any user drag / wheel / touch takes over from the cinematic flight
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const onStart = () => {
      c.smoothTime = USER_SMOOTH;
      const s = useAppStore.getState();
      if (s.mode === 'cinematic') s.setMode('orbit');
    };
    c.addEventListener('controlstart', onStart);
    return () => c.removeEventListener('controlstart', onStart);
  }, []);

  useFrame(({ camera }, delta) => {
    const c = ref.current;
    if (!c) return;
    const s = useAppStore.getState();
    if (s.mode === 'cinematic') {
      cinematicTime.current += Math.min(delta, 0.1) * s.speed;
      c.smoothTime = CINEMATIC_SMOOTH;
      const pose = fitToAspect(cinematicPose(cinematicTime.current, R), aspectRef.current);
      // lift the flight path over any tower that is close to it
      const [x, y, z] = pose.position;
      pose.position[1] = Math.max(y, sampleHeight(city.heightField, x, z, 16) + 16);
      apply(c, pose, true);
    }
    // safety: keep a clearance above rooftops
    const p = camera.position;
    const minY = sampleHeight(city.heightField, p.x, p.z, 3) + CLEARANCE;
    if (p.y < minY) {
      p.y += (minY - p.y) * 0.35;
      c.setPosition(p.x, p.y, p.z, false);
    }
  });

  return <CameraControls ref={ref} makeDefault />;
}
