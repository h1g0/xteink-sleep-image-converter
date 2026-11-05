import { calendarBounds, layoutCalendar, type CalendarSettings } from './calendar/render';
import { DEVICES, frameSize, type DeviceId, type HoldDirection, type Orientation, type Size } from './devices';
import type { BmpBitDepth } from './encode/bmp';
import { DEFAULT_FONT_ID } from './fonts';
import type { Lang } from './i18n';
import type { DitherSettings } from './image/dither';
import type { Level } from './image/levels';
import type { ToneSettings } from './image/tone';
import type { QuarterTurn } from './render/source';

export type OutputFormat = 'bmp' | 'xtch';

export interface AppSettings {
  device: DeviceId;
  orientation: Orientation;
  hold: HoldDirection;
  format: OutputFormat;
  bmpDepth: BmpBitDepth;
  fileName: string;
  background: Level;
  tone: ToneSettings;
  dither: DitherSettings;
  calendar: CalendarSettings;
}

const STORAGE_KEY = 'xteink-sleep-converter:settings:v1';

/** 既定値。カレンダーの見出し・曜日・祝日だけは画面の言語に合わせる */
export function defaultSettings(lang: Lang): AppSettings {
  const now = new Date();
  const ja = lang === 'ja';
  const settings: AppSettings = {
    device: 'x3',
    orientation: 'portrait',
    hold: 'cw',
    format: 'bmp',
    bmpDepth: 8,
    fileName: 'sleep',
    background: 3,
    tone: { autoLevels: false, brightness: 0, contrast: 0, gamma: 1, sharpen: 0, invert: false },
    dither: { method: 'floyd-steinberg', strength: 100, serpentine: true },
    calendar: {
      enabled: true,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      months: 1,
      monthArrange: 'vertical',
      monthGap: 50,
      weekStart: 0,
      holidays: ja,
      x: 0,
      y: 0,
      width: 0,
      rotation: 0,
      fontId: DEFAULT_FONT_ID,
      fontWeight: 500,
      titleWeight: 700,
      titleFormat: ja ? 'ja-full' : 'en-full',
      titleAlign: 'center',
      weekdayFormat: ja ? 'ja' : 'en3',
      titleSize: 60,
      weekdaySize: 34,
      daySize: 44,
      rowHeight: 72,
      columnSpacing: 100,
      textColor: 0,
      sundayColor: 1,
      saturdayColor: 0,
      showOtherMonths: false,
      otherMonthColor: 2,
      grid: 'header',
      gridColor: 1,
      panel: true,
      panelColor: 3,
      panelOpacity: 100,
      panelRadius: 16,
      padding: 16,
      outline: false,
      outlineColor: 3,
      outlineWidth: 3,
      crisp: false,
    },
  };
  const frame = frameSize(settings.device, settings.orientation);
  settings.calendar.width = Math.round(frame.width * 0.86);
  placeCalendar(settings.calendar, frame, 'bottom');
  return settings;
}

/**
 * 保存しておいた設定を読み込む。年月は保存せず、いつ開いても今月になる。
 * 項目が増えたときのために、既定値に上書きする形で読み込む。
 */
export function loadSettings(lang: Lang): AppSettings {
  const defaults = defaultSettings(lang);
  let saved: Partial<AppSettings> | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw) as Partial<AppSettings>;
  } catch {
    saved = null;
  }
  if (!saved || typeof saved !== 'object') return defaults;
  const s: AppSettings = {
    ...defaults,
    ...saved,
    tone: { ...defaults.tone, ...saved.tone },
    dither: { ...defaults.dither, ...saved.dither },
    calendar: { ...defaults.calendar, ...saved.calendar },
  };
  if (!(s.device in DEVICES)) s.device = defaults.device;
  if (![0, 1, 2, 3].includes(s.calendar.rotation)) s.calendar.rotation = defaults.calendar.rotation;
  s.calendar.year = defaults.calendar.year;
  s.calendar.month = defaults.calendar.month;
  return s;
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // プライベートブラウズなどで保存できなくても動作には影響しない
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 同上
  }
}

export type VerticalAnchor = 'top' | 'middle' | 'bottom';

/** カレンダーを上下の端に寄せて置くときの、フレームの端からの余白 */
function frameMargin(frame: Size): number {
  return Math.round(Math.min(frame.width, frame.height) * 0.04);
}

/*
 * カレンダーを回したときは、置き方 (上・中央・下、左右の中心、大きさの上限) を
 * カレンダーを読む向きに回したフレーム (以下「読む向きのフレーム」) で考える。
 * 右に 90° 回したカレンダーなら、カレンダーの上はフレームの右、下はフレームの左になる。
 * 設定に持つ x, y はフレーム上 (プレビューで見たまま) の外接矩形の左上。
 */

/** 読む向きのフレームの大きさ。右か左に 90° 回したときは幅と高さが入れ替わる */
export function calendarView(frame: Size, rotation: QuarterTurn): Size {
  return rotation % 2 === 0 ? frame : { width: frame.height, height: frame.width };
}

/** 読む向きのフレームでの、カレンダーの左上の位置 */
function viewPosition(c: CalendarSettings, frame: Size): { x: number; y: number } {
  const { width: w, height: h } = layoutCalendar(c);
  switch (c.rotation) {
    case 1:
      return { x: c.y, y: frame.width - c.x - h };
    case 2:
      return { x: frame.width - c.x - w, y: frame.height - c.y - h };
    case 3:
      return { x: frame.height - c.y - w, y: c.x };
    default:
      return { x: c.x, y: c.y };
  }
}

/** 読む向きのフレームでの左上の位置から、フレーム上の位置を決める (viewPosition の逆) */
function setViewPosition(c: CalendarSettings, frame: Size, x: number, y: number): void {
  const { width: w, height: h } = layoutCalendar(c);
  switch (c.rotation) {
    case 1:
      c.x = frame.width - y - h;
      c.y = x;
      break;
    case 2:
      c.x = frame.width - x - w;
      c.y = frame.height - y - h;
      break;
    case 3:
      c.x = y;
      c.y = frame.height - x - w;
      break;
    default:
      c.x = x;
      c.y = y;
  }
}

/** カレンダーを (読む向きで) 左右中央・指定した高さに置く */
export function placeCalendar(c: CalendarSettings, frame: Size, anchor: VerticalAnchor): void {
  const margin = frameMargin(frame);
  const view = calendarView(frame, c.rotation);
  const { width, height } = layoutCalendar(c);
  const y =
    anchor === 'top' ? margin : anchor === 'middle' ? Math.round((view.height - height) / 2) : view.height - height - margin;
  setViewPosition(c, frame, Math.round((view.width - width) / 2), y);
  clampCalendar(c, frame);
}

/** カレンダーがフレームからはみ出さないよう、大きさと位置を調整する */
export function clampCalendar(c: CalendarSettings, frame: Size): void {
  const view = calendarView(frame, c.rotation);
  c.width = Math.max(120, Math.min(Math.round(c.width), view.width));
  const { height } = layoutCalendar(c);
  if (height > view.height) {
    c.width = Math.max(120, Math.floor((c.width * view.height) / height));
  }
  const box = calendarBounds(layoutCalendar(c));
  c.x = Math.round(Math.min(Math.max(c.x, 0), Math.max(0, frame.width - box.width)));
  c.y = Math.round(Math.min(Math.max(c.y, 0), Math.max(0, frame.height - box.height)));
}

/** フレームの大きさが変わったとき、カレンダーの中心の相対位置を保って移す */
export function moveCalendarToFrame(c: CalendarSettings, from: Size, to: Size): void {
  const box = calendarBounds(layoutCalendar(c));
  const cx = (box.x + box.width / 2) / from.width;
  const cy = (box.y + box.height / 2) / from.height;
  c.width = Math.min(c.width, calendarView(to, c.rotation).width);
  const next = calendarBounds(layoutCalendar(c));
  c.x = cx * to.width - next.width / 2;
  c.y = cy * to.height - next.height / 2;
  clampCalendar(c, to);
}

/**
 * カレンダーを (読む向きで) 上・中央・下のどこに寄せて置いているかを、上下の余白から判断する。
 * 余白の差が丸めの誤差程度なら中央とみなす。
 */
export function inferCalendarAnchor(c: CalendarSettings, frame: Size): VerticalAnchor {
  const view = calendarView(frame, c.rotation);
  const { height } = layoutCalendar(c);
  const top = viewPosition(c, frame).y;
  const bottom = view.height - top - height;
  if (Math.abs(top - bottom) <= 2) return 'middle';
  return top < bottom ? 'top' : 'bottom';
}

/**
 * 並べる月の数や並べ方、カレンダーの向き、列の間隔を変えたとき、文字の大きさ (基準の長さ) が変わらないように
 * 幅を決め直す。フレームに余白を残して収まらなければ縮める。before は変える前の設定。
 * 幅と位置は before だけから決まるので、同じ before から何度呼んでも丸めの誤差はたまらない。
 *
 * 位置は読む向きのフレームで考え、anchor が top なら上の余白、bottom なら下の余白、
 * middle なら上下の中心の相対位置を保つ。左右は中心の相対位置を保つ。
 */
export function rearrangeCalendar(
  c: CalendarSettings,
  before: CalendarSettings,
  frame: Size,
  anchor: VerticalAnchor,
): void {
  const margin = frameMargin(frame);
  const prev = layoutCalendar(before);
  const prevView = calendarView(frame, before.rotation);
  const prevPos = viewPosition(before, frame);
  const view = calendarView(frame, c.rotation);
  // 上限はフレームから余白を除いた大きさ。もともと余白にかかるほど大きくしてあった分は、フレームに収まる限り狭めない
  const limit = (current: number, size: number) =>
    current <= size ? Math.max(current, size - margin * 2) : size - margin * 2;
  const pad2 = c.padding * 2;
  const inner = Math.max(1, c.width - pad2);
  // 内側の幅は基準の長さに比例するので、比で求める
  const maxWidth = limit(before.width, view.width);
  c.width = Math.round(Math.min(pad2 + (inner * prev.unit) / layoutCalendar(c).unit, maxWidth));

  // 高さもパディングを除けば幅に比例するので、収まらなければ同じ比で縮める
  const maxHeight = limit(prev.height, view.height);
  const { height } = layoutCalendar(c);
  if (height > maxHeight && height > pad2) {
    c.width = Math.floor(pad2 + (Math.max(1, c.width - pad2) * (maxHeight - pad2)) / (height - pad2));
  }

  const next = layoutCalendar(c);
  // 向きを変えないときは比が 1 になり、もとの中心をそのまま保つ
  const x = (prevPos.x + prev.width / 2) * (view.width / prevView.width) - next.width / 2;
  const y =
    anchor === 'top'
      ? prevPos.y
      : anchor === 'bottom'
        ? view.height - (prevView.height - prevPos.y - prev.height) - next.height
        : (prevPos.y + prev.height / 2) * (view.height / prevView.height) - next.height / 2;
  setViewPosition(c, frame, x, y);
  clampCalendar(c, frame);
}
