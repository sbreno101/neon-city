import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { perfStats } from '../../utils/perfStats';

/**
 * Measures FPS, frame time and draw calls of the whole frame (scene + all
 * post-processing passes). `gl.info` is reset manually at the start of the
 * frame because the composer issues several render calls per frame.
 */
export function PerformanceProbe({ quality }: { quality: string }) {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ frames: 0, time: 0, calls: 0, triangles: 0 });

  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  // runs first: reset counters
  useFrame(() => gl.info.reset(), -100);

  // runs after the composer (priority 1) has rendered
  useFrame((state, delta) => {
    const a = acc.current;
    a.frames++;
    a.time += delta;
    a.calls += gl.info.render.calls;
    a.triangles += gl.info.render.triangles;
    if (a.time >= 0.5) {
      perfStats.publish({
        fps: Math.round(a.frames / a.time),
        frameMs: +((a.time / a.frames) * 1000).toFixed(1),
        drawCalls: Math.round(a.calls / a.frames),
        triangles: Math.round(a.triangles / a.frames),
        dpr: state.viewport.dpr,
        quality,
      });
      a.frames = a.time = a.calls = a.triangles = 0;
    }
  }, 100);

  return null;
}
