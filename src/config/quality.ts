export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityProfile {
  id: QualityLevel;
  /** Radius (in blocks) of the detailed city core. */
  coreRadiusBlocks: number;
  /** Radius (in blocks) of the simplified skyline ring around the core. */
  farRadiusBlocks: number;
  /** Probability that a block of the far ring receives buildings. */
  farDensity: number;
  /** Device pixel ratio range [min, max]; adaptive resolution moves inside it. */
  dpr: [number, number];
  /** Light trails moving along the streets. */
  traffic: number;
  drones: number;
  particles: number;
  /** Extra light beams on the distant skyline. */
  farBeams: number;
  chromaticAberration: boolean;
  filmGrain: boolean;
  /** Exponential fog density (smaller = see further). */
  fogDensity: number;
}

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  low: {
    id: 'low',
    coreRadiusBlocks: 7,
    farRadiusBlocks: 13,
    farDensity: 0.45,
    dpr: [0.75, 1],
    traffic: 320,
    drones: 16,
    particles: 250,
    farBeams: 6,
    chromaticAberration: false,
    filmGrain: false,
    fogDensity: 0.0042,
  },
  medium: {
    id: 'medium',
    coreRadiusBlocks: 9,
    farRadiusBlocks: 18,
    farDensity: 0.6,
    dpr: [1, 1.5],
    traffic: 800,
    drones: 36,
    particles: 600,
    farBeams: 10,
    chromaticAberration: true,
    filmGrain: true,
    fogDensity: 0.0032,
  },
  high: {
    id: 'high',
    coreRadiusBlocks: 11,
    farRadiusBlocks: 23,
    farDensity: 0.7,
    dpr: [1, 2],
    traffic: 1500,
    drones: 60,
    particles: 1200,
    farBeams: 14,
    chromaticAberration: true,
    filmGrain: true,
    fogDensity: 0.0026,
  },
};

export const QUALITY_ORDER: QualityLevel[] = ['low', 'medium', 'high'];
