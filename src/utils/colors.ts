import { Color } from 'three';
import { ACCENTS, WINDOW_COLORS } from '../config/palette';

/** Palette colours converted once to linear space for GPU attributes. */
export const ACCENT_LINEAR = ACCENTS.map((hex) => new Color(hex));
export const WINDOW_LINEAR = WINDOW_COLORS.map((hex) => new Color(hex));

/** Writes the linear RGB of `color` into `target` at `index * 3`. */
export function writeColor(target: Float32Array, index: number, color: Color) {
  target[index * 3] = color.r;
  target[index * 3 + 1] = color.g;
  target[index * 3 + 2] = color.b;
}
