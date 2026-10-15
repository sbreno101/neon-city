import { useState, type ReactNode } from 'react';
import { QUALITY_ORDER } from '../../config/quality';
import { STRINGS } from '../../config/strings';
import { useAppStore, type CameraMode } from '../../state/useAppStore';
import {
  CollapseIcon,
  ExpandIcon,
  EyeOffIcon,
  FilmIcon,
  OrbitIcon,
  PanoramaIcon,
  PauseIcon,
  PlayIcon,
  SettingsIcon,
  ZoomIcon,
} from './Icons';
import { SettingsPanel } from './SettingsPanel';

const MODES: { id: CameraMode; icon: ReactNode }[] = [
  { id: 'cinematic', icon: <FilmIcon /> },
  { id: 'orbit', icon: <OrbitIcon /> },
  { id: 'panorama', icon: <PanoramaIcon /> },
  { id: 'closeup', icon: <ZoomIcon /> },
];

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`btn ${active ? 'btn-active' : ''}`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-0.5 hidden h-5 w-px bg-white/10 sm:block" aria-hidden />;

export function ControlBar({ fullscreen }: { fullscreen: { supported: boolean; active: boolean; toggle: () => void } }) {
  const mode = useAppStore((s) => s.mode);
  const quality = useAppStore((s) => s.quality);
  const setMode = useAppStore((s) => s.setMode);
  const toggleCinematic = useAppStore((s) => s.toggleCinematic);
  const setQuality = useAppStore((s) => s.setQuality);
  const toggleUi = useAppStore((s) => s.toggleUi);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const playing = mode === 'cinematic';

  return (
    <div className="relative flex flex-col items-center">
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      <nav
        className="glass flex max-w-[calc(100vw-24px)] flex-wrap items-center justify-center gap-1 rounded-2xl p-1.5"
        aria-label="Controles da câmera"
      >
        <IconButton label={playing ? STRINGS.pause : STRINGS.play} active={playing} onClick={toggleCinematic}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </IconButton>
        <Divider />
        <div className="flex items-center gap-0.5" role="group" aria-label="Ângulos de câmera">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={STRINGS.modes[m.id]}
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`btn gap-1.5 ${mode === m.id ? 'btn-active' : ''}`}
            >
              {m.icon}
              <span className="hidden text-[11px] tracking-[0.12em] uppercase lg:inline">{STRINGS.modes[m.id]}</span>
            </button>
          ))}
        </div>
        <Divider />
        <div
          className="hidden items-center rounded-xl bg-white/5 p-0.5 sm:flex"
          role="radiogroup"
          aria-label={STRINGS.graphics}
          title={STRINGS.graphics}
        >
          {QUALITY_ORDER.map((q) => (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={quality === q}
              onClick={() => setQuality(q)}
              className={`rounded-lg px-2.5 py-1.5 font-display text-[10px] tracking-[0.14em] uppercase transition ${
                quality === q
                  ? 'bg-neon-pink/20 text-white shadow-[inset_0_0_0_1px_rgba(255,43,214,0.6)]'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              {STRINGS.quality[q]}
            </button>
          ))}
        </div>
        <Divider />
        <IconButton label={STRINGS.settings} active={settingsOpen} onClick={() => setSettingsOpen((o) => !o)}>
          <SettingsIcon />
        </IconButton>
        {fullscreen.supported && (
          <IconButton
            label={fullscreen.active ? STRINGS.exitFullscreen : STRINGS.fullscreen}
            onClick={fullscreen.toggle}
          >
            {fullscreen.active ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        )}
        <IconButton label={STRINGS.hideUi} onClick={toggleUi}>
          <EyeOffIcon />
        </IconButton>
      </nav>
    </div>
  );
}
