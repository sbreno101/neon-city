import { useEffect, useState } from 'react';
import { STRINGS } from '../../config/strings';
import { perfStats, type PerfSnapshot } from '../../utils/perfStats';

/** Measured stats, refreshed twice per second (see PerformanceProbe). */
export function FpsMeter() {
  const [s, setS] = useState<PerfSnapshot>(perfStats.get);
  useEffect(() => perfStats.subscribe(setS), []);
  const color = s.fps >= 55 ? 'text-neon-cyan' : s.fps >= 30 ? 'text-amber-300' : 'text-neon-pink';
  return (
    <div className="glass pointer-events-none rounded-lg px-3 py-2 font-mono text-[11px] leading-4 text-white/70">
      <div>
        <span className={`text-sm font-semibold ${color}`}>{s.fps}</span> FPS · {s.frameMs} ms
      </div>
      <div>
        {s.drawCalls} draw calls · {(s.triangles / 1000).toFixed(0)}k tris
      </div>
      <div>
        DPR {s.dpr} · {STRINGS.quality[s.quality as keyof typeof STRINGS.quality] ?? s.quality}
      </div>
    </div>
  );
}
