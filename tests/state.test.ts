import { describe, expect, it } from 'vitest';
import { calendarBounds, layoutCalendar, type CalendarSettings } from '../src/calendar/render';
import { frameSize, type Size } from '../src/devices';
import type { QuarterTurn } from '../src/render/source';
import {
  clampCalendar,
  defaultSettings,
  inferCalendarAnchor,
  moveCalendarToFrame,
  placeCalendar,
  rearrangeCalendar,
  type VerticalAnchor,
} from '../src/state';

/** A calendar from November 2026 placed in the X3 frame. Starting on Sunday, both November and December have 5 rows */
function placed(orientation: 'portrait' | 'landscape', anchor: VerticalAnchor, width: number, rotation: QuarterTurn = 0) {
  const frame = frameSize('x3', orientation);
  const c: CalendarSettings = { ...defaultSettings('ja').calendar, year: 2026, month: 11, weekStart: 0, width, rotation };
  placeCalendar(c, frame, anchor);
  return { c, frame };
}

/** Changes the values and then calls rearrangeCalendar, just like the UI does */
function change(c: CalendarSettings, frame: Size, anchor: VerticalAnchor, next: Partial<CalendarSettings>): void {
  const before = { ...c };
  Object.assign(c, next);
  rearrangeCalendar(c, before, frame, anchor);
}

const margin = (frame: Size) => Math.round(Math.min(frame.width, frame.height) * 0.04);

describe('inferCalendarAnchor', () => {
  it('determines the placement from the top and bottom margins', () => {
    for (const anchor of ['top', 'middle', 'bottom'] as const) {
      const { c, frame } = placed('portrait', anchor, 300);
      expect(inferCalendarAnchor(c, frame)).toBe(anchor);
    }
  });
});

describe('rearrangeCalendar', () => {
  it('arranging horizontally widens it while keeping the cell width, the bottom margin and the horizontal center', () => {
    const { c, frame } = placed('landscape', 'bottom', 300);
    const before = layoutCalendar(c);
    const bottom = frame.height - c.y - before.height;
    const center = c.x + c.width / 2;

    change(c, frame, 'bottom', { months: 2, monthArrange: 'horizontal' });
    const after = layoutCalendar(c);
    expect(after.cellW).toBeCloseTo(before.cellW, 0);
    expect(frame.height - c.y - after.height).toBe(bottom);
    expect(Math.abs(c.x + c.width / 2 - center)).toBeLessThanOrEqual(1);
  });

  it('reverting restores the original width and position', () => {
    const { c, frame } = placed('landscape', 'bottom', 300);
    const original = { x: c.x, y: c.y, width: c.width };
    change(c, frame, 'bottom', { months: 2, monthArrange: 'horizontal' });
    change(c, frame, 'bottom', { months: 1 });
    expect(Math.abs(c.width - original.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(c.x - original.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(c.y - original.y)).toBeLessThanOrEqual(1);
  });

  it('shrinks until it fits with margins if it does not fit in the frame', () => {
    const { c, frame } = placed('portrait', 'bottom', 480);
    change(c, frame, 'bottom', { months: 2, monthArrange: 'horizontal' });
    expect(c.width).toBe(frame.width - margin(frame) * 2);

    change(c, frame, 'bottom', { monthArrange: 'vertical' });
    const { height } = layoutCalendar(c);
    expect(height).toBeLessThanOrEqual(frame.height - margin(frame) * 2);
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.y + height).toBeLessThanOrEqual(frame.height);
  });

  it('returns to the bottom when rearranged horizontally if it was at the bottom, even after stacking filled the frame', () => {
    const { c, frame } = placed('portrait', 'bottom', 528);
    change(c, frame, 'bottom', { months: 2, monthArrange: 'vertical' });
    // The top and bottom margins are equal, so the placement cannot be inferred from the position
    expect(inferCalendarAnchor(c, frame)).toBe('middle');

    change(c, frame, 'bottom', { monthArrange: 'horizontal' });
    expect(frame.height - c.y - layoutCalendar(c).height).toBe(margin(frame));
  });

  it('keeps the top edge if it was placed at the top', () => {
    const { c, frame } = placed('portrait', 'top', 400);
    const top = c.y;
    change(c, frame, 'top', { months: 2, monthArrange: 'vertical' });
    expect(c.y).toBe(top);
    change(c, frame, 'top', { monthArrange: 'horizontal' });
    expect(c.y).toBe(top);
  });

  it('stays centered if it was placed in the middle', () => {
    const { c, frame } = placed('portrait', 'middle', 300);
    change(c, frame, 'middle', { months: 2, monthArrange: 'vertical' });
    const { height } = layoutCalendar(c);
    expect(Math.abs(c.y - (frame.height - height) / 2)).toBeLessThanOrEqual(1);
  });
});

describe('calendar orientation', () => {
  const bounds = (c: CalendarSettings) => calendarBounds(layoutCalendar(c));

  it('rotating 90° right or left swaps the width and height of the area on the frame', () => {
    const { c } = placed('portrait', 'bottom', 300);
    const L = layoutCalendar(c);
    expect(bounds({ ...c, rotation: 1 })).toEqual({ x: c.x, y: c.y, width: L.height, height: L.width });
    expect(bounds({ ...c, rotation: 2 })).toEqual({ x: c.x, y: c.y, width: L.width, height: L.height });
    expect(bounds({ ...c, rotation: 3 })).toEqual({ x: c.x, y: c.y, width: L.height, height: L.width });
  });

  it('top / middle / bottom are determined by the calendar reading orientation', () => {
    const frame = frameSize('x3', 'portrait');
    const m = margin(frame);
    // Rotated right, the bottom of the calendar is the left of the frame; rotated left, the right; at 180°, the top
    const { c: right } = placed('portrait', 'bottom', 300, 1);
    const { c: left } = placed('portrait', 'bottom', 300, 3);
    const { c: flipped } = placed('portrait', 'bottom', 300, 2);
    expect(bounds(right).x).toBe(m);
    expect(frame.width - bounds(left).x - bounds(left).width).toBe(m);
    expect(bounds(flipped).y).toBe(m);

    // When rotated, the horizontal center becomes the vertical center of the frame
    const b = bounds(right);
    expect(Math.abs(b.y + b.height / 2 - frame.height / 2)).toBeLessThanOrEqual(1);

    const { c: top } = placed('portrait', 'top', 300, 1);
    expect(frame.width - bounds(top).x - bounds(top).width).toBe(m);
  });

  it('determines the placement in reading orientation', () => {
    for (const rotation of [0, 1, 2, 3] as const) {
      for (const anchor of ['top', 'middle', 'bottom'] as const) {
        const { c, frame } = placed('portrait', anchor, 300, rotation);
        expect(inferCalendarAnchor(c, frame)).toBe(anchor);
      }
    }
  });

  it('a rotated calendar can be widened up to the frame height without extending beyond the frame', () => {
    const frame = frameSize('x3', 'landscape');
    const c: CalendarSettings = { ...defaultSettings('ja').calendar, rotation: 1, width: 2000, x: 9999, y: 9999 };
    clampCalendar(c, frame);
    const b = bounds(c);
    expect(b.height).toBeLessThanOrEqual(frame.height);
    expect(b.width).toBeLessThanOrEqual(frame.width);
    expect(b.x + b.width).toBeLessThanOrEqual(frame.width);
    expect(b.y + b.height).toBeLessThanOrEqual(frame.height);
  });

  it('changing orientation keeps the text size, the bottom margin and the horizontal center in reading orientation', () => {
    const { c, frame } = placed('portrait', 'bottom', 300);
    const width = c.width;
    change(c, frame, 'bottom', { rotation: 1 });
    expect(c.width).toBe(width);
    const b = bounds(c);
    expect(b.x).toBe(margin(frame));
    expect(Math.abs(b.y + b.height / 2 - frame.height / 2)).toBeLessThanOrEqual(1);
    expect(inferCalendarAnchor(c, frame)).toBe('bottom');
  });

  it('rotating and rotating back restores the original width and position', () => {
    for (const anchor of ['top', 'middle', 'bottom'] as const) {
      const { c, frame } = placed('portrait', anchor, 300);
      const original = { x: c.x, y: c.y, width: c.width };
      change(c, frame, anchor, { rotation: 3 });
      change(c, frame, anchor, { rotation: 0 });
      expect(c.width).toBe(original.width);
      expect(Math.abs(c.x - original.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(c.y - original.y)).toBeLessThanOrEqual(1);
    }
  });

  it('shrinks until it fits with margins if it does not fit after rotating', () => {
    // Arrange 2 months side by side filling a landscape frame, then rotate right
    const { c, frame } = placed('landscape', 'bottom', 700);
    change(c, frame, 'bottom', { months: 2, monthArrange: 'horizontal' });
    change(c, frame, 'bottom', { rotation: 1 });
    const b = bounds(c);
    expect(c.width).toBeLessThanOrEqual(frame.height - margin(frame) * 2);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(frame.width);
    expect(b.y + b.height).toBeLessThanOrEqual(frame.height);
  });

  it('a rotated calendar still fits in the frame after changing the device orientation', () => {
    const { c } = placed('landscape', 'bottom', 700, 2);
    const from = frameSize('x3', 'landscape');
    const to = frameSize('x3', 'portrait');
    c.rotation = 0;
    clampCalendar(c, from);
    c.rotation = 1;
    clampCalendar(c, from);
    moveCalendarToFrame(c, from, to);
    const b = bounds(c);
    expect(c.width).toBeLessThanOrEqual(to.height);
    expect(b.x + b.width).toBeLessThanOrEqual(to.width);
    expect(b.y + b.height).toBeLessThanOrEqual(to.height);
  });
});

describe('column spacing', () => {
  const bounds = (c: CalendarSettings) => calendarBounds(layoutCalendar(c));

  it('widening keeps the text size while increasing the width, keeping the bottom margin and the horizontal center', () => {
    const { c, frame } = placed('portrait', 'bottom', 300);
    const before = layoutCalendar(c);
    const bottom = frame.height - c.y - before.height;
    const center = c.x + c.width / 2;

    change(c, frame, 'bottom', { columnSpacing: 120 });
    const after = layoutCalendar(c);
    expect(c.width).toBe(Math.round(32 + (300 - 32) * 1.2));
    expect(after.unit).toBeCloseTo(before.unit, 0);
    expect(after.cellW).toBeCloseTo(before.cellW * 1.2, 0);
    expect(after.height).toBe(before.height);
    expect(frame.height - c.y - after.height).toBe(bottom);
    expect(Math.abs(c.x + c.width / 2 - center)).toBeLessThanOrEqual(1);
  });

  it('recomputing from the pre-change settings like the slider does restores the original width and position at the original spacing, even after shrinking to fit', () => {
    const { c, frame } = placed('portrait', 'bottom', 454);
    const origin = { ...c };
    const slide = (spacing: number) => {
      c.columnSpacing = spacing;
      rearrangeCalendar(c, origin, frame, 'bottom');
    };
    for (let v = 99; v >= 50; v--) slide(v);
    for (let v = 51; v <= 200; v++) slide(v);
    expect(c.width).toBe(frame.width - margin(frame) * 2);
    for (let v = 199; v >= 100; v--) slide(v);
    expect({ x: c.x, y: c.y, width: c.width }).toEqual({ x: origin.x, y: origin.y, width: origin.width });
  });

  it('a rotated calendar widens horizontally in reading orientation', () => {
    const { c, frame } = placed('portrait', 'bottom', 300, 1);
    const before = bounds(c);
    const unit = layoutCalendar(c).unit;

    change(c, frame, 'bottom', { columnSpacing: 130 });
    const after = bounds(c);
    expect(layoutCalendar(c).unit).toBeCloseTo(unit, 0);
    // Rotated 90° right, the calendar's width runs along the frame's height
    expect(after.width).toBe(before.width);
    expect(after.height).toBeGreaterThan(before.height);
    expect(after.x).toBe(before.x);
    expect(Math.abs(after.y + after.height / 2 - (before.y + before.height / 2))).toBeLessThanOrEqual(1);
  });
});
