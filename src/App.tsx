import { useEffect, useState } from 'react';
import { STRINGS } from './config/strings';
import { Scene } from './components/Scene';
import { Hud } from './components/ui/Hud';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { useAppStore } from './state/useAppStore';
import { supportsWebGL2 } from './utils/device';

export default function App() {
  const [webgl] = useState(supportsWebGL2);

  useEffect(() => {
    if (webgl) useAppStore.getState().setStage('generating');
  }, [webgl]);

  if (!webgl) {
    return (
      <main className="flex h-full items-center justify-center bg-night p-8 text-center">
        <div className="max-w-md">
          <h1 className="neon-title font-display text-3xl font-bold tracking-[0.3em]">{STRINGS.title}</h1>
          <p className="mt-6 font-body text-white/70">{STRINGS.noWebgl}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-full w-full bg-night">
      <div className="absolute inset-0 touch-none">
        <Scene />
      </div>
      <Hud />
      <LoadingScreen />
    </main>
  );
}
