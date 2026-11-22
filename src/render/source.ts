import type { Size } from '../devices';

export type QuarterTurn = 0 | 1 | 2 | 3;

/** Where and how the loaded image is placed in the frame */
export interface Placement {
  /** Zoom factor, where 1 is the scale that exactly fills the frame */
  zoom: number;
  /** Offset of the image center from the frame center (in frame px) */
  offsetX: number;
  offsetY: number;
  /** Clockwise, in 90° steps */
  rotation: QuarterTurn;
  flipH: boolean;
}

export const DEFAULT_PLACEMENT: Placement = { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, flipH: false };

interface MipLevel {
  image: CanvasImageSource;
  width: number;
  height: number;
}

/**
 * A loaded image. To avoid aliasing when drawing at a large reduction, it lazily builds
 * successively halved copies as needed and reuses them.
 */
export class SourceImage {
  readonly width: number;
  readonly height: number;
  private readonly mips: MipLevel[];

  constructor(
    private readonly bitmap: ImageBitmap,
    readonly name: string,
  ) {
    this.width = bitmap.width;
    this.height = bitmap.height;
    this.mips = [{ image: bitmap, width: bitmap.width, height: bitmap.height }];
  }

  /** The image to use for drawing the original at the given scale. Returns one whose remaining reduction factor is within 0.5–1 */
  pick(scale: number): MipLevel {
    let level = 0;
    for (;;) {
      const cur = this.mips[level];
      const nextW = Math.ceil(cur.width / 2);
      const nextH = Math.ceil(cur.height / 2);
      if (cur.width <= 1 || cur.height <= 1 || nextW / this.width < scale) return cur;
      if (!this.mips[level + 1]) this.mips.push(halve(cur, nextW, nextH));
      level++;
    }
  }

  close(): void {
    this.bitmap.close();
  }
}

function halve(src: MipLevel, width: number, height: number): MipLevel {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src.image, 0, 0, width, height);
  return { image: canvas, width, height };
}

function rotatedSize(src: Size, rotation: QuarterTurn): Size {
  return rotation % 2 === 0 ? src : { width: src.height, height: src.width };
}

/** Scale at which the image exactly fills the frame */
export function coverScale(src: Size, frame: Size, rotation: QuarterTurn): number {
  const r = rotatedSize(src, rotation);
  return Math.max(frame.width / r.width, frame.height / r.height);
}

/** Scale at which the whole image exactly fits within the frame */
export function containScale(src: Size, frame: Size, rotation: QuarterTurn): number {
  const r = rotatedSize(src, rotation);
  return Math.min(frame.width / r.width, frame.height / r.height);
}

export function drawSource(ctx: CanvasRenderingContext2D, src: SourceImage, p: Placement, frame: Size): void {
  const scale = p.zoom * coverScale(src, frame, p.rotation);
  const mip = src.pick(scale);
  const k = (scale * src.width) / mip.width;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(frame.width / 2 + p.offsetX, frame.height / 2 + p.offsetY);
  ctx.rotate((p.rotation * Math.PI) / 2);
  ctx.scale(p.flipH ? -k : k, k);
  ctx.drawImage(mip.image, -mip.width / 2, -mip.height / 2);
  ctx.restore();
}
