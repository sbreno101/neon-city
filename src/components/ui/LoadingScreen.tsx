import { useEffect, useState } from 'react';
import { STRINGS } from '../../config/strings';
import { useAppStore, type LoadingStage } from '../../state/useAppStore';

const PROGRESS: Record<LoadingStage, number> = {
  boot: 12,
  generating: 40,
  compiling: 78,
  ready: 100,
};

/**
 * Full-screen loader. It mirrors the static markup in index.html (shown
 * before the JS bundle arrives) and fades out once real frames are rendered.
 */
export function LoadingScreen() {
  const stage = useAppStore((s) => s.stage);
  const [gone, setGone] = useState(false);
  const ready = stage === 'ready';

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setGone(true), 1600);
    return () => window.clearTimeout(t);
  }, [ready]);

  if (gone) return null;

  return (
    <div
      className={`loader fixed inset-0 z-50 flex flex-col items-center justify-center bg-night transition-opacity duration-[1400ms] ease-out ${
        ready ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="loader-grid" aria-hidden />
      <h1 className="neon-title relative font-display text-4xl font-bold tracking-[0.35em] sm:text-6xl">
        {STRINGS.title}
      </h1>
      <div className="relative mt-8 h-[3px] w-56 overflow-hidden rounded-full bg-white/10 sm:w-72">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan shadow-[0_0_12px_#ff2bd6] transition-[width] duration-700 ease-out"
          style={{ width: `${PROGRESS[stage]}%` }}
        />
      </div>
      <p className="relative mt-4 font-display text-[11px] uppercase tracking-[0.3em] text-neon-cyan/80">
        {STRINGS.loading[stage]}
        <span className="loader-dots" />
      </p>
    </div>
  );
}
