/**
 * NEON CITY colour palette.
 *
 * Every colour used by shaders, UI and effects comes from here so the art
 * direction stays consistent. Hex values are sRGB; `three` converts them to
 * linear space automatically when they are assigned to a `THREE.Color`.
 */
export const PALETTE = {
  deepPurple: '#18002E',
  neonPurple: '#A020F0',
  neonPink: '#FF2BD6',
  electricBlue: '#00BFFF',
  cyan: '#00FFFF',
  nightBlue: '#060B24',
  glowWhite: '#F0F8FF',
} as const;

/** Accent colours used for building outlines, neon strips and light beams. */
export const ACCENTS = [
  PALETTE.cyan,
  PALETTE.electricBlue,
  PALETTE.neonPink,
  PALETTE.neonPurple,
  PALETTE.glowWhite,
] as const;

export const ACCENT = {
  cyan: 0,
  blue: 1,
  pink: 2,
  purple: 3,
  white: 4,
} as const;

export type AccentIndex = (typeof ACCENT)[keyof typeof ACCENT];

/** Window glow colours (slightly softer than the accents). */
export const WINDOW_COLORS = ['#cfe9ff', '#7ff6ff', '#59c8ff', '#ff7ae6'] as const;

/** Scene-level colours (sky, fog, building body). */
export const SCENE_COLORS = {
  buildingBody: '#07051a',
  buildingTop: '#120a33',
  ground: '#05030f',
  street: '#030210',
  fog: '#1c0634',
  skyZenith: '#05010f',
  skyMid: '#1c0545',
  skyHorizon: '#5c147a',
  sunTop: '#ffb3ee',
  sunBottom: '#ff2bd6',
} as const;
