import { useEffect, useRef } from 'react';
import { QUALITY_ORDER } from '../../config/quality';
import { STRINGS } from '../../config/strings';
import { useAppStore } from '../../state/useAppStore';

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[11px] tracking-[0.14em] text-white/60 uppercase">
        {label}
        <span className="font-mono text-neon-cyan">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="neon-range mt-2 w-full"
      />
    </label>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const bloom = useAppStore((s) => s.bloom);
  const neon = useAppStore((s) => s.neon);
  const speed = useAppStore((s) => s.speed);
  const showFps = useAppStore((s) => s.showFps);
  const quality = useAppStore((s) => s.quality);
  const { setBloom, setNeon, setSpeed, setShowFps, setQuality } = useAppStore.getState();
  const ref = useRef<HTMLDivElement>(null);

  // close on outside click / Escape
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node) && !(e.target as HTMLElement).closest('[aria-label="' + STRINGS.settings + '"]'))
        onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div
      ref={ref}
      className="glass absolute bottom-full mb-3 w-64 space-y-4 rounded-2xl p-4"
      role="dialog"
      aria-label={STRINGS.settings}
    >
      {/* on phones the quality switch lives here instead of the control bar */}
      <div className="sm:hidden">
        <span className="text-[11px] tracking-[0.14em] text-white/60 uppercase">{STRINGS.graphics}</span>
        <div className="mt-2 flex rounded-xl bg-white/5 p-0.5" role="radiogroup" aria-label={STRINGS.graphics}>
          {QUALITY_ORDER.map((q) => (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={quality === q}
              onClick={() => setQuality(q)}
              className={`flex-1 rounded-lg py-1.5 font-display text-[10px] tracking-[0.14em] uppercase ${
                quality === q ? 'bg-neon-pink/20 text-white' : 'text-white/55'
              }`}
            >
              {STRINGS.quality[q]}
            </button>
          ))}
        </div>
      </div>
      <Slider label={STRINGS.neon} value={neon} min={0.4} max={1.6} step={0.05} onChange={setNeon} format={pct} />
      <Slider label={STRINGS.bloom} value={bloom} min={0} max={2} step={0.05} onChange={setBloom} format={pct} />
      <Slider
        label={STRINGS.speed}
        value={speed}
        min={0.25}
        max={3}
        step={0.05}
        onChange={setSpeed}
        format={(v) => `${v.toFixed(2)}×`}
      />
      <label className="flex cursor-pointer items-center justify-between text-[11px] tracking-[0.14em] text-white/60 uppercase">
        {STRINGS.fps}
        <input
          type="checkbox"
          checked={showFps}
          onChange={(e) => setShowFps(e.target.checked)}
          className="neon-check"
        />
      </label>
      <p className="text-[11px] leading-4 text-white/40 sm:hidden">{STRINGS.hintTouch}</p>
    </div>
  );
}
