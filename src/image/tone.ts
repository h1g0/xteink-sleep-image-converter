export interface ToneSettings {
  /** 明るさのヒストグラムを 0〜255 いっぱいに広げる */
  autoLevels: boolean;
  /** -100〜100 */
  brightness: number;
  /** -100〜100 */
  contrast: number;
  /** 0.3〜3。1 で変化なし、大きいほど中間調が明るくなる */
  gamma: number;
  /** 0〜100 */
  sharpen: number;
  invert: boolean;
}

/** BT.601 の輝度を 0〜255 の整数で返す */
export function luminance(r: number, g: number, b: number): number {
  return (77 * r + 150 * g + 29 * b + 128) >> 8;
}

/** 自動レベル補正で切り捨てる、暗部・明部それぞれの画素の割合 */
const AUTO_LEVEL_CLIP = 0.005;

/** ヒストグラムから自動レベル補正の範囲を求める。補正の必要がなければ null */
export function autoLevelRange(hist: Uint32Array): [number, number] | null {
  let total = 0;
  for (let i = 0; i < 256; i++) total += hist[i];
  if (total === 0) return null;
  const clip = total * AUTO_LEVEL_CLIP;
  let lo = 0;
  for (let acc = 0; lo < 255; lo++) {
    acc += hist[lo];
    if (acc > clip) break;
  }
  let hi = 255;
  for (let acc = 0; hi > 0; hi--) {
    acc += hist[hi];
    if (acc > clip) break;
  }
  if (hi - lo < 8) return null;
  return [lo, hi];
}

/** 輝度 0〜255 から補正後の値への変換表を作る */
export function buildToneLut(s: ToneSettings, range: [number, number] | null): Float32Array {
  const lut = new Float32Array(256);
  const k = s.contrast >= 0 ? 1 + s.contrast / 50 : 1 + s.contrast / 100;
  const invGamma = 1 / s.gamma;
  for (let i = 0; i < 256; i++) {
    let v = i;
    if (range) v = ((v - range[0]) * 255) / (range[1] - range[0]);
    v = clamp255(v);
    v = 255 * Math.pow(v / 255, invGamma);
    v = (v - 127.5) * k + 127.5;
    v += s.brightness * 1.275;
    v = clamp255(v);
    lut[i] = s.invert ? 255 - v : v;
  }
  return lut;
}

/** 3×3 のぼかしを使ったアンシャープマスク。gray をその場で書き換える */
export function sharpen(gray: Float32Array, w: number, h: number, amount: number): void {
  if (amount <= 0) return;
  const k = amount / 50;
  const src = gray.slice();
  const tmp = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const l = x > 0 ? x - 1 : x;
      const r = x < w - 1 ? x + 1 : x;
      tmp[row + x] = (src[row + l] + src[row + x] + src[row + r]) / 3;
    }
  }
  for (let y = 0; y < h; y++) {
    const up = (y > 0 ? y - 1 : y) * w;
    const row = y * w;
    const down = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) {
      const blur = (tmp[up + x] + tmp[row + x] + tmp[down + x]) / 3;
      const i = row + x;
      gray[i] = src[i] + k * (src[i] - blur);
    }
  }
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
