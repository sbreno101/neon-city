import { create } from 'zustand';
import type { QualityLevel } from '../config/quality';
import { detectDefaultQuality } from '../utils/device';

export type CameraMode = 'cinematic' | 'orbit' | 'panorama' | 'closeup';
export type LoadingStage = 'boot' | 'generating' | 'compiling' | 'ready';

interface Persisted {
  quality: QualityLevel;
  bloom: number;
  neon: number;
  speed: number;
  showFps: boolean;
}

interface AppState extends Persisted {
  mode: CameraMode;
  /** Incremented to re-trigger the transition of the current preset. */
  viewNonce: number;
  uiHidden: boolean;
  stage: LoadingStage;
  setMode: (mode: CameraMode) => void;
  toggleCinematic: () => void;
  setQuality: (quality: QualityLevel) => void;
  setBloom: (bloom: number) => void;
  setNeon: (neon: number) => void;
  setSpeed: (speed: number) => void;
  setShowFps: (show: boolean) => void;
  toggleUi: () => void;
  setStage: (stage: LoadingStage) => void;
}

const STORAGE_KEY = 'neon-city:settings';

function loadPersisted(): Partial<Persisted> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
  } catch {
    return {};
  }
}

function persist(state: Persisted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode, blocked) — settings just won't persist */
  }
}

const saved = loadPersisted();
const isQuality = (q: unknown): q is QualityLevel => q === 'low' || q === 'medium' || q === 'high';

export const useAppStore = create<AppState>((set, get) => {
  const save = () => {
    const { quality, bloom, neon, speed, showFps } = get();
    persist({ quality, bloom, neon, speed, showFps });
  };
  return {
    quality: isQuality(saved.quality) ? saved.quality : detectDefaultQuality(),
    bloom: typeof saved.bloom === 'number' ? saved.bloom : 1,
    neon: typeof saved.neon === 'number' ? saved.neon : 1,
    speed: typeof saved.speed === 'number' ? saved.speed : 1,
    showFps: saved.showFps === true,
    mode: 'cinematic',
    viewNonce: 0,
    uiHidden: false,
    stage: 'boot',
    setMode: (mode) => set((s) => ({ mode, viewNonce: s.viewNonce + 1 })),
    toggleCinematic: () =>
      set((s) => ({ mode: s.mode === 'cinematic' ? 'orbit' : 'cinematic', viewNonce: s.viewNonce + 1 })),
    setQuality: (quality) => {
      set({ quality });
      save();
    },
    setBloom: (bloom) => {
      set({ bloom });
      save();
    },
    setNeon: (neon) => {
      set({ neon });
      save();
    },
    setSpeed: (speed) => {
      set({ speed });
      save();
    },
    setShowFps: (showFps) => {
      set({ showFps });
      save();
    },
    toggleUi: () => set((s) => ({ uiHidden: !s.uiHidden })),
    setStage: (stage) => set({ stage }),
  };
});
