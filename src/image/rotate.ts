export type RotateDirection = 'cw' | 'ccw';

/**
 * Rotates a one-byte-per-pixel image by 90°. A w×h input becomes h×w.
 */
export function rotate90(src: Uint8Array, w: number, h: number, dir: RotateDirection): Uint8Array {
  const dst = new Uint8Array(src.length);
  // The output width is h
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = src[y * w + x];
      if (dir === 'cw') {
        // (x, y) -> (h - 1 - y, x)
        dst[x * h + (h - 1 - y)] = v;
      } else {
        // (x, y) -> (y, w - 1 - x)
        dst[(w - 1 - x) * h + y] = v;
      }
    }
  }
  return dst;
}
