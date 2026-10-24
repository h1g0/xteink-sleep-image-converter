import { LEVEL_GRAY, nearestLevel } from './levels';

export type DitherMethod = 'none' | 'floyd-steinberg' | 'atkinson' | 'stucki' | 'bayer';

export interface DitherSettings {
  method: DitherMethod;
  /** 0〜100。誤差拡散なら拡散する誤差の割合、Bayer なら閾値の揺らぎの大きさ */
  strength: number;
  /** 誤差拡散で行ごとに走査方向を反転し、斜めの模様を出にくくする */
  serpentine: boolean;
}

/** [dx, dy, 重み] */
type Tap = readonly [number, number, number];

interface Kernel {
  divisor: number;
  taps: readonly Tap[];
}

const KERNELS: Record<'floyd-steinberg' | 'atkinson' | 'stucki', Kernel> = {
  'floyd-steinberg': {
    divisor: 16,
    taps: [
      [1, 0, 7],
      [-1, 1, 3],
      [0, 1, 5],
      [1, 1, 1],
    ],
  },
  // 誤差の 6/8 だけを拡散するので、コントラストが強くノイズの少ない仕上がりになる
  atkinson: {
    divisor: 8,
    taps: [
      [1, 0, 1],
      [2, 0, 1],
      [-1, 1, 1],
      [0, 1, 1],
      [1, 1, 1],
      [0, 2, 1],
    ],
  },
  stucki: {
    divisor: 42,
    taps: [
      [1, 0, 8],
      [2, 0, 4],
      [-2, 1, 2],
      [-1, 1, 4],
      [0, 1, 8],
      [1, 1, 4],
      [2, 1, 2],
      [-2, 2, 1],
      [-1, 2, 2],
      [0, 2, 4],
      [1, 2, 2],
      [2, 2, 1],
    ],
  },
};

const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52,
  20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45,
  5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

/**
 * 0〜255 のグレー値を 4 階調のレベル (0 = 黒 〜 3 = 白) に減色する。
 */
export function quantize(gray: Float32Array, w: number, h: number, s: DitherSettings): Uint8Array {
  const out = new Uint8Array(w * h);
  const strength = s.strength / 100;
  if (s.method === 'none' || strength <= 0) {
    for (let i = 0; i < out.length; i++) out[i] = nearestLevel(gray[i]);
  } else if (s.method === 'bayer') {
    const amp = 85 * strength;
    for (let y = 0; y < h; y++) {
      const brow = (y & 7) * 8;
      for (let x = 0; x < w; x++) {
        const t = (BAYER8[brow + (x & 7)] + 0.5) / 64 - 0.5;
        const i = y * w + x;
        out[i] = nearestLevel(gray[i] + t * amp);
      }
    }
  } else {
    diffuse(gray, w, h, KERNELS[s.method], strength, s.serpentine, out);
  }
  return out;
}

function diffuse(
  gray: Float32Array,
  w: number,
  h: number,
  kernel: Kernel,
  strength: number,
  serpentine: boolean,
  out: Uint8Array,
): void {
  // 左右と下に余白を付けたバッファで計算し、拡散先の範囲チェックを省く。余白に落ちた誤差は捨てる
  const margin = 2;
  const pw = w + margin * 2;
  const buf = new Float32Array(pw * (h + margin));
  for (let y = 0; y < h; y++) buf.set(gray.subarray(y * w, y * w + w), y * pw + margin);

  const count = kernel.taps.length;
  const weights = Float32Array.from(kernel.taps, (t) => (t[2] * strength) / kernel.divisor);
  const forward = Int32Array.from(kernel.taps, ([dx, dy]) => dy * pw + dx);
  const backward = Int32Array.from(kernel.taps, ([dx, dy]) => dy * pw - dx);

  for (let y = 0; y < h; y++) {
    const reverse = serpentine && (y & 1) === 1;
    const offsets = reverse ? backward : forward;
    for (let n = 0; n < w; n++) {
      const x = reverse ? w - 1 - n : n;
      const bi = y * pw + x + margin;
      const old = buf[bi];
      const v = old < 0 ? 0 : old > 255 ? 255 : old;
      const level = nearestLevel(v);
      out[y * w + x] = level;
      const err = v - LEVEL_GRAY[level];
      if (err === 0) continue;
      for (let t = 0; t < count; t++) buf[bi + offsets[t]] += err * weights[t];
    }
  }
}
