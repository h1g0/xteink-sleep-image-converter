import { holidayKey, japaneseHolidays } from './holidays';

/** 0 = 日曜始まり, 1 = 月曜始まり */
export type WeekStart = 0 | 1;

export type TitleFormat =
  | 'ja-full'
  | 'ja-month'
  | 'wareki'
  | 'en-full'
  | 'en-upper'
  | 'en-month'
  | 'numeric'
  | 'number'
  | 'none';

export type WeekdayFormat = 'ja' | 'en3' | 'en2' | 'en1' | 'none';

export interface DayCell {
  year: number;
  month: number;
  day: number;
  /** 0 = 日曜 〜 6 = 土曜 */
  weekday: number;
  inMonth: boolean;
  holiday?: string;
}

/** year 年 month 月から始まる count か月分の年月。年をまたぐ場合は翌年に繰り上げる */
export function consecutiveMonths(year: number, month: number, count: number): { year: number; month: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

/** 月のカレンダーを週ごとの行に分けて返す。行数は 4〜6 */
export function buildMonthGrid(year: number, month: number, weekStart: WeekStart): DayCell[][] {
  const first = new Date(year, month - 1, 1);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const rows = Math.ceil((lead + daysInMonth) / 7);
  const grid: DayCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const week: DayCell[] = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(year, month - 1, 1 - lead + r * 7 + c);
      const cell: DayCell = {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        weekday: d.getDay(),
        inMonth: d.getMonth() === month - 1,
      };
      const holiday = japaneseHolidays(cell.year).get(holidayKey(cell.month, cell.day));
      if (holiday) cell.holiday = holiday;
      week.push(cell);
    }
    grid.push(week);
  }
  return grid;
}

const WEEKDAY_LABELS: Record<Exclude<WeekdayFormat, 'none'>, string[]> = {
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  en3: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  en2: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  en1: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

/** 週の始まりの順に並べた曜日名と曜日番号 */
export function weekdayHeaders(format: WeekdayFormat, weekStart: WeekStart): { label: string; weekday: number }[] {
  if (format === 'none') return [];
  const labels = WEEKDAY_LABELS[format];
  return Array.from({ length: 7 }, (_, i) => {
    const weekday = (weekStart + i) % 7;
    return { label: labels[weekday], weekday };
  });
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatTitle(format: TitleFormat, year: number, month: number): string {
  switch (format) {
    case 'ja-full':
      return `${year}年${month}月`;
    case 'ja-month':
      return `${month}月`;
    case 'wareki': {
      // 令和は 2019 年 5 月から
      if (year < 2019 || (year === 2019 && month < 5)) return `平成${year - 1988}年${month}月`;
      const n = year - 2018;
      return `令和${n === 1 ? '元' : n}年${month}月`;
    }
    case 'en-full':
      return `${MONTH_NAMES[month - 1]} ${year}`;
    case 'en-upper':
      return `${MONTH_NAMES[month - 1]} ${year}`.toUpperCase();
    case 'en-month':
      return MONTH_NAMES[month - 1];
    case 'numeric':
      return `${year}.${String(month).padStart(2, '0')}`;
    case 'number':
      return String(month);
    case 'none':
      return '';
  }
}
