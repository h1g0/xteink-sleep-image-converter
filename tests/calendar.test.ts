import { describe, expect, it } from 'vitest';
import { holidayKey, japaneseHolidays } from '../src/calendar/holidays';
import { buildMonthGrid, consecutiveMonths, formatTitle, weekdayHeaders } from '../src/calendar/model';
import { calendarText, layoutCalendar, type CalendarSettings } from '../src/calendar/render';
import { defaultSettings } from '../src/state';

describe('japaneseHolidays', () => {
  it('2026 年 (内閣府の公表と一致)', () => {
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

  it('2025 年の振替休日', () => {
    const h = japaneseHolidays(2025);
    expect(h.get(holidayKey(2, 24))).toBe('振替休日');
    expect(h.get(holidayKey(5, 6))).toBe('振替休日');
    expect(h.get(holidayKey(8, 11))).toBe('山の日');
    expect(h.get(holidayKey(11, 24))).toBe('振替休日');
    expect(h.get(holidayKey(3, 20))).toBe('春分の日');
    expect(h.get(holidayKey(9, 23))).toBe('秋分の日');
  });

  it('2019 年の即位関連の休日', () => {
    const h = japaneseHolidays(2019);
    expect(h.get(holidayKey(4, 30))).toBe('国民の休日');
    expect(h.get(holidayKey(5, 1))).toBe('天皇の即位の日');
    expect(h.get(holidayKey(5, 2))).toBe('国民の休日');
    expect(h.get(holidayKey(10, 22))).toBe('即位礼正殿の儀');
  });
});

describe('buildMonthGrid', () => {
  it('2026 年 11 月 (1 日が日曜)', () => {
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

  it('2027 年 2 月は日曜始まりで 4 行に収まる', () => {
    // 2027-02-01 は月曜
    expect(buildMonthGrid(2027, 2, 1).length).toBe(4);
    expect(buildMonthGrid(2027, 2, 0).length).toBe(5);
  });

  it('年をまたぐ前後の月にも祝日が入る', () => {
    const grid = buildMonthGrid(2026, 12, 0);
    const last = grid[grid.length - 1];
    const jan1 = last.find((c) => c.month === 1 && c.day === 1);
    expect(jan1).toMatchObject({ year: 2027, inMonth: false, holiday: '元日' });
  });
});

describe('labels', () => {
  it('週の始まりに合わせて曜日を並べる', () => {
    expect(weekdayHeaders('ja', 0).map((h) => h.label).join('')).toBe('日月火水木金土');
    expect(weekdayHeaders('ja', 1).map((h) => h.label).join('')).toBe('月火水木金土日');
    expect(weekdayHeaders('en3', 1)[6]).toEqual({ label: 'Sun', weekday: 0 });
  });

  it('タイトル', () => {
    expect(formatTitle('ja-full', 2026, 11)).toBe('2026年11月');
    expect(formatTitle('wareki', 2026, 11)).toBe('令和8年11月');
    expect(formatTitle('wareki', 2019, 5)).toBe('令和元年5月');
    expect(formatTitle('wareki', 2019, 4)).toBe('平成31年4月');
    expect(formatTitle('en-upper', 2026, 11)).toBe('NOVEMBER 2026');
    expect(formatTitle('numeric', 2026, 3)).toBe('2026.03');
  });
});

describe('consecutiveMonths', () => {
  it('年をまたぐと翌年の 1 月になる', () => {
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
  /** 2026 年 11 月 (日曜始まりで 5 行) と 12 月 (5 行) */
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

  it('1 か月なら月は 1 つだけで、内側の左上に置く', () => {
    const L = layoutCalendar(settings({ months: 1 }));
    expect(L.months).toHaveLength(1);
    expect(L.months[0]).toMatchObject({ dx: 0, dy: 0, year: 2026, month: 11, title: '2026年11月' });
    expect(L.cellW).toBeCloseTo((400 - 32) / 7);
    expect(L.height).toBe(Math.ceil(32 + L.titleH + L.weekdayH + L.rowH * 5));
  });

  it('縦に並べると 1 マスの幅は 1 か月と同じで、間隔をあけて下に積む', () => {
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

  it('横に並べると幅を 2 か月と間隔で分け合い、高さは行の多い方に合わせる', () => {
    // 2027 年 1 月は日曜始まりで 6 行、2 月は 5 行
    const L = layoutCalendar(settings({ year: 2027, month: 1, months: 2, monthArrange: 'horizontal' }));
    expect(L.months[0].grid).toHaveLength(6);
    expect(L.months[1].grid).toHaveLength(5);
    expect(L.cellW).toBeCloseTo((400 - 32) / 14.5);
    expect(L.months[1].dx).toBeCloseTo(L.cellW * 7.5);
    expect(L.months[1].dy).toBe(0);
    expect(L.height).toBe(Math.ceil(32 + L.titleH + L.weekdayH + L.rowH * 6));
  });

  it('間隔 0 なら月どうしがすき間なく並ぶ', () => {
    const L = layoutCalendar(settings({ months: 2, monthArrange: 'horizontal', monthGap: 0 }));
    expect(L.cellW).toBeCloseTo((400 - 32) / 14);
    expect(L.months[1].dx).toBeCloseTo(L.cellW * 7);
  });

  it('フォントの読み込み用の文字に 2 か月分の見出しを含める', () => {
    const text = calendarText(settings({ month: 12, months: 2, titleFormat: 'en-full' }));
    expect(text).toContain('December 2026');
    expect(text).toContain('January 2027');
  });
});
