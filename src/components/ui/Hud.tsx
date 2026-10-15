import { STRINGS } from '../../config/strings';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useAppStore } from '../../state/useAppStore';
import { isTouchDevice } from '../../utils/device';
import { ControlBar } from './ControlBar';
import { FpsMeter } from './FpsMeter';
import { EyeIcon } from './Icons';

/** Minimal overlay: title, control bar, discreet hints. Never covers the city. */
export function Hud() {
  const uiHidden = useAppStore((s) => s.uiHidden);
  const showFps = useAppStore((s) => s.showFps);
  const ready = useAppStore((s) => s.stage === 'ready');
  const toggleUi = useAppStore((s) => s.toggleUi);
  const fullscreen = useFullscreen();
  useKeyboardShortcuts(fullscreen.toggle);
  const touch = isTouchDevice();

  if (uiHidden) {
    return (
      <button
        type="button"
        onClick={toggleUi}
        aria-label="Mostrar interface (H)"
        title="Mostrar interface (H)"
        className="btn glass fixed right-3 bottom-3 z-20 opacity-30 transition-opacity hover:opacity-100 focus-visible:opacity-100"
      >
        <EyeIcon />
      </button>
    );
  }

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-20 transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
    >
      <header className="absolute top-0 left-0 p-4 sm:p-6">
        <h1 className="neon-title font-display text-xl font-bold tracking-[0.32em] sm:text-3xl">{STRINGS.title}</h1>
        <p className="mt-1 font-body text-xs tracking-[0.18em] text-white/55 uppercase sm:text-sm">{STRINGS.subtitle}</p>
      </header>

      {showFps && (
        <div className="absolute top-24 right-4 sm:top-6 sm:right-6">
          <FpsMeter />
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-4 left-1/2 w-max -translate-x-1/2 sm:bottom-6">
        <ControlBar fullscreen={fullscreen} />
      </div>

      <footer className="absolute bottom-[84px] left-1/2 hidden w-max max-w-[92vw] -translate-x-1/2 text-center font-body text-[11px] leading-4 tracking-[0.08em] text-white/40 sm:block">
        <p>{touch ? STRINGS.hintTouch : STRINGS.hint}</p>
        {!touch && <p className="hidden text-white/25 lg:block">{STRINGS.shortcuts}</p>}
      </footer>
    </div>
  );
}
