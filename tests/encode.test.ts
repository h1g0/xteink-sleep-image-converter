import { describe, expect, it } from 'vitest';
import { bmpFileSize, encodeBmp, type BmpBitDepth } from '../src/encode/bmp';
import { encodeXtch, encodeXth, xtchFileSize } from '../src/encode/xtch';
import { LEVEL_GRAY } from '../src/image/levels';

function pattern(w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = (x * 7 + y * 3 + ((x * y) >> 2)) & 3;
  return out;
}

/** CrossPoint の Bitmap.cpp と同じ読み方で BMP を各画素のグレー値に戻す */
function decodeBmp(buf: Uint8Array): { width: number; height: number; gray: Uint8Array; nativePalette: boolean } {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  expect(String.fromCharCode(buf[0], buf[1])).toBe('BM');
  expect(view.getUint32(2, true)).toBe(buf.length);
  const offBits = view.getUint32(10, true);
  const width = view.getInt32(18, true);
  const rawHeight = view.getInt32(22, true);
  const bpp = view.getUint16(28, true);
  expect(view.getUint16(26, true)).toBe(1);
  expect(view.getUint32(30, true)).toBe(0);
  const topDown = rawHeight < 0;
  const height = Math.abs(rawHeight);
  let colorsUsed = view.getUint32(46, true);
  if (colorsUsed === 0 && bpp <= 8) colorsUsed = 1 << bpp;
  const paletteLum = new Uint8Array(256).map((_, i) => i);
  for (let i = 0; i < colorsUsed; i++) {
    const p = 54 + i * 4;
    paletteLum[i] = (77 * buf[p + 2] + 150 * buf[p + 1] + 29 * buf[p]) >> 8;
  }
  let nativePalette = bpp <= 2;
  if (!nativePalette && colorsUsed > 0) {
    nativePalette = true;
    for (let i = 0; i < colorsUsed; i++) {
      const lum = paletteLum[i];
      const rec = (lum >> 6) * 85;
      if (lum > rec + 21 || lum + 21 < rec) nativePalette = false;
    }
  }
  const stride = Math.ceil((width * bpp) / 32) * 4;
  const gray = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    const y = topDown ? row : height - 1 - row;
    const base = offBits + row * stride;
    for (let x = 0; x < width; x++) {
      let v: number;
      if (bpp === 24) v = buf[base + x * 3];
      else if (bpp === 8) v = paletteLum[buf[base + x]];
      else if (bpp === 4) v = paletteLum[(buf[base + (x >> 1)] >> ((1 - (x & 1)) * 4)) & 0xf];
      else v = paletteLum[(buf[base + (x >> 2)] >> ((3 - (x & 3)) * 2)) & 0x3];
      gray[y * width + x] = v;
    }
  }
  return { width, height, gray, nativePalette };
}

/** CrossPoint の Xtc.cpp と同じ読み方で XTH を 0〜255 のグレー値に戻す */
function decodeXth(page: Uint8Array): { width: number; height: number; gray: Uint8Array } {
  const view = new DataView(page.buffer, page.byteOffset, page.byteLength);
  expect(view.getUint32(0, true)).toBe(0x00485458);
  const width = view.getUint16(4, true);
  const height = view.getUint16(6, true);
  const dataSize = view.getUint32(10, true);
  const colBytes = Math.ceil(height / 8);
  expect(dataSize).toBe(width * colBytes * 2);
  const planeSize = width * colBytes;
  const plane1 = page.subarray(22, 22 + planeSize);
  const plane2 = page.subarray(22 + planeSize, 22 + planeSize * 2);
  const xthToGray = [255, 85, 170, 0];
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const col = width - 1 - x;
      const byteOffset = col * colBytes + (y >> 3);
      const bitInByte = 7 - (y & 7);
      const bit1 = (plane1[byteOffset] >> bitInByte) & 1;
      const bit2 = (plane2[byteOffset] >> bitInByte) & 1;
      gray[y * width + x] = xthToGray[(bit1 << 1) | bit2];
    }
  }
  return { width, height, gray };
}

const toGray = (levels: Uint8Array) => levels.map((l) => LEVEL_GRAY[l]);

describe('encodeBmp', () => {
  const depths: BmpBitDepth[] = [2, 4, 8, 24];
  for (const depth of depths) {
    it(`${depth}bit で全画素が往復できる`, () => {
      // 幅を 4 の倍数からずらして行パディングも確認する
      const w = 37;
      const h = 11;
      const levels = pattern(w, h);
      const buf = encodeBmp(levels, w, h, depth);
      expect(buf.length).toBe(bmpFileSize(w, h, depth));
      const decoded = decodeBmp(buf);
      expect(decoded.width).toBe(w);
      expect(decoded.height).toBe(h);
      expect(decoded.gray).toEqual(toGray(levels));
      if (depth !== 24) expect(decoded.nativePalette).toBe(true);
    });
  }

  it('X3 の 8bit BMP のサイズ', () => {
    expect(bmpFileSize(528, 792, 8)).toBe(14 + 40 + 1024 + 528 * 792);
  });
});

describe('encodeXth / encodeXtch', () => {
  it('XTH の画素が CrossPoint の読み方で元に戻る', () => {
    const w = 13;
    const h = 21; // 8 の倍数でない高さで列ごとのパディングを確認する
    const levels = pattern(w, h);
    const decoded = decodeXth(encodeXth(levels, w, h));
    expect(decoded.gray).toEqual(toGray(levels));
  });

  it('レベルと XTH の値の対応 (0 = 白, 1 = 濃いグレー, 2 = 薄いグレー, 3 = 黒)', () => {
    // 1 列 × 4 行: 上から 黒, 濃いグレー, 薄いグレー, 白
    const page = encodeXth(new Uint8Array([0, 1, 2, 3]), 1, 4);
    // 1 枚目のプレーン (上位ビット) は 1,0,1,0 → 0b1010_0000、2 枚目 (下位ビット) は 1,1,0,0 → 0b1100_0000
    expect(page[22]).toBe(0b1010_0000);
    expect(page[23]).toBe(0b1100_0000);
  });

  it('480×800 のプレーンサイズが仕様の例と一致する', () => {
    const page = encodeXth(new Uint8Array(480 * 800), 480, 800);
    expect(page.length - 22).toBe(96000);
  });

  it('XTCH コンテナのヘッダとインデックス', () => {
    const w = 528;
    const h = 792;
    const levels = pattern(w, h);
    const buf = encodeXtch(levels, w, h, { title: 'スリープ画像', createdAt: 1_800_000_000 });
    expect(buf.length).toBe(xtchFileSize(w, h));
    const view = new DataView(buf.buffer);
    expect(String.fromCharCode(...buf.subarray(0, 4))).toBe('XTCH');
    expect([buf[4], buf[5]]).toEqual([0x00, 0x01]);
    expect(view.getUint16(6, true)).toBe(1);
    expect(buf[9]).toBe(1);
    const metadataOffset = Number(view.getBigUint64(0x10, true));
    const indexOffset = Number(view.getBigUint64(0x18, true));
    const dataOffset = Number(view.getBigUint64(0x20, true));
    expect(metadataOffset).toBe(56);
    expect(indexOffset).toBe(56 + 256);
    expect(dataOffset).toBe(56 + 256 + 16);
    const title = new TextDecoder().decode(buf.subarray(metadataOffset, metadataOffset + 128)).replace(/\0+$/, '');
    expect(title).toBe('スリープ画像');
    expect(view.getUint32(metadataOffset + 0xf0, true)).toBe(1_800_000_000);

    const pageOffset = Number(view.getBigUint64(indexOffset, true));
    const pageSize = view.getUint32(indexOffset + 8, true);
    expect(pageOffset).toBe(dataOffset);
    expect(pageSize).toBe(22 + 528 * 99 * 2);
    expect(view.getUint16(indexOffset + 12, true)).toBe(w);
    expect(view.getUint16(indexOffset + 14, true)).toBe(h);
    const decoded = decodeXth(buf.subarray(pageOffset, pageOffset + pageSize));
    expect(decoded.gray).toEqual(toGray(levels));
  });

  it('長いタイトルは UTF-8 の文字境界で切り詰める', () => {
    const buf = encodeXtch(new Uint8Array(8), 1, 8, { title: 'あ'.repeat(100) });
    const raw = buf.subarray(56, 56 + 128);
    expect(raw[127]).toBe(0);
    const title = new TextDecoder('utf-8', { fatal: true }).decode(raw).replace(/\0+$/, '');
    expect(title).toBe('あ'.repeat(42));
  });
});
