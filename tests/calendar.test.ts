import { describe, expect, it } from 'vitest';
import { holidayKey, japaneseHolidays } from '../src/calendar/holidays';
import { buildMonthGrid, formatTitle, weekdayHeaders } from '../src/calendar/model';

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
