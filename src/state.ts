import { layoutCalendar, type CalendarSettings } from './calendar/render';
import { DEVICES, frameSize, type DeviceId, type HoldDirection, type Orientation, type Size } from './devices';
import type { BmpBitDepth } from './encode/bmp';
import { DEFAULT_FONT_ID } from './fonts';
import type { DitherSettings } from './image/dither';
import type { Level } from './image/levels';
import type { ToneSettings } from './image/tone';

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

export function defaultSettings(): AppSettings {
  const now = new Date();
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
      weekStart: 0,
      holidays: true,
      x: 0,
      y: 0,
      width: 0,
      fontId: DEFAULT_FONT_ID,
      fontWeight: 500,
      titleWeight: 700,
      titleFormat: 'ja-full',
      titleAlign: 'center',
      weekdayFormat: 'ja',
      titleSize: 60,
      weekdaySize: 34,
      daySize: 44,
      rowHeight: 72,
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
export function loadSettings(): AppSettings {
  const defaults = defaultSettings();
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

/** カレンダーを左右中央・指定した高さに置く */
export function placeCalendar(c: CalendarSettings, frame: Size, anchor: VerticalAnchor): void {
  const margin = Math.round(Math.min(frame.width, frame.height) * 0.04);
  const { height } = layoutCalendar(c);
  c.x = Math.round((frame.width - c.width) / 2);
  c.y = anchor === 'top' ? margin : anchor === 'middle' ? Math.round((frame.height - height) / 2) : frame.height - height - margin;
  clampCalendar(c, frame);
}

/** カレンダーがフレームからはみ出さないよう、大きさと位置を調整する */
export function clampCalendar(c: CalendarSettings, frame: Size): void {
  c.width = Math.max(120, Math.min(Math.round(c.width), frame.width));
  let { height } = layoutCalendar(c);
  if (height > frame.height) {
    c.width = Math.max(120, Math.floor((c.width * frame.height) / height));
    height = layoutCalendar(c).height;
  }
  c.x = Math.round(Math.min(Math.max(c.x, 0), Math.max(0, frame.width - c.width)));
  c.y = Math.round(Math.min(Math.max(c.y, 0), Math.max(0, frame.height - height)));
}

/** フレームの大きさが変わったとき、カレンダーの中心の相対位置を保って移す */
export function moveCalendarToFrame(c: CalendarSettings, from: Size, to: Size): void {
  const { width, height } = layoutCalendar(c);
  const cx = (c.x + width / 2) / from.width;
  const cy = (c.y + height / 2) / from.height;
  c.width = Math.min(c.width, to.width);
  const next = layoutCalendar(c);
  c.x = cx * to.width - next.width / 2;
  c.y = cy * to.height - next.height / 2;
  clampCalendar(c, to);
}
