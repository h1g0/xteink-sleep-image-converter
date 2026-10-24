import { LEVEL_GRAY } from '../image/levels';

export type BmpBitDepth = 2 | 4 | 8 | 24;

const FILE_HEADER_SIZE = 14;
const INFO_HEADER_SIZE = 40;
/** 72dpi */
const PIXELS_PER_METER = 2835;

function paletteSize(bitDepth: BmpBitDepth): number {
  return bitDepth === 24 ? 0 : 1 << bitDepth;
}

function rowBytes(width: number, bitDepth: BmpBitDepth): number {
  return Math.ceil((width * bitDepth) / 32) * 4;
}

export function bmpFileSize(width: number, height: number, bitDepth: BmpBitDepth): number {
  return FILE_HEADER_SIZE + INFO_HEADER_SIZE + paletteSize(bitDepth) * 4 + rowBytes(width, bitDepth) * height;
}

/**
 * 4 階調のレベル配列 (0 = 黒 〜 3 = 白) を非圧縮 BMP にする。
 *
 * パレット形式ではインデックス 0〜3 に端末のネイティブ階調 (0, 85, 170, 255) を入れ、
 * 残りのエントリは黒で埋める。CrossPoint などのファームウェアはパレットが
 * ネイティブ階調だけで構成されていると再ディザリングせずにそのまま表示する。
 * 行は一般的なボトムアップ順で格納する。
 */
export function encodeBmp(levels: Uint8Array, width: number, height: number, bitDepth: BmpBitDepth): Uint8Array {
  const colors = paletteSize(bitDepth);
  const stride = rowBytes(width, bitDepth);
  const dataOffset = FILE_HEADER_SIZE + INFO_HEADER_SIZE + colors * 4;
  const fileSize = dataOffset + stride * height;
  const buf = new Uint8Array(fileSize);
  const view = new DataView(buf.buffer);

  // BITMAPFILEHEADER
  buf[0] = 0x42; // 'B'
  buf[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(10, dataOffset, true);

  // BITMAPINFOHEADER
  view.setUint32(14, INFO_HEADER_SIZE, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // 正の値 = ボトムアップ
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, bitDepth, true);
  view.setUint32(30, 0, true); // BI_RGB
  view.setUint32(34, stride * height, true);
  view.setInt32(38, PIXELS_PER_METER, true);
  view.setInt32(42, PIXELS_PER_METER, true);
  view.setUint32(46, colors, true); // biClrUsed
  view.setUint32(50, colors === 0 ? 0 : LEVEL_GRAY.length, true); // biClrImportant

  // パレット (B, G, R, 0)
  for (let i = 0; i < LEVEL_GRAY.length && i < colors; i++) {
    const g = LEVEL_GRAY[i];
    const p = FILE_HEADER_SIZE + INFO_HEADER_SIZE + i * 4;
    buf[p] = g;
    buf[p + 1] = g;
    buf[p + 2] = g;
  }

  for (let y = 0; y < height; y++) {
    const src = (height - 1 - y) * width;
    const dst = dataOffset + y * stride;
    switch (bitDepth) {
      case 24:
        for (let x = 0; x < width; x++) {
          const g = LEVEL_GRAY[levels[src + x]];
          const p = dst + x * 3;
          buf[p] = g;
          buf[p + 1] = g;
          buf[p + 2] = g;
        }
        break;
      case 8:
        buf.set(levels.subarray(src, src + width), dst);
        break;
      case 4:
        for (let x = 0; x < width; x++) {
          buf[dst + (x >> 1)] |= levels[src + x] << ((1 - (x & 1)) * 4);
        }
        break;
      case 2:
        for (let x = 0; x < width; x++) {
          buf[dst + (x >> 2)] |= levels[src + x] << ((3 - (x & 3)) * 2);
        }
        break;
    }
  }
  return buf;
}
