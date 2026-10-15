/**
 * Urban layout constants shared by the generator (CPU) and the ground /
 * traffic shaders (GPU). Changing them here keeps both sides in sync.
 */
export const CITY = {
  /** Side length of a city block (world units ~ metres). */
  block: 14,
  /** Street width between blocks. */
  street: 4,
  /** Every Nth street is drawn as a brighter avenue. */
  avenueEvery: 4,
  /** Seed for the deterministic generator — same city on every visit. */
  seed: 1984,
  /** Tallest regular building; only the landmark tower goes above it. */
  maxRegularHeight: 132,
} as const;

/** Distance between neighbouring block centres. */
export const PITCH = CITY.block + CITY.street;

/** Returns true when the street with index `k` (between block k and k+1) is an avenue. */
export function isAvenue(k: number): boolean {
  const m = ((k % CITY.avenueEvery) + CITY.avenueEvery) % CITY.avenueEvery;
  return m === 1;
}
