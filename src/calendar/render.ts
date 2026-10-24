import { levelCss, type Level } from '../image/levels';
import {
  buildMonthGrid,
  formatTitle,
  weekdayHeaders,
  type DayCell,
  type TitleFormat,
  type WeekdayFormat,
  type WeekStart,
} from './model';

export type GridStyle = 'none' | 'header' | 'all';
export type TitleAlign = 'left' | 'center' | 'right';

export interface CalendarSettings {
  enabled: boolean;
  year: number;
  /** 1〜12 */
  month: number;
  weekStart: WeekStart;
  holidays: boolean;
  /** フレーム内での左上の位置と幅 (px) */
  x: number;
  y: number;
  width: number;
  fontId: string;
  fontWeight: number;
  titleWeight: number;
  titleFormat: TitleFormat;
  titleAlign: TitleAlign;
  weekdayFormat: WeekdayFormat;
  /** 文字の大きさと行の高さ。1 マスの幅に対する % */
  titleSize: number;
  weekdaySize: number;
  daySize: number;
  rowHeight: number;
  textColor: Level;
  sundayColor: Level;
  saturdayColor: Level;
  showOtherMonths: boolean;
  otherMonthColor: Level;
  grid: GridStyle;
  gridColor: Level;
  panel: boolean;
  panelColor: Level;
  /** 0〜100 */
  panelOpacity: number;
  panelRadius: number;
  padding: number;
  outline: boolean;
  outlineColor: Level;
  outlineWidth: number;
  /** 文字のアンチエイリアスを使わず 2 値でくっきり描く */
  crisp: boolean;
}

export interface CalendarLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  pad: number;
  cellW: number;
  titleH: number;
  weekdayH: number;
  rowH: number;
  titleFont: number;
  weekdayFont: number;
  dayFont: number;
  title: string;
  grid: DayCell[][];
}

export function layoutCalendar(s: CalendarSettings): CalendarLayout {
  const grid = buildMonthGrid(s.year, s.month, s.weekStart);
  const title = formatTitle(s.titleFormat, s.year, s.month);
  const pad = s.padding;
  const cellW = Math.max(1, s.width - pad * 2) / 7;
  const titleFont = (cellW * s.titleSize) / 100;
  const weekdayFont = (cellW * s.weekdaySize) / 100;
  const dayFont = (cellW * s.daySize) / 100;
  const titleH = title ? titleFont * 1.6 : 0;
  const weekdayH = s.weekdayFormat === 'none' ? 0 : weekdayFont * 1.9;
  const rowH = (cellW * s.rowHeight) / 100;
  const height = Math.ceil(pad * 2 + titleH + weekdayH + rowH * grid.length);
  return {
    x: s.x,
    y: s.y,
    width: s.width,
    height,
    pad,
    cellW,
    titleH,
    weekdayH,
    rowH,
    titleFont,
    weekdayFont,
    dayFont,
    title,
    grid,
  };
}

/** フォントの読み込みに使う、カレンダーに描く文字の一覧 */
export function calendarText(s: CalendarSettings): string {
  const labels = weekdayHeaders(s.weekdayFormat, 0).map((h) => h.label);
  return formatTitle(s.titleFormat, s.year, s.month) + labels.join('') + '0123456789';
}

/**
 * - panel: 背景パネルだけ
 * - content: 文字と罫線だけ
 * - all: 両方
 */
export type CalendarPart = 'panel' | 'content' | 'all';

export function drawCalendar(
  ctx: CanvasRenderingContext2D,
  s: CalendarSettings,
  L: CalendarLayout,
  family: string,
  part: CalendarPart,
): void {
  if (part !== 'content' && s.panel) {
    ctx.fillStyle = levelCss(s.panelColor);
    ctx.beginPath();
    ctx.roundRect(L.x, L.y, L.width, L.height, Math.min(s.panelRadius, L.width / 2, L.height / 2));
    ctx.fill();
  }
  if (part === 'panel') return;

  const left = L.x + L.pad;
  const innerW = L.cellW * 7;
  let top = L.y + L.pad;
  const colX = (c: number) => left + L.cellW * (c + 0.5);

  if (L.titleH > 0) {
    ctx.font = cssFont(s.titleWeight, L.titleFont, family);
    const inset = L.cellW * 0.2;
    const [x, align]: [number, CanvasTextAlign] =
      s.titleAlign === 'left'
        ? [left + inset, 'left']
        : s.titleAlign === 'right'
          ? [left + innerW - inset, 'right']
          : [left + innerW / 2, 'center'];
    drawText(ctx, s, L.title, x, top + L.titleH / 2, baselineShift(ctx, L.title), align, s.textColor);
    top += L.titleH;
  }

  const headers = weekdayHeaders(s.weekdayFormat, s.weekStart);
  if (L.weekdayH > 0) {
    ctx.font = cssFont(s.fontWeight, L.weekdayFont, family);
    const shift = baselineShift(ctx, headers.map((h) => h.label).join(''));
    const cy = top + L.weekdayH / 2;
    headers.forEach((h, c) => {
      drawText(ctx, s, h.label, colX(c), cy, shift, 'center', weekdayColor(s, h.weekday, false));
    });
    top += L.weekdayH;
  }

  if (s.grid !== 'none') {
    const lw = Math.max(1, Math.round(L.cellW * 0.025));
    const line = (x: number, y: number, w: number, h: number) => ctx.fillRect(Math.round(x), Math.round(y), w, h);
    ctx.fillStyle = levelCss(s.gridColor);
    line(left, top - lw / 2, Math.round(innerW), lw);
    if (s.grid === 'all') {
      const bodyH = Math.round(L.rowH * L.grid.length);
      for (let r = 1; r < L.grid.length; r++) line(left, top + r * L.rowH - lw / 2, Math.round(innerW), lw);
      for (let c = 1; c < 7; c++) line(left + c * L.cellW - lw / 2, top, lw, bodyH);
    }
  }

  ctx.font = cssFont(s.fontWeight, L.dayFont, family);
  const shift = baselineShift(ctx, '0123456789');
  L.grid.forEach((week, r) => {
    const cy = top + L.rowH * (r + 0.5);
    week.forEach((cell, c) => {
      if (!cell.inMonth && !s.showOtherMonths) return;
      const color = cell.inMonth ? weekdayColor(s, cell.weekday, s.holidays && !!cell.holiday) : s.otherMonthColor;
      drawText(ctx, s, String(cell.day), colX(c), cy, shift, 'center', color);
    });
  });
}

function weekdayColor(s: CalendarSettings, weekday: number, holiday: boolean): Level {
  if (weekday === 0 || holiday) return s.sundayColor;
  if (weekday === 6) return s.saturdayColor;
  return s.textColor;
}

function cssFont(weight: number, size: number, family: string): string {
  return `${weight} ${size.toFixed(2)}px ${family}`;
}

/**
 * 文字の実際の形の上下中央を行の中心に合わせるための、ベースラインのずらし量。
 * 同じ行の文字は sample でまとめて測り、ベースラインを揃える。
 */
function baselineShift(ctx: CanvasRenderingContext2D, sample: string): number {
  const m = ctx.measureText(sample);
  return (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  s: CalendarSettings,
  text: string,
  x: number,
  cy: number,
  shift: number,
  align: CanvasTextAlign,
  color: Level,
): void {
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const y = cy + shift;
  if (s.outline && s.outlineWidth > 0) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = s.outlineWidth * 2;
    ctx.strokeStyle = levelCss(s.outlineColor);
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = levelCss(color);
  ctx.fillText(text, x, y);
}
