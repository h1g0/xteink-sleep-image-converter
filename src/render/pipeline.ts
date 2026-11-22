import { drawCalendar, layoutCalendar, type CalendarPart, type CalendarSettings } from '../calendar/render';
import type { HoldDirection, Orientation, Size } from '../devices';
import { quantize, type DitherSettings } from '../image/dither';
import { LEVEL_GRAY, nearestLevel, type Level } from '../image/levels';
import { rotate90 } from '../image/rotate';
import { autoLevelRange, buildToneLut, luminance, sharpen, type ToneSettings } from '../image/tone';
import { drawSource, type Placement, type SourceImage } from './source';

export interface RenderParams {
  frame: Size;
  source: SourceImage | null;
  placement: Placement;
  /** Color of areas not covered by the image */
  background: Level;
  tone: ToneSettings;
  dither: DitherSettings;
  calendar: CalendarSettings;
  /** CSS font-family used for the calendar */
  calendarFamily: string;
}

/**
 * Renders the frame into a 4-level array (0 = black to 3 = white).
 *
 * 1. Place the image, convert it to grayscale and apply tone adjustments
 * 2. Blend a semi-transparent calendar background into the image before dithering
 * 3. Overlay text and opaque backgrounds after dithering so they stay free of dither noise
 */
export class Renderer {
  private readonly work = document.createElement('canvas');
  private readonly workCtx = this.work.getContext('2d', { willReadFrequently: true })!;
  private readonly layer = document.createElement('canvas');
  private readonly layerCtx = this.layer.getContext('2d', { willReadFrequently: true })!;

  render(p: RenderParams): Uint8Array {
    const { width: W, height: H } = p.frame;
    const n = W * H;
    for (const c of [this.work, this.layer]) {
      if (c.width !== W || c.height !== H) {
        c.width = W;
        c.height = H;
      }
    }

    const ctx = this.workCtx;
    ctx.clearRect(0, 0, W, H);
    if (p.source) drawSource(ctx, p.source, p.placement, p.frame);
    const rgba = ctx.getImageData(0, 0, W, H).data;

    const lum = new Uint8Array(n);
    const hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) {
      const a = rgba[i * 4 + 3];
      if (a === 0) continue;
      const l = luminance(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
      lum[i] = l;
      if (a >= 128) hist[l]++;
    }
    const lut = buildToneLut(p.tone, p.tone.autoLevels ? autoLevelRange(hist) : null);
    const bg = LEVEL_GRAY[p.background];
    const gray = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = rgba[i * 4 + 3];
      gray[i] = a === 255 ? lut[lum[i]] : a === 0 ? bg : (lut[lum[i]] * a + bg * (255 - a)) / 255;
    }
    sharpen(gray, W, H, p.tone.sharpen);

    const cal = p.calendar;
    const layout = cal.enabled ? layoutCalendar(cal) : null;
    const opaquePanel = cal.panel && cal.panelOpacity >= 100;
    if (layout && cal.panel && !opaquePanel && cal.panelOpacity > 0) {
      const data = this.drawLayer(W, H, (c) => drawCalendar(c, cal, layout, p.calendarFamily, 'panel'));
      const target = LEVEL_GRAY[cal.panelColor];
      const opacity = cal.panelOpacity / 100;
      for (let i = 0; i < n; i++) {
        const a = data[i * 4 + 3];
        if (a !== 0) gray[i] += (target - gray[i]) * (a / 255) * opacity;
      }
    }

    const levels = quantize(gray, W, H, p.dither);

    if (layout) {
      const part: CalendarPart = opaquePanel ? 'all' : 'content';
      const data = this.drawLayer(W, H, (c) => drawCalendar(c, cal, layout, p.calendarFamily, part));
      overlay(levels, data, cal.crisp);
    }
    return levels;
  }

  private drawLayer(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Uint8ClampedArray {
    const ctx = this.layerCtx;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    draw(ctx);
    ctx.restore();
    return ctx.getImageData(0, 0, W, H).data;
  }
}

/** Composites layer pixels onto the level array. Semi-transparent edges are blended with the level below, then snapped to the nearest level */
function overlay(levels: Uint8Array, rgba: Uint8ClampedArray, crisp: boolean): void {
  for (let i = 0; i < levels.length; i++) {
    const a = rgba[i * 4 + 3];
    if (a === 0) continue;
    const g = rgba[i * 4 + 1];
    if (crisp) {
      if (a >= 128) levels[i] = nearestLevel(g);
    } else {
      levels[i] = nearestLevel(a === 255 ? g : (g * a + LEVEL_GRAY[levels[i]] * (255 - a)) / 255);
    }
  }
}

/**
 * Converts the editing frame into the portrait pixel array saved to the device.
 * If the device is held turned clockwise, the image must be saved rotated counterclockwise to appear upright.
 */
export function toDeviceLevels(
  levels: Uint8Array,
  frame: Size,
  orientation: Orientation,
  hold: HoldDirection,
): Uint8Array {
  if (orientation === 'portrait') return levels;
  return rotate90(levels, frame.width, frame.height, hold === 'cw' ? 'ccw' : 'cw');
}

export function levelsToImageData(levels: Uint8Array, width: number, height: number): ImageData {
  const img = new ImageData(width, height);
  const d = img.data;
  for (let i = 0; i < levels.length; i++) {
    const g = LEVEL_GRAY[levels[i]];
    d[i * 4] = g;
    d[i * 4 + 1] = g;
    d[i * 4 + 2] = g;
    d[i * 4 + 3] = 255;
  }
  return img;
}
