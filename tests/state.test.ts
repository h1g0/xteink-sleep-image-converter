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

/** X3 のフレームに置いた 2026 年 11 月からのカレンダー。日曜始まりで 11 月・12 月とも 5 行 */
function placed(orientation: 'portrait' | 'landscape', anchor: VerticalAnchor, width: number, rotation: QuarterTurn = 0) {
  const frame = frameSize('x3', orientation);
  const c: CalendarSettings = { ...defaultSettings('ja').calendar, year: 2026, month: 11, weekStart: 0, width, rotation };
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

describe('カレンダーの向き', () => {
  const bounds = (c: CalendarSettings) => calendarBounds(layoutCalendar(c));

  it('右か左に 90° 回すと、フレーム上の範囲の幅と高さが入れ替わる', () => {
    const { c } = placed('portrait', 'bottom', 300);
    const L = layoutCalendar(c);
    expect(bounds({ ...c, rotation: 1 })).toEqual({ x: c.x, y: c.y, width: L.height, height: L.width });
    expect(bounds({ ...c, rotation: 2 })).toEqual({ x: c.x, y: c.y, width: L.width, height: L.height });
    expect(bounds({ ...c, rotation: 3 })).toEqual({ x: c.x, y: c.y, width: L.height, height: L.width });
  });

  it('上・中央・下はカレンダーを読む向きで決まる', () => {
    const frame = frameSize('x3', 'portrait');
    const m = margin(frame);
    // 右に回すとカレンダーの下はフレームの左、左に回すとフレームの右、180° ならフレームの上
    const { c: right } = placed('portrait', 'bottom', 300, 1);
    const { c: left } = placed('portrait', 'bottom', 300, 3);
    const { c: flipped } = placed('portrait', 'bottom', 300, 2);
    expect(bounds(right).x).toBe(m);
    expect(frame.width - bounds(left).x - bounds(left).width).toBe(m);
    expect(bounds(flipped).y).toBe(m);

    // 左右の中央は、回したときはフレームの上下の中央になる
    const b = bounds(right);
    expect(Math.abs(b.y + b.height / 2 - frame.height / 2)).toBeLessThanOrEqual(1);

    const { c: top } = placed('portrait', 'top', 300, 1);
    expect(frame.width - bounds(top).x - bounds(top).width).toBe(m);
  });

  it('置いた場所を読む向きで判断する', () => {
    for (const rotation of [0, 1, 2, 3] as const) {
      for (const anchor of ['top', 'middle', 'bottom'] as const) {
        const { c, frame } = placed('portrait', anchor, 300, rotation);
        expect(inferCalendarAnchor(c, frame)).toBe(anchor);
      }
    }
  });

  it('回したカレンダーの幅はフレームの高さまで広げられ、フレームからははみ出さない', () => {
    const frame = frameSize('x3', 'landscape');
    const c: CalendarSettings = { ...defaultSettings('ja').calendar, rotation: 1, width: 2000, x: 9999, y: 9999 };
    clampCalendar(c, frame);
    const b = bounds(c);
    expect(b.height).toBeLessThanOrEqual(frame.height);
    expect(b.width).toBeLessThanOrEqual(frame.width);
    expect(b.x + b.width).toBeLessThanOrEqual(frame.width);
    expect(b.y + b.height).toBeLessThanOrEqual(frame.height);
  });

  it('向きを変えると文字の大きさを保ち、読む向きでの下の余白と左右の中心を保つ', () => {
    const { c, frame } = placed('portrait', 'bottom', 300);
    const width = c.width;
    change(c, frame, 'bottom', { rotation: 1 });
    expect(c.width).toBe(width);
    const b = bounds(c);
    expect(b.x).toBe(margin(frame));
    expect(Math.abs(b.y + b.height / 2 - frame.height / 2)).toBeLessThanOrEqual(1);
    expect(inferCalendarAnchor(c, frame)).toBe('bottom');
  });

  it('回して戻すと元の幅と位置に戻る', () => {
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

  it('回して収まらなければ、余白を残して収まるまで縮める', () => {
    // 横向きのフレームいっぱいに 2 か月を横に並べてから右に回す
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

  it('端末の向きを変えても、回したカレンダーはフレームに収まる', () => {
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

describe('列の間隔', () => {
  const bounds = (c: CalendarSettings) => calendarBounds(layoutCalendar(c));

  it('広げると文字の大きさを保ったまま幅を広げ、下の余白と左右の中心を保つ', () => {
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

  it('スライダーのように変える前の設定から計算し直すと、収まらず縮めても元の間隔で元の幅と位置に戻る', () => {
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

  it('回したカレンダーでは、読む向きで左右に広がる', () => {
    const { c, frame } = placed('portrait', 'bottom', 300, 1);
    const before = bounds(c);
    const unit = layoutCalendar(c).unit;

    change(c, frame, 'bottom', { columnSpacing: 130 });
    const after = bounds(c);
    expect(layoutCalendar(c).unit).toBeCloseTo(unit, 0);
    // 右に 90° 回すとカレンダーの幅はフレームの縦になる
    expect(after.width).toBe(before.width);
    expect(after.height).toBeGreaterThan(before.height);
    expect(after.x).toBe(before.x);
    expect(Math.abs(after.y + after.height / 2 - (before.y + before.height / 2))).toBeLessThanOrEqual(1);
  });
});
