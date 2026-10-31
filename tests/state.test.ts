import { describe, expect, it } from 'vitest';
import { layoutCalendar, type CalendarSettings } from '../src/calendar/render';
import { frameSize, type Size } from '../src/devices';
import {
  defaultSettings,
  inferCalendarAnchor,
  placeCalendar,
  rearrangeCalendar,
  type VerticalAnchor,
} from '../src/state';

/** X3 のフレームに置いた 2026 年 11 月からのカレンダー。日曜始まりで 11 月・12 月とも 5 行 */
function placed(orientation: 'portrait' | 'landscape', anchor: VerticalAnchor, width: number) {
  const frame = frameSize('x3', orientation);
  const c: CalendarSettings = { ...defaultSettings('ja').calendar, year: 2026, month: 11, weekStart: 0, width };
  placeCalendar(c, frame, anchor);
  return { c, frame };
}

/** 画面で操作したときと同じく、値を変えてから rearrangeCalendar を呼ぶ */
function change(c: CalendarSettings, frame: Size, anchor: VerticalAnchor, next: Partial<CalendarSettings>): void {
  const before = { ...c };
  Object.assign(c, next);
  rearrangeCalendar(c, before, frame, anchor);
}

const margin = (frame: Size) => Math.round(Math.min(frame.width, frame.height) * 0.04);

describe('inferCalendarAnchor', () => {
  it('置いた場所を上下の余白から判断する', () => {
    for (const anchor of ['top', 'middle', 'bottom'] as const) {
      const { c, frame } = placed('portrait', anchor, 300);
      expect(inferCalendarAnchor(c, frame)).toBe(anchor);
    }
  });
});

describe('rearrangeCalendar', () => {
  it('横に並べると 1 マスの幅を保ったまま広げ、下の余白と左右の中心を保つ', () => {
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

  it('戻すと元の幅と位置に戻る', () => {
    const { c, frame } = placed('landscape', 'bottom', 300);
    const original = { x: c.x, y: c.y, width: c.width };
    change(c, frame, 'bottom', { months: 2, monthArrange: 'horizontal' });
    change(c, frame, 'bottom', { months: 1 });
    expect(Math.abs(c.width - original.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(c.x - original.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(c.y - original.y)).toBeLessThanOrEqual(1);
  });

  it('フレームに収まらなければ、余白を残して収まるまで縮める', () => {
    const { c, frame } = placed('portrait', 'bottom', 480);
    change(c, frame, 'bottom', { months: 2, monthArrange: 'horizontal' });
    expect(c.width).toBe(frame.width - margin(frame) * 2);

    change(c, frame, 'bottom', { monthArrange: 'vertical' });
    const { height } = layoutCalendar(c);
    expect(height).toBeLessThanOrEqual(frame.height - margin(frame) * 2);
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.y + height).toBeLessThanOrEqual(frame.height);
  });

  it('縦に積んでフレームいっぱいになっても、下に置いていたなら横に並べ直すと下に戻る', () => {
    const { c, frame } = placed('portrait', 'bottom', 528);
    change(c, frame, 'bottom', { months: 2, monthArrange: 'vertical' });
    // 上下の余白が同じになり、位置からはどこに置いていたか分からない
    expect(inferCalendarAnchor(c, frame)).toBe('middle');

    change(c, frame, 'bottom', { monthArrange: 'horizontal' });
    expect(frame.height - c.y - layoutCalendar(c).height).toBe(margin(frame));
  });

  it('上に置いていたら上端を保つ', () => {
    const { c, frame } = placed('portrait', 'top', 400);
    const top = c.y;
    change(c, frame, 'top', { months: 2, monthArrange: 'vertical' });
    expect(c.y).toBe(top);
    change(c, frame, 'top', { monthArrange: 'horizontal' });
    expect(c.y).toBe(top);
  });

  it('中央に置いていたら中央のまま', () => {
    const { c, frame } = placed('portrait', 'middle', 300);
    change(c, frame, 'middle', { months: 2, monthArrange: 'vertical' });
    const { height } = layoutCalendar(c);
    expect(Math.abs(c.y - (frame.height - height) / 2)).toBeLessThanOrEqual(1);
  });
});
