import { describe, expect, it } from 'vitest';
import { CITY, PITCH } from '../config/city';
import { QUALITY_PROFILES } from '../config/quality';
import { generateCity, generateTraffic, sampleHeight, type BoxInstance } from './cityGenerator';

const cityFor = (level: keyof typeof QUALITY_PROFILES) => {
  const p = QUALITY_PROFILES[level];
  return generateCity({
    coreRadiusBlocks: p.coreRadiusBlocks,
    farRadiusBlocks: p.farRadiusBlocks,
    farDensity: p.farDensity,
    farBeams: p.farBeams,
  });
};

const high = cityFor('high');
const medium = cityFor('medium');
const low = cityFor('low');

/** Axis-aligned half extents of a (possibly rotated) box footprint. */
function halfExtents(b: BoxInstance): [number, number] {
  if (b.rotY === 0) return [b.w / 2, b.d / 2];
  const c = Math.abs(Math.cos(b.rotY));
  const s = Math.abs(Math.sin(b.rotY));
  return [(b.w * c + b.d * s) / 2, (b.w * s + b.d * c) / 2];
}

describe('generateCity', () => {
  it('is deterministic for a given seed', () => {
    const again = cityFor('high');
    expect(again.boxes.length).toBe(high.boxes.length);
    expect(again.boxes[123]).toEqual(high.boxes[123]);
    expect(again.beams).toEqual(high.beams);
  });

  it('produces hundreds of buildings on every quality level', () => {
    expect(low.stats.buildings).toBeGreaterThan(300);
    expect(medium.stats.buildings).toBeGreaterThan(low.stats.buildings);
    expect(high.stats.buildings).toBeGreaterThan(medium.stats.buildings);
    expect(high.stats.buildings).toBeGreaterThan(1000);
  });

  it('keeps every building inside its block (never on a street)', () => {
    for (const b of high.boxes) {
      const [hx, hz] = halfExtents(b);
      const cx = Math.round(b.x / PITCH) * PITCH;
      const cz = Math.round(b.z / PITCH) * PITCH;
      expect(Math.abs(b.x - cx) + hx).toBeLessThanOrEqual(CITY.block / 2 + 1e-6);
      expect(Math.abs(b.z - cz) + hz).toBeLessThanOrEqual(CITY.block / 2 + 1e-6);
    }
  });

  it('builds a varied skyline dominated by the landmark tower', () => {
    const regular = high.boxes.filter((b) => Math.hypot(b.x, b.z) > CITY.block);
    const tops = regular.map((b) => b.y + b.h);
    expect(Math.max(...tops)).toBeLessThan(high.landmark.top);
    expect(Math.max(...tops)).toBeLessThanOrEqual(CITY.maxRegularHeight + 40);
    const styles = new Set(high.boxes.map((b) => b.style));
    expect(styles.size).toBe(5);
    const rotated = high.boxes.filter((b) => b.rotY !== 0);
    expect(rotated.length).toBeGreaterThan(5);
  });

  it('separates the detailed core from the far skyline ring', () => {
    for (const b of high.boxes) {
      const r = Math.hypot(b.x, b.z);
      if (b.far) expect(r).toBeGreaterThan(high.coreRadius - CITY.block);
      else expect(r).toBeLessThanOrEqual(high.coreRadius + CITY.block);
    }
    expect(high.stats.farBoxes).toBeGreaterThan(200);
  });

  it('places beams and beacons', () => {
    expect(high.beams.length).toBeGreaterThan(20);
    expect(high.beacons.length).toBeGreaterThan(20);
    for (const beam of high.beams) expect(beam.height).toBeGreaterThan(0);
  });
});

describe('streets and traffic', () => {
  it('keeps lanes inside streets and inside the core radius', () => {
    for (const lane of high.lanes) {
      const local = lane.coord - Math.floor(lane.coord / PITCH) * PITCH; // [0, PITCH)
      const fromStreetCentre = Math.abs(local - PITCH / 2);
      expect(fromStreetCentre).toBeLessThan(CITY.street / 2);
      expect(Math.hypot(lane.coord, lane.halfLength)).toBeLessThanOrEqual(high.coreRadius + 2);
    }
  });

  it('creates exactly the requested number of vehicles', () => {
    const vehicles = generateTraffic(high.lanes, 500, 7);
    expect(vehicles).toHaveLength(500);
    for (const v of vehicles) {
      expect(v.lane).toBeGreaterThanOrEqual(0);
      expect(v.lane).toBeLessThan(high.lanes.length);
      expect(v.speed).toBeGreaterThan(0);
    }
  });
});

describe('height field', () => {
  it('reports the landmark as the tallest point', () => {
    expect(sampleHeight(high.heightField, 0, 0)).toBeGreaterThan(150);
  });

  it('is empty in the middle of a street far from towers', () => {
    const street = PITCH / 2;
    const h = sampleHeight(high.heightField, street, high.farRadius + PITCH * 0.5);
    expect(h).toBe(0);
  });
});
