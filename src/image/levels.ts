/**
 * 4 階調の濃度レベル。明るさの順に並べている。
 * 0 = 黒, 1 = 濃いグレー, 2 = 薄いグレー, 3 = 白
 *
 * ファイル形式ごとの値の割り当て（XTH ではグレー 2 色の順序が入れ替わる等）は
 * 各エンコーダ側で変換する。
 */
export type Level = 0 | 1 | 2 | 3;

/** レベルに対応する 8bit のグレー値。端末のネイティブ階調 (0, 85, 170, 255) と一致させている */
export const LEVEL_GRAY: readonly number[] = [0, 85, 170, 255];

export function nearestLevel(v: number): Level {
  if (v <= 42.5) return 0;
  if (v <= 127.5) return 1;
  if (v <= 212.5) return 2;
  return 3;
}

export function levelCss(level: Level): string {
  const g = LEVEL_GRAY[level];
  return `rgb(${g}, ${g}, ${g})`;
}
