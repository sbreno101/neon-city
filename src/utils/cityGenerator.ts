import { CITY, PITCH, isAvenue } from '../config/city';
import { ACCENT, type AccentIndex } from '../config/palette';
import {
  chance,
  intRange,
  mulberry32,
  range,
  smoothstep,
  valueNoise,
  weighted,
  type Rng,
} from './random';

/**
 * Procedural city generator.
 *
 * Pure and deterministic: the same options always produce the same city.
 * It only outputs plain data (boxes, beams, lanes, ...); the React/three
 * layer turns that data into a handful of instanced draw calls.
 */

/** Facade pattern drawn procedurally by the building shader. */
export const FACADE = {
  grid: 0,
  strips: 1,
  bands: 2,
  pixels: 3,
  monolith: 4,
} as const;
export type FacadeStyle = (typeof FACADE)[keyof typeof FACADE];

export interface BoxInstance {
  /** Centre of the footprint. */
  x: number;
  z: number;
  /** Base height (boxes are stacked to build sections). */
  y: number;
  w: number;
  h: number;
  d: number;
  rotY: number;
  style: FacadeStyle;
  accent: AccentIndex;
  windowColor: number;
  seed: number;
  /** Multiplier for the neon outline intensity. */
  edge: number;
  /** Fraction of lit windows. */
  lit: number;
  /** Part of the simplified skyline ring. */
  far: boolean;
}

export interface Beam {
  x: number;
  y: number;
  z: number;
  height: number;
  radius: number;
  accent: AccentIndex;
  phase: number;
}

export interface Beacon {
  x: number;
  y: number;
  z: number;
  accent: AccentIndex;
  phase: number;
  size: number;
}

export interface Lane {
  /** 0 = the lane runs along X (constant Z), 1 = runs along Z (constant X). */
  axis: 0 | 1;
  /** The constant coordinate of the lane. */
  coord: number;
  halfLength: number;
  dir: 1 | -1;
  avenue: boolean;
}

export interface Vehicle {
  lane: number;
  speed: number;
  offset: number;
  length: number;
  accent: AccentIndex;
}

export interface HeightField {
  cellSize: number;
  origin: number;
  cols: number;
  data: Float32Array;
}

export interface CityData {
  boxes: BoxInstance[];
  beams: Beam[];
  beacons: Beacon[];
  lanes: Lane[];
  heightField: HeightField;
  landmark: { x: number; z: number; ringHeights: number[]; top: number };
  hologram: { x: number; y: number; z: number };
  coreRadius: number;
  farRadius: number;
  stats: { buildings: number; boxes: number; coreBoxes: number; farBoxes: number };
}

export interface CityOptions {
  coreRadiusBlocks: number;
  farRadiusBlocks: number;
  farDensity: number;
  farBeams: number;
  seed?: number;
}

interface Lot {
  x: number;
  z: number;
  w: number;
  d: number;
}

interface Look {
  style: FacadeStyle;
  accent: AccentIndex;
  windowColor: number;
  edge: number;
  lit: number;
}

const BLOCK_INSET = 0.8;
const LOT_GAP = 1.2;
const MAX_CORE_BEAMS = 22;
const HALF_BLOCK = CITY.block / 2;

const ACCENT_WEIGHTS = [34, 30, 19, 11, 6];
const WINDOW_WEIGHTS = [45, 25, 15, 15];
const STYLE_WEIGHTS = [28, 22, 20, 15, 15];

class CityBuilder {
  boxes: BoxInstance[] = [];
  beams: Beam[] = [];
  beacons: Beacon[] = [];
  buildings = 0;
  private coreBeams = 0;

  constructor(readonly rng: Rng) {}

  look(blockAccent: AccentIndex, overrides: Partial<Look> = {}): Look {
    const rng = this.rng;
    const style = weighted(rng, STYLE_WEIGHTS) as FacadeStyle;
    return {
      style,
      accent: chance(rng, 0.65) ? blockAccent : (weighted(rng, ACCENT_WEIGHTS) as AccentIndex),
      windowColor: weighted(rng, WINDOW_WEIGHTS),
      edge: range(rng, 0.75, 1.3),
      lit: style === FACADE.pixels ? range(rng, 0.45, 0.8) : range(rng, 0.15, 0.55),
      ...overrides,
    };
  }

  box(
    x: number,
    z: number,
    y: number,
    w: number,
    h: number,
    d: number,
    look: Look,
    opts: { rotY?: number; far?: boolean; edge?: number } = {},
  ) {
    this.boxes.push({
      x,
      z,
      y,
      w,
      h,
      d,
      rotY: opts.rotY ?? 0,
      style: look.style,
      accent: look.accent,
      windowColor: look.windowColor,
      seed: this.rng() * 1000,
      edge: opts.edge ?? look.edge,
      lit: look.lit,
      far: opts.far ?? false,
    });
  }

  beam(x: number, z: number, y: number, accent: AccentIndex, core = true, height?: number) {
    if (core) {
      if (this.coreBeams >= MAX_CORE_BEAMS) return;
      this.coreBeams++;
    }
    this.beams.push({
      x,
      z,
      y,
      accent,
      height: height ?? range(this.rng, 140, 320),
      radius: range(this.rng, 0.28, 0.55),
      phase: this.rng() * Math.PI * 2,
    });
  }

  beacon(x: number, y: number, z: number, accent: AccentIndex, size = 1) {
    this.beacons.push({ x, y, z, accent, phase: this.rng() * Math.PI * 2, size });
  }

  /** Thin glowing mast with a blinking beacon on top. */
  spire(x: number, z: number, y: number, height: number, accent: AccentIndex, width = 0.3) {
    this.box(x, z, y, width, height, width, {
      style: FACADE.monolith,
      accent,
      windowColor: 0,
      edge: 1.6,
      lit: 0,
    });
    this.beacon(x, y + height + 0.4, z, chance(this.rng, 0.7) ? ACCENT.pink : accent, 1.2);
  }
}

/* ------------------------------------------------------------------------ */
/* Building families                                                        */
/* ------------------------------------------------------------------------ */

type Family = (b: CityBuilder, lot: Lot, h: number, look: Look) => void;

const corporate: Family = (b, lot, h, look) => {
  const rng = b.rng;
  const w = lot.w * range(rng, 0.72, 0.95);
  const d = lot.d * range(rng, 0.72, 0.95);
  b.box(lot.x, lot.z, 0, w, h, d, look);
  if (h > 12 && chance(rng, 0.35)) {
    // rooftop machinery block
    b.box(lot.x, lot.z, h, w * 0.4, range(rng, 1.5, 4), d * 0.4, { ...look, style: FACADE.monolith });
  }
};

const sectioned: Family = (b, lot, h, look) => {
  const rng = b.rng;
  const sections = intRange(rng, 2, 4);
  let w = lot.w * range(rng, 0.8, 0.95);
  let d = lot.d * range(rng, 0.8, 0.95);
  let y = 0;
  let current = look;
  for (let s = 0; s < sections; s++) {
    const last = s === sections - 1;
    const sh = last ? h - y : s === 0 ? h * range(rng, 0.45, 0.65) : (h - y) * range(rng, 0.45, 0.6);
    b.box(lot.x, lot.z, y, w, sh, d, current);
    y += sh;
    w *= range(rng, 0.68, 0.85);
    d *= range(rng, 0.68, 0.85);
    if (chance(rng, 0.3)) current = { ...current, style: weighted(rng, STYLE_WEIGHTS) as FacadeStyle };
  }
  if (chance(rng, 0.25)) b.spire(lot.x, lot.z, y, range(rng, 5, 12), look.accent);
};

const stepped: Family = (b, lot, h, look) => {
  const rng = b.rng;
  let w = lot.w * range(rng, 0.8, 0.95);
  let d = lot.d * range(rng, 0.8, 0.95);
  const baseH = h * 0.72;
  b.box(lot.x, lot.z, 0, w, baseH, d, look);
  let y = baseH;
  const stepH = (h - baseH) / 3;
  for (let s = 0; s < 3; s++) {
    w *= 0.78;
    d *= 0.78;
    b.box(lot.x, lot.z, y, w, stepH, d, { ...look, style: FACADE.bands }, { edge: look.edge * 1.2 });
    y += stepH;
  }
};

const wideLow: Family = (b, lot, h, look) => {
  const rng = b.rng;
  const hh = Math.min(h, range(rng, 5, 14));
  const w = lot.w * range(rng, 0.88, 0.96);
  const d = lot.d * range(rng, 0.88, 0.96);
  b.box(lot.x, lot.z, 0, w, hh, d, { ...look, style: chance(rng, 0.5) ? FACADE.bands : FACADE.grid });
  const extras = intRange(rng, 1, 3);
  for (let i = 0; i < extras; i++) {
    const ew = w * range(rng, 0.15, 0.3);
    const ed = d * range(rng, 0.15, 0.3);
    const ex = lot.x + range(rng, -1, 1) * (w - ew) * 0.5;
    const ez = lot.z + range(rng, -1, 1) * (d - ed) * 0.5;
    b.box(ex, ez, hh, ew, range(rng, 1, 3.5), ed, { ...look, style: FACADE.monolith });
  }
};

const supertall: Family = (b, lot, h, look) => {
  const rng = b.rng;
  const s = Math.min(lot.w, lot.d) * range(rng, 0.5, 0.68);
  const H = Math.min(CITY.maxRegularHeight - 18, h * range(rng, 1.5, 2.0));
  const lower = H * 0.8;
  b.box(lot.x, lot.z, 0, s, lower, s, look, { edge: look.edge * 1.25 });
  const top = s * 0.74;
  b.box(lot.x, lot.z, lower, top, H - lower, top, { ...look, style: FACADE.strips }, { edge: 1.5 });
  b.spire(lot.x, lot.z, H, range(rng, 8, 18), look.accent);
  if (chance(rng, 0.3)) b.beam(lot.x, lot.z, H, look.accent);
};

const twin: Family = (b, lot, h, look) => {
  const rng = b.rng;
  const alongX = lot.w >= lot.d;
  const long = alongX ? lot.w : lot.d;
  const short = alongX ? lot.d : lot.w;
  const size = ((long - 0.8) / 2) * 0.88;
  const thick = short * range(rng, 0.6, 0.85);
  const offset = (long - 0.8) / 4 + 0.2;
  const h2 = h * range(rng, 0.75, 1);
  for (const [sign, th] of [
    [-1, h],
    [1, h2],
  ] as const) {
    const x = lot.x + (alongX ? sign * offset : 0);
    const z = lot.z + (alongX ? 0 : sign * offset);
    b.box(x, z, 0, alongX ? size : thick, th, alongX ? thick : size, look);
  }
};

const antennaTower: Family = (b, lot, h, look) => {
  const rng = b.rng;
  const w = lot.w * range(rng, 0.6, 0.8);
  const d = lot.d * range(rng, 0.6, 0.8);
  b.box(lot.x, lot.z, 0, w, h, d, look);
  const crownH = range(rng, 2, 5);
  b.box(lot.x, lot.z, h, w * 0.6, crownH, d * 0.6, { ...look, style: FACADE.bands }, { edge: 1.6 });
  b.spire(lot.x, lot.z, h + crownH, range(rng, 10, 26), look.accent, 0.35);
  if (chance(rng, 0.45)) b.beam(lot.x, lot.z, h + crownH, look.accent);
};

const rotatedCrown: Family = (b, lot, h, look) => {
  const rng = b.rng;
  const w = lot.w * range(rng, 0.78, 0.92);
  const d = lot.d * range(rng, 0.78, 0.92);
  const baseH = h * range(rng, 0.72, 0.85);
  b.box(lot.x, lot.z, 0, w, baseH, d, look);
  // a 45° rotated top section whose diagonal still fits inside the base
  const s = Math.min(w, d) * 0.68;
  b.box(lot.x, lot.z, baseH, s, h - baseH + range(rng, 4, 10), s, { ...look, style: FACADE.strips }, {
    rotY: Math.PI / 4,
    edge: 1.4,
  });
};

const FAMILIES = [corporate, sectioned, stepped, wideLow, supertall, twin, antennaTower, rotatedCrown];

function familyWeights(r: number, lot: Lot): number[] {
  const minSide = Math.min(lot.w, lot.d);
  const maxSide = Math.max(lot.w, lot.d);
  return [
    26, // corporate
    18 + 10 * (1 - r), // sectioned
    12, // stepped
    6 + 22 * r, // wide & low
    minSide >= 3 ? 3 + 10 * (1 - r) : 0, // supertall
    maxSide >= 6 ? 7 : 0, // twin
    6, // antenna
    2 + 7 * (1 - r), // rotated crown
  ];
}

/* ------------------------------------------------------------------------ */
/* Blocks                                                                   */
/* ------------------------------------------------------------------------ */

function splitBlock(cx: number, cz: number, nx: number, nz: number): Lot[] {
  const usable = CITY.block - BLOCK_INSET * 2;
  const lw = (usable - LOT_GAP * (nx - 1)) / nx;
  const ld = (usable - LOT_GAP * (nz - 1)) / nz;
  const lots: Lot[] = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      lots.push({
        x: cx - usable / 2 + lw / 2 + i * (lw + LOT_GAP),
        z: cz - usable / 2 + ld / 2 + j * (ld + LOT_GAP),
        w: lw,
        d: ld,
      });
    }
  }
  return lots;
}

function heightAt(x: number, z: number, r: number, rng: Rng, seed: number): number {
  const core = 1 - smoothstep(0, 1, r);
  const base = 8 + 72 * Math.pow(core, 1.35);
  const district = valueNoise(x / 85 + 10, z / 85 - 4, seed);
  let h = base * (0.55 + 0.9 * district) * range(rng, 0.7, 1.3);
  if (chance(rng, 0.03 + 0.07 * core)) h *= range(rng, 1.5, 2.1);
  return Math.max(4, Math.min(CITY.maxRegularHeight, h));
}

function buildLandmark(b: CityBuilder): CityData['landmark'] {
  const sections: [number, number, Look][] = [
    [12, 6, { style: FACADE.bands, accent: ACCENT.purple, windowColor: 0, edge: 1.3, lit: 0.4 }],
    [9, 64, { style: FACADE.strips, accent: ACCENT.cyan, windowColor: 1, edge: 1.5, lit: 0.5 }],
    [7, 35, { style: FACADE.strips, accent: ACCENT.cyan, windowColor: 0, edge: 1.6, lit: 0.55 }],
    [5.2, 30, { style: FACADE.pixels, accent: ACCENT.blue, windowColor: 0, edge: 1.7, lit: 0.7 }],
  ];
  let y = 0;
  for (const [size, h, look] of sections) {
    b.box(0, 0, y, size, h, size, look);
    y += h;
  }
  b.box(0, 0, y, 3.4, 15, 3.4, { style: FACADE.monolith, accent: ACCENT.white, windowColor: 0, edge: 2, lit: 0 }, {
    rotY: Math.PI / 4,
  });
  y += 15;
  b.spire(0, 0, y, 40, ACCENT.white, 0.7);
  b.beam(0, 0, y + 40, ACCENT.cyan, true, 520);
  b.buildings++;
  return { x: 0, z: 0, ringHeights: [118, 138], top: y + 40 };
}

function buildHologramTower(b: CityBuilder, cx: number, cz: number): CityData['hologram'] {
  const look: Look = { style: FACADE.bands, accent: ACCENT.pink, windowColor: 3, edge: 1.4, lit: 0.45 };
  b.box(cx, cz, 0, 11, 8, 11, look);
  b.box(cx, cz, 8, 8, 30, 8, { ...look, style: FACADE.strips });
  b.box(cx, cz, 38, 6, 4, 6, { ...look, style: FACADE.monolith }, { edge: 2 });
  b.buildings++;
  return { x: cx, y: 58, z: cz };
}

function buildPlaza(b: CityBuilder, cx: number, cz: number, accent: AccentIndex) {
  // low platform with four glowing obelisks
  const look: Look = { style: FACADE.bands, accent, windowColor: 0, edge: 1.2, lit: 0 };
  b.box(cx, cz, 0, 10, 0.6, 10, look);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    b.box(cx + sx * 3.6, cz + sz * 3.6, 0.6, 0.6, range(b.rng, 6, 10), 0.6, { ...look, style: FACADE.monolith }, {
      edge: 2,
    });
  }
  b.buildings++;
}

/* ------------------------------------------------------------------------ */
/* Streets & traffic                                                        */
/* ------------------------------------------------------------------------ */

export function generateLanes(coreRadius: number): Lane[] {
  const lanes: Lane[] = [];
  const kMax = Math.ceil(coreRadius / PITCH);
  for (let k = -kMax - 1; k <= kMax; k++) {
    const coord = (k + 0.5) * PITCH;
    if (Math.abs(coord) > coreRadius - PITCH * 0.5) continue;
    const halfLength = Math.sqrt(coreRadius * coreRadius - coord * coord);
    const avenue = isAvenue(k);
    const offsets = avenue ? [-1.5, -0.6, 0.6, 1.5] : [-1, 1];
    for (const axis of [0, 1] as const) {
      for (const o of offsets) {
        lanes.push({ axis, coord: coord + o, halfLength, dir: o < 0 ? -1 : 1, avenue });
      }
    }
  }
  return lanes;
}

export function generateTraffic(lanes: Lane[], count: number, seed: number): Vehicle[] {
  const rng = mulberry32(seed);
  const weights = lanes.map((l) => l.halfLength * (l.avenue ? 1.6 : 1));
  const vehicles: Vehicle[] = [];
  for (let i = 0; i < count; i++) {
    const lane = weighted(rng, weights);
    const l = lanes[lane];
    vehicles.push({
      lane,
      speed: range(rng, 7, 16) * (l.avenue ? 1.5 : 1),
      offset: rng() * l.halfLength * 2,
      length: range(rng, 2.5, 6.5),
      accent: weighted(rng, [34, 18, 36, 0, 12]) as AccentIndex,
    });
  }
  return vehicles;
}

/* ------------------------------------------------------------------------ */
/* Height field (camera safety)                                             */
/* ------------------------------------------------------------------------ */

const HEIGHT_CELL = 4;

function buildHeightField(boxes: BoxInstance[], extent: number): HeightField {
  const cols = Math.ceil((extent * 2) / HEIGHT_CELL);
  const data = new Float32Array(cols * cols);
  const origin = -extent;
  for (const b of boxes) {
    const half = b.rotY !== 0 ? Math.hypot(b.w, b.d) / 2 : Math.max(b.w, b.d) / 2;
    const hx = b.rotY !== 0 ? half : b.w / 2;
    const hz = b.rotY !== 0 ? half : b.d / 2;
    const top = b.y + b.h;
    const c0 = Math.max(0, Math.floor((b.x - hx - origin) / HEIGHT_CELL));
    const c1 = Math.min(cols - 1, Math.floor((b.x + hx - origin) / HEIGHT_CELL));
    const r0 = Math.max(0, Math.floor((b.z - hz - origin) / HEIGHT_CELL));
    const r1 = Math.min(cols - 1, Math.floor((b.z + hz - origin) / HEIGHT_CELL));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * cols + c;
        if (top > data[i]) data[i] = top;
      }
    }
  }
  return { cellSize: HEIGHT_CELL, origin, cols, data };
}

/** Highest geometry around (x, z) within `radius` world units. */
export function sampleHeight(field: HeightField, x: number, z: number, radius = 0): number {
  const { cellSize, origin, cols, data } = field;
  const c0 = Math.floor((x - radius - origin) / cellSize);
  const c1 = Math.floor((x + radius - origin) / cellSize);
  const r0 = Math.floor((z - radius - origin) / cellSize);
  const r1 = Math.floor((z + radius - origin) / cellSize);
  let max = 0;
  for (let r = Math.max(0, r0); r <= Math.min(cols - 1, r1); r++) {
    for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) {
      const v = data[r * cols + c];
      if (v > max) max = v;
    }
  }
  return max;
}

/* ------------------------------------------------------------------------ */
/* Entry point                                                              */
/* ------------------------------------------------------------------------ */

export function generateCity(options: CityOptions): CityData {
  const seed = options.seed ?? CITY.seed;
  const rng = mulberry32(seed);
  const b = new CityBuilder(rng);
  const coreRadius = options.coreRadiusBlocks * PITCH;
  const farRadius = options.farRadiusBlocks * PITCH;
  const n = options.farRadiusBlocks;

  const landmark = buildLandmark(b);
  let hologram: CityData['hologram'] = { x: 2 * PITCH, y: 58, z: -PITCH };
  const farBoxStart: number[] = [];

  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const cx = i * PITCH;
      const cz = j * PITCH;
      const dist = Math.hypot(cx, cz);
      if (i === 0 && j === 0) continue; // landmark
      if (i === 2 && j === -1) {
        hologram = buildHologramTower(b, cx, cz);
        continue;
      }

      const blockAccent = weighted(rng, ACCENT_WEIGHTS) as AccentIndex;

      if (dist <= coreRadius) {
        const r = dist / coreRadius;
        const downtown = Math.max(Math.abs(i), Math.abs(j)) <= 1;
        if (!downtown && chance(rng, 0.035)) {
          buildPlaza(b, cx, cz, blockAccent);
          continue;
        }
        const type = downtown ? 1 : weighted(rng, [10 + 10 * (1 - r), 38, 26, 8 + 20 * r]);
        const [nx, nz] = [
          [1, 1],
          [2, 2],
          chance(rng, 0.5) ? [3, 2] : [2, 3],
          [3, 3],
        ][type];
        for (const lot of splitBlock(cx, cz, nx, nz)) {
          const look = b.look(blockAccent);
          if (downtown) {
            const h = range(rng, 62, 112);
            const fam = [sectioned, supertall, rotatedCrown, antennaTower, stepped][intRange(rng, 0, 4)];
            fam(b, lot, h, look);
          } else {
            const h = heightAt(lot.x, lot.z, r, rng, seed);
            const fam = FAMILIES[weighted(rng, familyWeights(r, lot))];
            fam(b, lot, h, look);
          }
          b.buildings++;
        }
      } else if (dist <= farRadius) {
        const t = (dist - coreRadius) / (farRadius - coreRadius);
        if (!chance(rng, options.farDensity * (1 - 0.45 * t))) continue;
        const count = intRange(rng, 1, 3);
        for (let k = 0; k < count; k++) {
          const w = range(rng, 4, 11);
          const d = range(rng, 4, 11);
          const x = cx + range(rng, -1, 1) * (HALF_BLOCK - w / 2 - 0.5);
          const z = cz + range(rng, -1, 1) * (HALF_BLOCK - d / 2 - 0.5);
          // the inner part of the ring stays low: the cinematic camera flies there
          const inner = 0.3 + 0.7 * smoothstep(0.05, 0.4, t);
          let h = (10 + 62 * Math.pow(rng(), 2) * (1 - 0.35 * t)) * inner;
          if (t > 0.3 && chance(rng, 0.08)) h = Math.min(CITY.maxRegularHeight, h * range(rng, 1.8, 2.8));
          h = Math.max(5, h);
          const look = b.look(blockAccent, { style: weighted(rng, [30, 12, 25, 8, 25]) as FacadeStyle });
          farBoxStart.push(b.boxes.length);
          b.box(x, z, 0, w, h, d, look, { far: true });
          b.buildings++;
        }
      }
    }
  }

  // Light beams on the tallest distant towers (spread around the horizon).
  const farTowers = farBoxStart.map((idx) => b.boxes[idx]).sort((a, c) => c.h - a.h);
  const chosen: BoxInstance[] = [];
  for (const tower of farTowers) {
    if (chosen.length >= options.farBeams) break;
    if (chosen.every((c) => Math.hypot(c.x - tower.x, c.z - tower.z) > 55)) {
      chosen.push(tower);
      b.beam(tower.x, tower.z, tower.h, tower.accent, false, range(rng, 220, 480));
    }
  }

  const coreBoxes = b.boxes.filter((x) => !x.far).length;
  return {
    boxes: b.boxes,
    beams: b.beams,
    beacons: b.beacons,
    lanes: generateLanes(coreRadius),
    heightField: buildHeightField(b.boxes, farRadius + PITCH),
    landmark,
    hologram,
    coreRadius,
    farRadius,
    stats: {
      buildings: b.buildings,
      boxes: b.boxes.length,
      coreBoxes,
      farBoxes: b.boxes.length - coreBoxes,
    },
  };
}
