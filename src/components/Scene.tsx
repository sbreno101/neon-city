import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { QUALITY_PROFILES } from '../config/quality';
import { useAppStore } from '../state/useAppStore';
import { CameraRig } from './camera/CameraRig';
import { City, useCityData } from './city/City';
import { DevBench } from './effects/DevBench';
import { PerformanceProbe } from './effects/PerformanceProbe';
import { PostEffects } from './effects/PostEffects';
import { Atmosphere } from './environment/Atmosphere';
import { Sky } from './environment/Sky';

/** Flags the loading screen once a few real frames have been rendered. */
function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 4) useAppStore.getState().setStage('ready');
  });
  return null;
}

export function Scene() {
  const quality = useAppStore((s) => s.quality);
  const bloom = useAppStore((s) => s.bloom);
  const neon = useAppStore((s) => s.neon);
  const profile = QUALITY_PROFILES[quality];
  const city = useCityData(profile);

  // Adaptive resolution inside the profile's DPR range.
  const maxDpr = Math.min(window.devicePixelRatio || 1, profile.dpr[1]);
  const minDpr = Math.min(maxDpr, profile.dpr[0]);
  const [dpr, setDpr] = useState(maxDpr);
  useEffect(() => setDpr(maxDpr), [maxDpr]);

  return (
    <Canvas
      flat
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 50, near: 1, far: 4000, position: [60, 60, 160] }}
      onCreated={() => useAppStore.getState().setStage('compiling')}
    >
      <PerformanceMonitor
        flipflops={4}
        // decline below ~50 FPS on 60 Hz screens (drei defaults to 40)
        bounds={(refresh) => (refresh > 100 ? [60, 100] : [50, 59])}
        onDecline={() => setDpr((d) => Math.max(minDpr, +(d - 0.25).toFixed(2)))}
        onIncline={() => setDpr((d) => Math.min(maxDpr, +(d + 0.25).toFixed(2)))}
      />
      <Atmosphere
        fogDensity={profile.fogDensity}
        fadeStart={city.farRadius * 0.62}
        fadeEnd={city.farRadius * 1.02}
        neonGain={neon}
      />
      <Sky />
      <City city={city} profile={profile} />
      <CameraRig city={city} />
      <PostEffects profile={profile} bloom={bloom} />
      <PerformanceProbe quality={quality} />
      <ReadySignal />
      {import.meta.env.DEV && <DevBench />}
    </Canvas>
  );
}
