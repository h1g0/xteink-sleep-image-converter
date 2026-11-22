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

/** Defaults. Only the calendar heading, weekday labels and holidays follow the UI language */
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
 * Loads the saved settings. The year and month are not saved, so the current month is shown whenever the app opens.
 * Settings are merged over the defaults so that newly added fields get default values.
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
    // Failing to save (e.g. in private browsing) does not affect functionality
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Same as above
  }
}

export type VerticalAnchor = 'top' | 'middle' | 'bottom';

/** Margin from the frame edge when the calendar is placed against the top or bottom edge */
function frameMargin(frame: Size): number {
  return Math.round(Math.min(frame.width, frame.height) * 0.04);
}

/*
 * When the calendar is rotated, its placement (top / middle / bottom, horizontal center, maximum size)
 * is considered in the frame rotated to the calendar's reading orientation (the "reading frame" below).
 * For a calendar rotated 90° to the right, the top of the calendar is the right of the frame and the bottom is the left.
 * The x, y kept in the settings are the top-left of the bounding box on the frame (as seen in the preview).
 */

/** Size of the reading frame. Width and height are swapped when rotated 90° right or left */
export function calendarView(frame: Size, rotation: QuarterTurn): Size {
  return rotation % 2 === 0 ? frame : { width: frame.height, height: frame.width };
}

/** Top-left position of the calendar in the reading frame */
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

/** Converts a top-left position in the reading frame into a position on the frame (inverse of viewPosition) */
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

/** Places the calendar horizontally centered at the given height (in reading orientation) */
export function placeCalendar(c: CalendarSettings, frame: Size, anchor: VerticalAnchor): void {
  const margin = frameMargin(frame);
  const view = calendarView(frame, c.rotation);
  const { width, height } = layoutCalendar(c);
  const y =
    anchor === 'top' ? margin : anchor === 'middle' ? Math.round((view.height - height) / 2) : view.height - height - margin;
  setViewPosition(c, frame, Math.round((view.width - width) / 2), y);
  clampCalendar(c, frame);
}

/** Adjusts the calendar size and position so it does not extend beyond the frame */
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

/** When the frame size changes, moves the calendar while keeping its center's relative position */
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
 * Determines from the top and bottom margins whether the calendar is placed at the top, middle or bottom (in reading orientation).
 * If the margins differ only by about a rounding error, it is treated as middle.
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
 * When the number of months, their arrangement, the calendar orientation or the column spacing changes, recomputes
 * the width so the text size (the base unit) stays the same. Shrinks it if it does not fit in the frame with margins. before is the settings prior to the change.
 * Width and position depend only on before, so calling this repeatedly from the same before does not accumulate rounding errors.
 *
 * Position is considered in the reading frame: with anchor top the top margin is kept, with bottom the bottom margin,
 * and with middle the relative vertical center. Horizontally, the relative center is kept.
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
  // The limit is the frame size minus margins. If it was already large enough to overlap the margins, do not shrink it as long as it fits in the frame
  const limit = (current: number, size: number) =>
    current <= size ? Math.max(current, size - margin * 2) : size - margin * 2;
  const pad2 = c.padding * 2;
  const inner = Math.max(1, c.width - pad2);
  // The inner width is proportional to the base unit, so compute it by ratio
  const maxWidth = limit(before.width, view.width);
  c.width = Math.round(Math.min(pad2 + (inner * prev.unit) / layoutCalendar(c).unit, maxWidth));

  // Excluding padding, the height is also proportional to the width, so shrink by the same ratio if it does not fit
  const maxHeight = limit(prev.height, view.height);
  const { height } = layoutCalendar(c);
  if (height > maxHeight && height > pad2) {
    c.width = Math.floor(pad2 + (Math.max(1, c.width - pad2) * (maxHeight - pad2)) / (height - pad2));
  }

  const next = layoutCalendar(c);
  // When the orientation does not change, the ratio is 1 and the original center is kept as-is
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
