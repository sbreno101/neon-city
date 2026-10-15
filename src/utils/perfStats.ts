/**
 * Tiny observable holding real, measured rendering stats. Written by
 * `PerformanceProbe` (inside the canvas) twice per second and read by the
 * FPS meter — no React re-render per frame. Also exposed on
 * `window.__NEON_CITY_STATS__` so performance can be inspected from DevTools.
 */
export interface PerfSnapshot {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  dpr: number;
  quality: string;
}

type Listener = (s: PerfSnapshot) => void;

const listeners = new Set<Listener>();
let current: PerfSnapshot = { fps: 0, frameMs: 0, drawCalls: 0, triangles: 0, dpr: 1, quality: '' };

export const perfStats = {
  get: () => current,
  publish(snapshot: PerfSnapshot) {
    current = snapshot;
    (window as unknown as { __NEON_CITY_STATS__: PerfSnapshot }).__NEON_CITY_STATS__ = snapshot;
    listeners.forEach((l) => l(snapshot));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};
