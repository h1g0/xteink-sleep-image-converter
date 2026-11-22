import { describe, expect, it } from 'vitest';
import { holidayKey, japaneseHolidays } from '../src/calendar/holidays';
import { buildMonthGrid, consecutiveMonths, formatTitle, weekdayHeaders } from '../src/calendar/model';
import {
  calendarBounds,
  calendarText,
  drawCalendar,
  layoutCalendar,
  type CalendarSettings,
} from '../src/calendar/render';
import { defaultSettings } from '../src/state';

describe('japaneseHolidays', () => {
  it('2026 (matches the Cabinet Office announcement)', () => {
    const list = [...japaneseHolidays(2026).entries()]
      .map(([k, name]) => {
        const [m, d] = k.split('-').map(Number);
        return { m, d, name };
      })
      .sort((a, b) => a.m - b.m || a.d - b.d)
      .map(({ m, d, name }) => `${m}/${d} ${name}`);
    expect(list).toEqual([
      '1/1 元日',
      '1/12 成人の日',
      '2/11 建国記念の日',
      '2/23 天皇誕生日',
      '3/20 春分の日',
      '4/29 昭和の日',
      '5/3 憲法記念日',
      '5/4 みどりの日',
      '5/5 こどもの日',
      '5/6 振替休日',
      '7/20 海の日',
      '8/11 山の日',
      '9/21 敬老の日',
      '9/22 国民の休日',
      '9/23 秋分の日',
      '10/12 スポーツの日',
      '11/3 文化の日',
      '11/23 勤労感謝の日',
    ]);
  });

  it('2025 substitute holidays', () => {
    const h = japaneseHolidays(2025);
    expect(h.get(holidayKey(2, 24))).toBe('振替休日');
    expect(h.get(holidayKey(5, 6))).toBe('振替休日');
    expect(h.get(holidayKey(8, 11))).toBe('山の日');
    expect(h.get(holidayKey(11, 24))).toBe('振替休日');
    expect(h.get(holidayKey(3, 20))).toBe('春分の日');
    expect(h.get(holidayKey(9, 23))).toBe('秋分の日');
  });

  it('2019 enthronement-related holidays', () => {
    const h = japaneseHolidays(2019);
    expect(h.get(holidayKey(4, 30))).toBe('国民の休日');
    expect(h.get(holidayKey(5, 1))).toBe('天皇の即位の日');
    expect(h.get(holidayKey(5, 2))).toBe('国民の休日');
    expect(h.get(holidayKey(10, 22))).toBe('即位礼正殿の儀');
  });
});

describe('buildMonthGrid', () => {
  it('November 2026 (the 1st is a Sunday)', () => {
    const sun = buildMonthGrid(2026, 11, 0);
    expect(sun.length).toBe(5);
    expect(sun[0][0]).toMatchObject({ month: 11, day: 1, weekday: 0, inMonth: true });
    expect(sun[4][1]).toMatchObject({ month: 11, day: 30, inMonth: true });
    expect(sun[0][2].holiday).toBe('文化の日');

    const mon = buildMonthGrid(2026, 11, 1);
    expect(mon.length).toBe(6);
    expect(mon[0][0]).toMatchObject({ month: 10, day: 26, weekday: 1, inMonth: false });
    expect(mon[0][6]).toMatchObject({ month: 11, day: 1, weekday: 0, inMonth: true });
  });

  it('February 2027 fits in 4 rows with weeks starting on Sunday', () => {
    // 2027-02-01 is a Monday
    expect(buildMonthGrid(2027, 2, 1).length).toBe(4);
    expect(buildMonthGrid(2027, 2, 0).length).toBe(5);
  });

  it('holidays are filled in for adjacent months across a year boundary', () => {
    const grid = buildMonthGrid(2026, 12, 0);
    const last = grid[grid.length - 1];
    const jan1 = last.find((c) => c.month === 1 && c.day === 1);
    expect(jan1).toMatchObject({ year: 2027, inMonth: false, holiday: '元日' });
  });
});

describe('labels', () => {
  it('orders weekdays according to the start of the week', () => {
    expect(weekdayHeaders('ja', 0).map((h) => h.label).join('')).toBe('日月火水木金土');
    expect(weekdayHeaders('ja', 1).map((h) => h.label).join('')).toBe('月火水木金土日');
    expect(weekdayHeaders('en3', 1)[6]).toEqual({ label: 'Sun', weekday: 0 });
  });

  it('title', () => {
    expect(formatTitle('ja-full', 2026, 11)).toBe('2026年11月');
    expect(formatTitle('wareki', 2026, 11)).toBe('令和8年11月');
    expect(formatTitle('wareki', 2019, 5)).toBe('令和元年5月');
    expect(formatTitle('wareki', 2019, 4)).toBe('平成31年4月');
    expect(formatTitle('en-upper', 2026, 11)).toBe('NOVEMBER 2026');
    expect(formatTitle('numeric', 2026, 3)).toBe('2026.03');
  });
});

describe('consecutiveMonths', () => {
  it('rolls over to January of the next year', () => {
    expect(consecutiveMonths(2026, 11, 2)).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
    ]);
    expect(consecutiveMonths(2026, 12, 2)).toEqual([
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });
});

describe('layoutCalendar', () => {
  /** November 2026 (5 rows starting on Sunday) and December (5 rows) */
  function settings(overrides: Partial<CalendarSettings> = {}): CalendarSettings {
    return {
      ...defaultSettings('ja').calendar,
      year: 2026,
      month: 11,
      weekStart: 0,
      x: 10,
      y: 20,
      width: 400,
      padding: 16,
      monthGap: 50,
      ...overrides,
    };
  }

  it('a single month has one month placed at the inner top-left', () => {
    const L = layoutCalendar(settings({ months: 1 }));
    expect(L.months).toHaveLength(1);
    expect(L.months[0]).toMatchObject({ dx: 0, dy: 0, year: 2026, month: 11, title: '2026年11月' });
    expect(L.cellW).toBeCloseTo((400 - 32) / 7);
    expect(L.height).toBe(Math.ceil(32 + L.titleH + L.weekdayH + L.rowH * 5));
  });

  it('arranged vertically, the cell width matches a single month and months stack downward with spacing', () => {
    const one = layoutCalendar(settings({ months: 1 }));
    const L = layoutCalendar(settings({ months: 2, monthArrange: 'vertical' }));
    expect(L.cellW).toBeCloseTo(one.cellW);
    expect(L.months.map((m) => [m.year, m.month, m.title])).toEqual([
      [2026, 11, '2026年11月'],
      [2026, 12, '2026年12月'],
    ]);
    const blockH = L.titleH + L.weekdayH + L.rowH * 5;
    const gap = L.cellW * 0.5;
    expect(L.months[1].dx).toBe(0);
    expect(L.months[1].dy).toBeCloseTo(blockH + gap);
    expect(L.height).toBe(Math.ceil(32 + blockH * 2 + gap));
  });

  it('arranged horizontally, the width is shared by 2 months and the gap, and the height follows the month with more rows', () => {
    // Starting on Sunday, January 2027 has 6 rows and February has 5
    const L = layoutCalendar(settings({ year: 2027, month: 1, months: 2, monthArrange: 'horizontal' }));
    expect(L.months[0].grid).toHaveLength(6);
    expect(L.months[1].grid).toHaveLength(5);
    expect(L.cellW).toBeCloseTo((400 - 32) / 14.5);
    expect(L.months[1].dx).toBeCloseTo(L.cellW * 7.5);
    expect(L.months[1].dy).toBe(0);
    expect(L.height).toBe(Math.ceil(32 + L.titleH + L.weekdayH + L.rowH * 6));
  });

  it('with 0 spacing the months sit flush against each other', () => {
    const L = layoutCalendar(settings({ months: 2, monthArrange: 'horizontal', monthGap: 0 }));
    expect(L.cellW).toBeCloseTo((400 - 32) / 14);
    expect(L.months[1].dx).toBeCloseTo(L.cellW * 7);
  });

  it('with 100% column spacing, the base unit equals the cell width', () => {
    const L = layoutCalendar(settings());
    expect(L.unit).toBeCloseTo(L.cellW);
    expect(L.dayFont).toBeCloseTo((L.cellW * 44) / 100);
    expect(L.rowH).toBeCloseTo((L.cellW * 72) / 100);
  });

  it('column spacing changes only the cell width; text size, row height and month spacing follow the base unit', () => {
    const L = layoutCalendar(settings({ months: 2, monthArrange: 'horizontal', columnSpacing: 150 }));
    // Inner width = 7 columns × 1.5 × 2 months + month spacing 0.5
    const unit = (400 - 32) / 21.5;
    expect(L.unit).toBeCloseTo(unit);
    expect(L.cellW).toBeCloseTo(unit * 1.5);
    expect(L.months[1].dx).toBeCloseTo(L.cellW * 7 + unit * 0.5);
    expect(L.dayFont).toBeCloseTo((unit * 44) / 100);
    expect(L.rowH).toBeCloseTo((unit * 72) / 100);
  });

  it('the characters for font loading include headings for both months', () => {
    const text = calendarText(settings({ month: 12, months: 2, titleFormat: 'en-full' }));
    expect(text).toContain('December 2026');
    expect(text).toContain('January 2027');
  });
});

describe('drawCalendar orientation', () => {
  /** Tracks only translate and rotate, recording where on the frame the four corners of the background panel are drawn */
  function panelCorners(s: CalendarSettings): { first: [number, number]; corners: [number, number][] } {
    let m = [1, 0, 0, 1, 0, 0]; // a b c d e f
    const apply = (x: number, y: number): [number, number] => [
      Math.round(m[0] * x + m[2] * y + m[4]),
      Math.round(m[1] * x + m[3] * y + m[5]),
    ];
    let rect: [number, number, number, number] = [0, 0, 0, 0];
    const result = { first: [0, 0] as [number, number], corners: [] as [number, number][] };
    const ctx = {
      save() {},
      restore() {},
      translate(x: number, y: number) {
        m = [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
      },
      rotate(t: number) {
        const cos = Math.cos(t);
        const sin = Math.sin(t);
        m = [m[0] * cos + m[2] * sin, m[1] * cos + m[3] * sin, m[2] * cos - m[0] * sin, m[3] * cos - m[1] * sin, m[4], m[5]];
      },
      beginPath() {},
      roundRect(x: number, y: number, w: number, h: number) {
        rect = [x, y, w, h];
      },
      fill() {
        const [x, y, w, h] = rect;
        result.first = apply(x, y);
        result.corners = [apply(x, y), apply(x + w, y), apply(x, y + h), apply(x + w, y + h)];
      },
    } as unknown as CanvasRenderingContext2D;
    drawCalendar(ctx, s, layoutCalendar(s), 'sans-serif', 'panel');
    return result;
  }

  const base: CalendarSettings = { ...defaultSettings('ja').calendar, year: 2026, month: 11, x: 30, y: 40, width: 300 };

  it('draws exactly within the area on the frame when rotated, with the calendar top-left at the corner for that orientation', () => {
    const L = layoutCalendar(base);
    // The corner of the frame where the rotated calendar top-left (start of the heading) lands
    const expected: Record<number, [number, number]> = {
      0: [30, 40],
      1: [30 + L.height, 40],
      2: [30 + L.width, 40 + L.height],
      3: [30, 40 + L.width],
    };
    for (const rotation of [0, 1, 2, 3] as const) {
      const s = { ...base, rotation };
      const b = calendarBounds(layoutCalendar(s));
      const { first, corners } = panelCorners(s);
      expect(first).toEqual(expected[rotation]);
      const xs = corners.map(([x]) => x);
      const ys = corners.map(([, y]) => y);
      expect([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]).toEqual([
        b.x,
        b.y,
        b.x + b.width,
        b.y + b.height,
      ]);
    }
  });
});
