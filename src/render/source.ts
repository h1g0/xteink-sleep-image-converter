import type { Size } from '../devices';

export type QuarterTurn = 0 | 1 | 2 | 3;

/** 読み込んだ画像をフレームのどこにどう置くか */
export interface Placement {
  /** 画面をちょうど埋める倍率を 1 とした拡大率 */
  zoom: number;
  /** 画像の中心のフレーム中心からのずれ (フレームの px) */
  offsetX: number;
  offsetY: number;
  /** 時計回りに 90° 単位 */
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
 * 読み込んだ画像。大きく縮小して描くときにエイリアシングが出ないよう、
 * 半分ずつ縮小した画像を必要になった分だけ作って使い回す。
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

  /** 元画像を scale 倍で描くのに使う画像。そこからの縮小率が 0.5〜1 に収まるものを返す */
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

/** 画像でフレームをちょうど埋める倍率 */
export function coverScale(src: Size, frame: Size, rotation: QuarterTurn): number {
  const r = rotatedSize(src, rotation);
  return Math.max(frame.width / r.width, frame.height / r.height);
}

/** 画像全体がフレームにちょうど収まる倍率 */
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
