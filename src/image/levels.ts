/**
 * The 4 gray levels, ordered by brightness.
 * 0 = black, 1 = dark gray, 2 = light gray, 3 = white
 *
 * Format-specific value mappings (e.g. XTH swaps the order of the two grays)
 * are handled by each encoder.
 */
export type Level = 0 | 1 | 2 | 3;

/** 8-bit gray value for each level. Matches the device's native gray levels (0, 85, 170, 255) */
export const LEVEL_GRAY: readonly number[] = [0, 85, 170, 255];

export function nearestLevel(v: number): Level {
  if (v <= 42.5) return 0;
  if (v <= 127.5) return 1;
  if (v <= 212.5) return 2;
  return 3;
}

export function levelCss(level: Level): string {
  const g = LEVEL_GRAY[level];
  return `rgb(${g}, ${g}, ${g})`;
}
