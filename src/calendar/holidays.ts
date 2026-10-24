/**
 * 日本の祝日・休日を計算する。
 *
 * 2007 年以降の祝日法 (振替休日・国民の休日の規定) を前提にしている。
 * 春分・秋分の日は 1980〜2099 年に使える近似式で求めるため、正式には前年の官報で確定する。
 * 今後の法改正には追従しない。
 */

const cache = new Map<number, Map<string, string>>();

export function holidayKey(month: number, day: number): string {
  return `${month}-${day}`;
}

/** 指定した年の祝日・休日。キーは holidayKey(月, 日) */
export function japaneseHolidays(year: number): Map<string, string> {
  let map = cache.get(year);
  if (!map) {
    map = computeHolidays(year);
    cache.set(year, map);
  }
  return map;
}

function nthMonday(year: number, month: number, n: number): number {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const firstMonday = 1 + ((8 - firstWeekday) % 7);
  return firstMonday + (n - 1) * 7;
}

function equinoxDay(year: number, base: number): number {
  const t = year - 1980;
  return Math.floor(base + 0.242194 * t - Math.floor(t / 4));
}

function computeHolidays(y: number): Map<string, string> {
  const base = new Map<string, string>();
  const add = (m: number, d: number, name: string) => base.set(holidayKey(m, d), name);

  add(1, 1, '元日');
  add(1, nthMonday(y, 1, 2), '成人の日');
  add(2, 11, '建国記念の日');
  if (y >= 2020) add(2, 23, '天皇誕生日');
  add(3, equinoxDay(y, 20.8431), '春分の日');
  add(4, 29, '昭和の日');
  add(5, 3, '憲法記念日');
  add(5, 4, 'みどりの日');
  add(5, 5, 'こどもの日');
  // 2020・2021 年は東京オリンピックに合わせて海の日・山の日・スポーツの日が移動した
  if (y === 2020) add(7, 23, '海の日');
  else if (y === 2021) add(7, 22, '海の日');
  else add(7, nthMonday(y, 7, 3), '海の日');
  if (y === 2020) add(8, 10, '山の日');
  else if (y === 2021) add(8, 8, '山の日');
  else if (y >= 2016) add(8, 11, '山の日');
  add(9, nthMonday(y, 9, 3), '敬老の日');
  add(9, equinoxDay(y, 23.2488), '秋分の日');
  if (y === 2020) add(7, 24, 'スポーツの日');
  else if (y === 2021) add(7, 23, 'スポーツの日');
  else add(10, nthMonday(y, 10, 2), y >= 2020 ? 'スポーツの日' : '体育の日');
  add(11, 3, '文化の日');
  add(11, 23, '勤労感謝の日');
  if (y <= 2018) add(12, 23, '天皇誕生日');
  if (y === 2019) {
    add(5, 1, '天皇の即位の日');
    add(10, 22, '即位礼正殿の儀');
  }

  const result = new Map(base);
  const isBase = (d: Date) => d.getFullYear() === y && base.has(holidayKey(d.getMonth() + 1, d.getDate()));

  // 国民の休日: 前日と翌日がどちらも祝日である平日
  for (let d = new Date(y, 0, 2); d.getFullYear() === y; d.setDate(d.getDate() + 1)) {
    const key = holidayKey(d.getMonth() + 1, d.getDate());
    if (base.has(key)) continue;
    const prev = new Date(y, d.getMonth(), d.getDate() - 1);
    const next = new Date(y, d.getMonth(), d.getDate() + 1);
    if (isBase(prev) && isBase(next)) result.set(key, '国民の休日');
  }

  // 振替休日: 祝日が日曜に当たったら、その後で最初の祝日でない日
  for (const key of base.keys()) {
    const [m, day] = key.split('-').map(Number);
    if (new Date(y, m - 1, day).getDay() !== 0) continue;
    const d = new Date(y, m - 1, day + 1);
    while (isBase(d)) d.setDate(d.getDate() + 1);
    if (d.getFullYear() === y) result.set(holidayKey(d.getMonth() + 1, d.getDate()), '振替休日');
  }
  return result;
}
