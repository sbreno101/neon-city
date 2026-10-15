import { useEffect } from 'react';
import { useAppStore, type CameraMode } from '../state/useAppStore';

const MODE_KEYS: Record<string, CameraMode> = {
  '1': 'cinematic',
  '2': 'orbit',
  '3': 'panorama',
  '4': 'closeup',
};

/** C / Space: cinematic on-off · 1-4: camera modes · F: fullscreen · H: hide UI. */
export function useKeyboardShortcuts(toggleFullscreen: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const s = useAppStore.getState();
      const key = e.key.toLowerCase();
      if (key === 'c' || (key === ' ' && target?.tagName !== 'BUTTON')) {
        e.preventDefault();
        s.toggleCinematic();
      } else if (key in MODE_KEYS) {
        s.setMode(MODE_KEYS[key]);
      } else if (key === 'f') {
        toggleFullscreen();
      } else if (key === 'h') {
        s.toggleUi();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen]);
}
