import { levelCss, type Level } from '../image/levels';
import type { QuarterTurn } from '../render/source';
import {
  buildMonthGrid,
  consecutiveMonths,
  formatTitle,
  weekdayHeaders,
  type DayCell,
  type TitleFormat,
  type WeekdayFormat,
  type WeekStart,
} from './model';

export type GridStyle = 'none' | 'header' | 'all';
export type TitleAlign = 'left' | 'center' | 'right';
/** Number of months to show */
export type MonthCount = 1 | 2;
/** Arrangement when showing 2 or more months. vertical = stacked, horizontal = side by side */
export type MonthArrange = 'vertical' | 'horizontal';

export interface CalendarSettings {
  enabled: boolean;
  year: number;
  /** 1–12. The first month when showing 2 or more months */
  month: number;
  /** How many months to show, starting from year/month */
  months: MonthCount;
  monthArrange: MonthArrange;
  /** Spacing between months, as a % of the base unit (see titleSize etc.) */
  monthGap: number;
  weekStart: WeekStart;
  holidays: boolean;
  /** Top-left position in the frame (top-left of the bounding box when rotated) and the calendar's own unrotated width (px) */
  x: number;
  y: number;
  width: number;
  /** Calendar orientation, clockwise in 90° steps: 1 = 90° right, 3 = 90° left */
  rotation: QuarterTurn;
  fontId: string;
  fontWeight: number;
  titleWeight: number;
  titleFormat: TitleFormat;
  titleAlign: TitleAlign;
  weekdayFormat: WeekdayFormat;
  /**
   * Text sizes and row height, as a % of the cell width at 100% column spacing (the base unit).
   * Changing the column spacing does not change the text size
   */
  titleSize: number;
  weekdaySize: number;
  daySize: number;
  rowHeight: number;
  /** Spacing of columns (weekdays), as a % of the base unit */
  columnSpacing: number;
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
  /** Draw text crisply in two tones without anti-aliasing */
  crisp: boolean;
}

/** Position and contents of one month's table */
export interface MonthLayout {
  /** Position relative to the top-left inside the padding (px) */
  dx: number;
  dy: number;
  year: number;
  month: number;
  title: string;
  grid: DayCell[][];
}

export interface CalendarLayout {
  /** Top-left of the bounding box on the frame */
  x: number;
  y: number;
  /** The calendar's own size before rotation */
  width: number;
  height: number;
  rotation: QuarterTurn;
  pad: number;
  /** Base unit for text sizes, row height and month spacing */
  unit: number;
  /** Width of one column */
  cellW: number;
  titleH: number;
  weekdayH: number;
  rowH: number;
  titleFont: number;
  weekdayFont: number;
  dayFont: number;
  /** In display order (top to bottom when vertical, left to right when horizontal) */
  months: MonthLayout[];
}

/** Returns the year/month pairs for the configured number of months, starting from the selected month */
function calendarMonths(s: CalendarSettings): { year: number; month: number }[] {
  return consecutiveMonths(s.year, s.month, s.months === 2 ? 2 : 1);
}

export function layoutCalendar(s: CalendarSettings): CalendarLayout {
  const blocks = calendarMonths(s).map(({ year, month }) => ({
    year,
    month,
    title: formatTitle(s.titleFormat, year, month),
    grid: buildMonthGrid(year, month, s.weekStart),
  }));
  const horizontal = blocks.length > 1 && s.monthArrange === 'horizontal';
  const pad = s.padding;
  // How many base units the inner width is divided into. Each column takes the column spacing and each month gap takes the month spacing;
  // when arranged horizontally, it is shared among 7 columns × the number of months plus the month gaps
  const spacing = Math.max(1, s.columnSpacing) / 100;
  const gapRatio = Math.max(0, s.monthGap) / 100;
  const units = horizontal ? 7 * spacing * blocks.length + gapRatio * (blocks.length - 1) : 7 * spacing;
  const unit = Math.max(1, s.width - pad * 2) / units;
  const cellW = unit * spacing;
  const gap = blocks.length > 1 ? unit * gapRatio : 0;
  const titleFont = (unit * s.titleSize) / 100;
  const weekdayFont = (unit * s.weekdaySize) / 100;
  const dayFont = (unit * s.daySize) / 100;
  const titleH = blocks.some((b) => b.title) ? titleFont * 1.6 : 0;
  const weekdayH = s.weekdayFormat === 'none' ? 0 : weekdayFont * 1.9;
  const rowH = (unit * s.rowHeight) / 100;
  const blockH = (b: { grid: DayCell[][] }) => titleH + weekdayH + rowH * b.grid.length;

  const months: MonthLayout[] = [];
  let offset = 0;
  for (const b of blocks) {
    months.push(horizontal ? { ...b, dx: offset, dy: 0 } : { ...b, dx: 0, dy: offset });
    offset += (horizontal ? cellW * 7 : blockH(b)) + gap;
  }
  const contentH = horizontal ? Math.max(...blocks.map(blockH)) : offset - gap;
  const height = Math.ceil(pad * 2 + contentH);
  return {
    x: s.x,
    y: s.y,
    width: s.width,
    height,
    rotation: s.rotation,
    pad,
    unit,
    cellW,
    titleH,
    weekdayH,
    rowH,
    titleFont,
    weekdayFont,
    dayFont,
    months,
  };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Area the calendar occupies on the frame. Width and height are swapped when rotated 90° right or left */
export function calendarBounds(L: CalendarLayout): Rect {
  const turned = L.rotation % 2 === 1;
  return {
    x: L.x,
    y: L.y,
    width: turned ? L.height : L.width,
    height: turned ? L.width : L.height,
  };
}

/** The characters drawn on the calendar, used for loading fonts */
export function calendarText(s: CalendarSettings): string {
  const titles = calendarMonths(s).map(({ year, month }) => formatTitle(s.titleFormat, year, month));
  const labels = weekdayHeaders(s.weekdayFormat, 0).map((h) => h.label);
  return titles.join('') + labels.join('') + '0123456789';
}

/**
 * - panel: background panel only
 * - content: text and grid lines only
 * - all: both
 */
export type CalendarPart = 'panel' | 'content' | 'all';

export function drawCalendar(
  ctx: CanvasRenderingContext2D,
  s: CalendarSettings,
  L: CalendarLayout,
  family: string,
  part: CalendarPart,
): void {
  ctx.save();
  placeOnFrame(ctx, L);
  if (part !== 'content' && s.panel) {
    ctx.fillStyle = levelCss(s.panelColor);
    ctx.beginPath();
    ctx.roundRect(0, 0, L.width, L.height, Math.min(s.panelRadius, L.width / 2, L.height / 2));
    ctx.fill();
  }
  if (part !== 'panel') {
    // Measure all month headings together so that headings arranged side by side share a baseline
    ctx.font = cssFont(s.titleWeight, L.titleFont, family);
    const titleShift = baselineShift(ctx, L.months.map((m) => m.title).join(''));
    for (const m of L.months) drawMonth(ctx, s, L, m, family, titleShift);
  }
  ctx.restore();
}

/**
 * Transforms the coordinate system to the calendar's position and orientation on the frame, so drawing can use coordinates with the calendar's own top-left as the origin.
 * Positions and sizes are integers, so grid lines stay aligned to pixel boundaries even when rotated.
 */
function placeOnFrame(ctx: CanvasRenderingContext2D, L: CalendarLayout): void {
  switch (L.rotation) {
    case 1:
      ctx.translate(L.x + L.height, L.y);
      break;
    case 2:
      ctx.translate(L.x + L.width, L.y + L.height);
      break;
    case 3:
      ctx.translate(L.x, L.y + L.width);
      break;
    default:
      ctx.translate(L.x, L.y);
  }
  ctx.rotate((L.rotation * Math.PI) / 2);
}

/** Draws one month's heading, weekday labels, grid lines and dates */
function drawMonth(
  ctx: CanvasRenderingContext2D,
  s: CalendarSettings,
  L: CalendarLayout,
  m: MonthLayout,
  family: string,
  titleShift: number,
): void {
  const left = L.pad + m.dx;
  const innerW = L.cellW * 7;
  let top = L.pad + m.dy;
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
    drawText(ctx, s, m.title, x, top + L.titleH / 2, titleShift, align, s.textColor);
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
    const lw = Math.max(1, Math.round(L.unit * 0.025));
    const line = (x: number, y: number, w: number, h: number) => ctx.fillRect(Math.round(x), Math.round(y), w, h);
    ctx.fillStyle = levelCss(s.gridColor);
    line(left, top - lw / 2, Math.round(innerW), lw);
    if (s.grid === 'all') {
      const bodyH = Math.round(L.rowH * m.grid.length);
      for (let r = 1; r < m.grid.length; r++) line(left, top + r * L.rowH - lw / 2, Math.round(innerW), lw);
      for (let c = 1; c < 7; c++) line(left + c * L.cellW - lw / 2, top, lw, bodyH);
    }
  }

  ctx.font = cssFont(s.fontWeight, L.dayFont, family);
  const shift = baselineShift(ctx, '0123456789');
  m.grid.forEach((week, r) => {
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
 * Baseline offset that aligns the vertical center of the glyphs' actual shapes with the center of the row.
 * Text in the same row is measured together via sample so the baselines line up.
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
