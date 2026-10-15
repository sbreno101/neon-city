import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Development-only benchmark: `await window.__neonBench(60)` renders N frames
 * back-to-back (independent of requestAnimationFrame throttling) and forces a
 * GPU sync after each one, returning the measured average frame cost.
 * Tree-shaken from production builds.
 */
export function DevBench() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__neonGl = get().gl;
    w.__neonBench = async (frames = 60) => {
      const state = get();
      const ctx = state.gl.getContext();
      const pixel = new Uint8Array(4);
      // warm-up
      for (let i = 0; i < 3; i++) state.advance(performance.now());
      const times: number[] = [];
      for (let i = 0; i < frames; i++) {
        const t0 = performance.now();
        state.advance(t0);
        ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, pixel);
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const size = state.gl.getDrawingBufferSize(new (await import('three')).Vector2());
      return {
        avgMs: +avg.toFixed(2),
        medianMs: +times[Math.floor(times.length / 2)].toFixed(2),
        p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(2),
        estFps: Math.round(1000 / avg),
        buffer: `${size.x}x${size.y}`,
        calls: state.gl.info.render.calls,
      };
    };
    return () => {
      delete w.__neonBench;
      delete w.__neonGl;
    };
  }, [get]);
  return null;
}
