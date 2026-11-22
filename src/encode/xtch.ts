/**
 * Encoder for XTCH (the 2-bit grayscale XTC container) and its page format XTH.
 *
 * Specification: https://gist.github.com/CrazyCoder/b125f26d6987c0620058249f59f1327d
 * Cross-checked against: CrossPoint Reader (lib/Xtc) and EPUB2XTC (converter.py)
 */

const XTCH_MAGIC = 0x48435458; // "XTCH"
const XTH_MAGIC = 0x00485458; // "XTH\0"
/**
 * 0x0100 as a uint16 (= v1.0), matching the specification and how EPUB2XTC writes it.
 * CrossPoint accepts both this byte order and the byte-swapped one.
 */
const XTC_VERSION = 0x0100;

const CONTAINER_HEADER_SIZE = 56;
const METADATA_SIZE = 256;
const INDEX_ENTRY_SIZE = 16;
const PAGE_HEADER_SIZE = 22;

/**
 * XTH pixel values, converted from levels (0 = black to 3 = white).
 * In XTH, 0 = white, 1 = dark gray, 2 = light gray, 3 = black, so the two grays are not in brightness order.
 */
const XTH_VALUE_OF_LEVEL = [3, 1, 2, 0];

function xthDataSize(width: number, height: number): number {
  // Each column packs 8 vertical pixels per byte and is padded to a byte boundary. Times two bit planes
  return width * Math.ceil(height / 8) * 2;
}

export function xtchFileSize(width: number, height: number): number {
  return CONTAINER_HEADER_SIZE + METADATA_SIZE + INDEX_ENTRY_SIZE + PAGE_HEADER_SIZE + xthDataSize(width, height);
}

/**
 * Builds one XTH page (a 22-byte header + 2 bit planes).
 *
 * - Columns are ordered from the right edge (x = width - 1) to the left
 * - Each byte holds 8 vertical pixels, with the MSB being the topmost pixel
 * - The first plane holds the high bits and the second plane the low bits
 */
export function encodeXth(levels: Uint8Array, width: number, height: number): Uint8Array {
  const dataSize = xthDataSize(width, height);
  const buf = new Uint8Array(PAGE_HEADER_SIZE + dataSize);
  const view = new DataView(buf.buffer);
  view.setUint32(0, XTH_MAGIC, true);
  view.setUint16(4, width, true);
  view.setUint16(6, height, true);
  buf[8] = 0; // colorMode
  buf[9] = 0; // compression: none
  view.setUint32(10, dataSize, true);
  // The 8 bytes from 0x0E are the start of an MD5 (optional, so left as 0)

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
  /** Metadata language. Defaults to "ja" */
  language?: string;
  /** Unix time (seconds). Defaults to the current time */
  createdAt?: number;
}

/** Builds a single-page XTCH file */
export function encodeXtch(levels: Uint8Array, width: number, height: number, opts: XtchOptions = {}): Uint8Array {
  const page = encodeXth(levels, width, height);
  const metadataOffset = CONTAINER_HEADER_SIZE;
  const indexOffset = metadataOffset + METADATA_SIZE;
  const dataOffset = indexOffset + INDEX_ENTRY_SIZE;
  const buf = new Uint8Array(dataOffset + page.length);
  const view = new DataView(buf.buffer);

  // Header
  view.setUint32(0x00, XTCH_MAGIC, true);
  view.setUint16(0x04, XTC_VERSION, true);
  view.setUint16(0x06, 1, true); // pageCount
  buf[0x08] = 0; // readDirection: left to right
  buf[0x09] = 1; // hasMetadata
  buf[0x0a] = 0; // hasThumbnails
  buf[0x0b] = 0; // hasChapters
  view.setUint32(0x0c, 0, true); // currentPage
  view.setBigUint64(0x10, BigInt(metadataOffset), true);
  view.setBigUint64(0x18, BigInt(indexOffset), true);
  view.setBigUint64(0x20, BigInt(dataOffset), true);
  view.setBigUint64(0x28, 0n, true); // thumbOffset
  view.setBigUint64(0x30, 0n, true); // chapterOffset

  // Metadata
  writeCString(buf, metadataOffset + 0x00, 128, opts.title ?? '');
  writeCString(buf, metadataOffset + 0x80, 64, opts.author ?? '');
  writeCString(buf, metadataOffset + 0xc0, 32, 'xteink-sleep-converter');
  writeCString(buf, metadataOffset + 0xe0, 16, opts.language ?? 'ja');
  view.setUint32(metadataOffset + 0xf0, opts.createdAt ?? Math.floor(Date.now() / 1000), true);
  view.setUint16(metadataOffset + 0xf4, 0, true); // coverPage
  view.setUint16(metadataOffset + 0xf6, 0, true); // chapterCount

  // Page index
  view.setBigUint64(indexOffset + 0x00, BigInt(dataOffset), true);
  view.setUint32(indexOffset + 0x08, page.length, true);
  view.setUint16(indexOffset + 0x0c, width, true);
  view.setUint16(indexOffset + 0x0e, height, true);

  buf.set(page, dataOffset);
  return buf;
}

/** Writes a NUL-terminated UTF-8 string. If it does not fit, truncates without splitting a character */
function writeCString(buf: Uint8Array, offset: number, size: number, text: string): void {
  const encoder = new TextEncoder();
  let bytes = encoder.encode(text);
  if (bytes.length > size - 1) {
    let end = size - 1;
    // If inside UTF-8 continuation bytes (10xxxxxx), back up to the start of the character
    while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
    bytes = bytes.subarray(0, end);
  }
  buf.set(bytes, offset);
}
