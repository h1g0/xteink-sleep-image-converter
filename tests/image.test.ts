import { describe, expect, it } from 'vitest';
import { quantize, type DitherMethod } from '../src/image/dither';
import { LEVEL_GRAY, nearestLevel } from '../src/image/levels';
import { rotate90 } from '../src/image/rotate';
import { autoLevelRange, buildToneLut } from '../src/image/tone';

describe('nearestLevel', () => {
  it('ネイティブ階調はそのまま', () => {
    expect(LEVEL_GRAY.map(nearestLevel)).toEqual([0, 1, 2, 3]);
  });
});

describe('quantize', () => {
  const methods: DitherMethod[] = ['none', 'floyd-steinberg', 'atkinson', 'stucki', 'bayer'];

  for (const method of methods) {
    it(`${method}: ネイティブ階調の一様な面はノイズなく変換される`, () => {
      for (const level of [0, 1, 2, 3]) {
        const gray = new Float32Array(64 * 64).fill(LEVEL_GRAY[level]);
        const out = quantize(gray, 64, 64, { method, strength: 100, serpentine: true });
        expect(out.every((v) => v === level)).toBe(true);
      }
    });
  }

  for (const method of ['floyd-steinberg', 'stucki', 'bayer'] as const) {
    it(`${method}: 中間の明るさの平均がおおむね保たれる`, () => {
      const w = 128;
      const h = 128;
      const gray = new Float32Array(w * h).fill(120);
      const out = quantize(gray, w, h, { method, strength: 100, serpentine: true });
      let sum = 0;
      for (const v of out) sum += LEVEL_GRAY[v];
      expect(sum / out.length).toBeGreaterThan(115);
      expect(sum / out.length).toBeLessThan(125);
    });
  }
});

describe('rotate90', () => {
  // 3×2:
  // a b c
  // d e f
  const src = new Uint8Array([1, 2, 3, 4, 5, 6]);

  it('時計回り', () => {
    // d a
    // e b
    // f c
    expect([...rotate90(src, 3, 2, 'cw')]).toEqual([4, 1, 5, 2, 6, 3]);
  });

  it('反時計回り', () => {
    // c f
    // b e
    // a d
    expect([...rotate90(src, 3, 2, 'ccw')]).toEqual([3, 6, 2, 5, 1, 4]);
  });
});

describe('tone', () => {
  const neutral = { autoLevels: false, brightness: 0, contrast: 0, gamma: 1, sharpen: 0, invert: false };

  it('無補正の変換表は恒等写像', () => {
    const lut = buildToneLut(neutral, null);
    for (let i = 0; i < 256; i++) expect(lut[i]).toBeCloseTo(i, 4);
  });

  it('反転', () => {
    const lut = buildToneLut({ ...neutral, invert: true }, null);
    expect(lut[0]).toBe(255);
    expect(lut[255]).toBe(0);
  });

  it('自動レベル補正の範囲', () => {
    const hist = new Uint32Array(256);
    hist[50] = 1000;
    hist[200] = 1000;
    expect(autoLevelRange(hist)).toEqual([50, 200]);
    const lut = buildToneLut({ ...neutral, autoLevels: true }, [50, 200]);
    expect(lut[50]).toBe(0);
    expect(lut[200]).toBe(255);
  });
});
