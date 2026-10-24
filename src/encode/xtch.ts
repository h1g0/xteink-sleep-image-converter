/**
 * XTCH (2bit グレースケールの XTC コンテナ) と、その中のページ形式 XTH のエンコーダ。
 *
 * 仕様: https://gist.github.com/CrazyCoder/b125f26d6987c0620058249f59f1327d
 * 実装の突き合わせ先: CrossPoint Reader (lib/Xtc) と EPUB2XTC (converter.py)
 */

const XTCH_MAGIC = 0x48435458; // "XTCH"
const XTH_MAGIC = 0x00485458; // "XTH\0"
/**
 * uint16 で 0x0100 (= v1.0)。仕様と EPUB2XTC の書き方に合わせている。
 * CrossPoint はこの並びとバイトを入れ替えた並びの両方を受け付ける。
 */
const XTC_VERSION = 0x0100;

const CONTAINER_HEADER_SIZE = 56;
const METADATA_SIZE = 256;
const INDEX_ENTRY_SIZE = 16;
const PAGE_HEADER_SIZE = 22;

/**
 * XTH の画素値。レベル (0 = 黒 〜 3 = 白) から変換する。
 * XTH では 0 = 白, 1 = 濃いグレー, 2 = 薄いグレー, 3 = 黒 で、グレー 2 色が明るさ順になっていない。
 */
const XTH_VALUE_OF_LEVEL = [3, 1, 2, 0];

function xthDataSize(width: number, height: number): number {
  // 列ごとに縦 8 画素を 1 バイトに詰め、列単位でバイト境界に揃える。それがビットプレーン 2 枚分
  return width * Math.ceil(height / 8) * 2;
}

export function xtchFileSize(width: number, height: number): number {
  return CONTAINER_HEADER_SIZE + METADATA_SIZE + INDEX_ENTRY_SIZE + PAGE_HEADER_SIZE + xthDataSize(width, height);
}

/**
 * 1 ページ分の XTH (22 バイトのヘッダ + ビットプレーン 2 枚) を作る。
 *
 * - 列は右端 (x = width - 1) から左へ並べる
 * - 1 バイトに縦方向の 8 画素を詰め、MSB が一番上の画素
 * - 1 枚目のプレーンに上位ビット、2 枚目に下位ビットを入れる
 */
export function encodeXth(levels: Uint8Array, width: number, height: number): Uint8Array {
  const dataSize = xthDataSize(width, height);
  const buf = new Uint8Array(PAGE_HEADER_SIZE + dataSize);
  const view = new DataView(buf.buffer);
  view.setUint32(0, XTH_MAGIC, true);
  view.setUint16(4, width, true);
  view.setUint16(6, height, true);
  buf[8] = 0; // colorMode
  buf[9] = 0; // compression: 非圧縮
  view.setUint32(10, dataSize, true);
  // 0x0E からの 8 バイトは MD5 の先頭 (任意項目なので 0 のまま)

  const colBytes = Math.ceil(height / 8);
  const plane1 = PAGE_HEADER_SIZE;
  const plane2 = PAGE_HEADER_SIZE + dataSize / 2;
  for (let col = 0; col < width; col++) {
    const x = width - 1 - col;
    const colBase = col * colBytes;
    for (let y = 0; y < height; y++) {
      const v = XTH_VALUE_OF_LEVEL[levels[y * width + x]];
      if (v === 0) continue;
      const byte = colBase + (y >> 3);
      const mask = 0x80 >> (y & 7);
      if (v & 2) buf[plane1 + byte] |= mask;
      if (v & 1) buf[plane2 + byte] |= mask;
    }
  }
  return buf;
}

export interface XtchOptions {
  title?: string;
  author?: string;
  /** Unix 時刻 (秒)。省略時は現在時刻 */
  createdAt?: number;
}

/** 1 ページだけの XTCH ファイルを作る */
export function encodeXtch(levels: Uint8Array, width: number, height: number, opts: XtchOptions = {}): Uint8Array {
  const page = encodeXth(levels, width, height);
  const metadataOffset = CONTAINER_HEADER_SIZE;
  const indexOffset = metadataOffset + METADATA_SIZE;
  const dataOffset = indexOffset + INDEX_ENTRY_SIZE;
  const buf = new Uint8Array(dataOffset + page.length);
  const view = new DataView(buf.buffer);

  // ヘッダ
  view.setUint32(0x00, XTCH_MAGIC, true);
  view.setUint16(0x04, XTC_VERSION, true);
  view.setUint16(0x06, 1, true); // pageCount
  buf[0x08] = 0; // readDirection: 左→右
  buf[0x09] = 1; // hasMetadata
  buf[0x0a] = 0; // hasThumbnails
  buf[0x0b] = 0; // hasChapters
  view.setUint32(0x0c, 0, true); // currentPage
  view.setBigUint64(0x10, BigInt(metadataOffset), true);
  view.setBigUint64(0x18, BigInt(indexOffset), true);
  view.setBigUint64(0x20, BigInt(dataOffset), true);
  view.setBigUint64(0x28, 0n, true); // thumbOffset
  view.setBigUint64(0x30, 0n, true); // chapterOffset

  // メタデータ
  writeCString(buf, metadataOffset + 0x00, 128, opts.title ?? '');
  writeCString(buf, metadataOffset + 0x80, 64, opts.author ?? '');
  writeCString(buf, metadataOffset + 0xc0, 32, 'xteink-sleep-converter');
  writeCString(buf, metadataOffset + 0xe0, 16, 'ja');
  view.setUint32(metadataOffset + 0xf0, opts.createdAt ?? Math.floor(Date.now() / 1000), true);
  view.setUint16(metadataOffset + 0xf4, 0, true); // coverPage
  view.setUint16(metadataOffset + 0xf6, 0, true); // chapterCount

  // ページインデックス
  view.setBigUint64(indexOffset + 0x00, BigInt(dataOffset), true);
  view.setUint32(indexOffset + 0x08, page.length, true);
  view.setUint16(indexOffset + 0x0c, width, true);
  view.setUint16(indexOffset + 0x0e, height, true);

  buf.set(page, dataOffset);
  return buf;
}

/** UTF-8 の NUL 終端文字列を書き込む。収まらない場合は文字の途中で切らないように切り詰める */
function writeCString(buf: Uint8Array, offset: number, size: number, text: string): void {
  const encoder = new TextEncoder();
  let bytes = encoder.encode(text);
  if (bytes.length > size - 1) {
    let end = size - 1;
    // UTF-8 の継続バイト (10xxxxxx) の途中なら文字の先頭まで戻る
    while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
    bytes = bytes.subarray(0, end);
  }
  buf.set(bytes, offset);
}
