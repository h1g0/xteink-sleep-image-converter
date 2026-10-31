import { levelCss, type Level } from '../image/levels';
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
/** 並べる月の数 */
export type MonthCount = 1 | 2;
/** 2 か月以上を並べるときの向き。vertical = 縦に積む, horizontal = 横に並べる */
export type MonthArrange = 'vertical' | 'horizontal';

export interface CalendarSettings {
  enabled: boolean;
  year: number;
  /** 1〜12。2 か月以上を並べるときは最初の月 */
  month: number;
  /** year 年 month 月から何か月分を並べるか */
  months: MonthCount;
  monthArrange: MonthArrange;
  /** 月と月の間隔。1 マスの幅に対する % */
  monthGap: number;
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

/** 1 か月分の表の位置と中身 */
export interface MonthLayout {
  /** パディングの内側の左上からの位置 (px) */
  dx: number;
  dy: number;
  year: number;
  month: number;
  title: string;
  grid: DayCell[][];
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
  /** 並べる順 (縦なら上から、横なら左から) */
  months: MonthLayout[];
}

/** 年月で選んだ月から、並べる月の数だけ年月を返す */
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
  // 横に並べるときは 7 マス × 月数と月の間隔で内側の幅を分け合う。間隔もマスの幅に比例させる
  const gapRatio = Math.max(0, s.monthGap) / 100;
  const columns = horizontal ? 7 * blocks.length + gapRatio * (blocks.length - 1) : 7;
  const cellW = Math.max(1, s.width - pad * 2) / columns;
  const gap = blocks.length > 1 ? cellW * gapRatio : 0;
  const titleFont = (cellW * s.titleSize) / 100;
  const weekdayFont = (cellW * s.weekdaySize) / 100;
  const dayFont = (cellW * s.daySize) / 100;
  const titleH = blocks.some((b) => b.title) ? titleFont * 1.6 : 0;
  const weekdayH = s.weekdayFormat === 'none' ? 0 : weekdayFont * 1.9;
  const rowH = (cellW * s.rowHeight) / 100;
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
    pad,
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

/** フォントの読み込みに使う、カレンダーに描く文字の一覧 */
export function calendarText(s: CalendarSettings): string {
  const titles = calendarMonths(s).map(({ year, month }) => formatTitle(s.titleFormat, year, month));
  const labels = weekdayHeaders(s.weekdayFormat, 0).map((h) => h.label);
  return titles.join('') + labels.join('') + '0123456789';
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

  // 横に並べた見出しのベースラインが揃うよう、すべての月の見出しをまとめて測る
  ctx.font = cssFont(s.titleWeight, L.titleFont, family);
  const titleShift = baselineShift(ctx, L.months.map((m) => m.title).join(''));
  for (const m of L.months) drawMonth(ctx, s, L, m, family, titleShift);
}

/** 1 か月分の見出し・曜日・罫線・日付を描く */
function drawMonth(
  ctx: CanvasRenderingContext2D,
  s: CalendarSettings,
  L: CalendarLayout,
  m: MonthLayout,
  family: string,
  titleShift: number,
): void {
  const left = L.x + L.pad + m.dx;
  const innerW = L.cellW * 7;
  let top = L.y + L.pad + m.dy;
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
    const lw = Math.max(1, Math.round(L.cellW * 0.025));
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
