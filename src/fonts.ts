export interface FontPreset {
  id: string;
  label: string;
  /** セレクトボックスのグループ名 */
  group: string;
  /** Canvas の font に渡す font-family の値 */
  family: string;
  /** Google Fonts の css2 API に渡す family パラメータ */
  google?: string;
  weights: number[];
}

const JP_SANS_FALLBACK = '"Yu Gothic", YuGothic, "Hiragino Sans", Meiryo, sans-serif';
const JP_SERIF_FALLBACK = '"Yu Mincho", YuMincho, "Hiragino Mincho ProN", serif';

function google(
  id: string,
  label: string,
  group: string,
  name: string,
  weights: number[],
  spec: string,
  fallback = JP_SANS_FALLBACK,
): FontPreset {
  return { id, label, group, family: `"${name}", ${fallback}`, google: spec, weights };
}

export const FONT_PRESETS: FontPreset[] = [
  google('noto-sans-jp', 'Noto Sans JP', 'ゴシック', 'Noto Sans JP', [100, 300, 400, 500, 700, 900], 'Noto+Sans+JP:wght@100..900'),
  google('biz-udpgothic', 'BIZ UDPゴシック', 'ゴシック', 'BIZ UDPGothic', [400, 700], 'BIZ+UDPGothic:wght@400;700'),
  google('zen-kaku-gothic-new', 'Zen角ゴシック New', 'ゴシック', 'Zen Kaku Gothic New', [300, 400, 500, 700, 900], 'Zen+Kaku+Gothic+New:wght@300;400;500;700;900'),
  google('m-plus-1', 'M PLUS 1', 'ゴシック', 'M PLUS 1', [100, 300, 400, 500, 700, 900], 'M+PLUS+1:wght@100..900'),
  google('noto-serif-jp', 'Noto Serif JP', '明朝', 'Noto Serif JP', [200, 300, 400, 500, 600, 700, 900], 'Noto+Serif+JP:wght@200..900', JP_SERIF_FALLBACK),
  google('biz-udpmincho', 'BIZ UDP明朝', '明朝', 'BIZ UDPMincho', [400, 700], 'BIZ+UDPMincho:wght@400;700', JP_SERIF_FALLBACK),
  google('shippori-mincho', 'しっぽり明朝', '明朝', 'Shippori Mincho', [400, 500, 600, 700, 800], 'Shippori+Mincho:wght@400;500;600;700;800', JP_SERIF_FALLBACK),
  google('zen-old-mincho', 'Zen オールド明朝', '明朝', 'Zen Old Mincho', [400, 500, 600, 700, 900], 'Zen+Old+Mincho:wght@400;500;600;700;900', JP_SERIF_FALLBACK),
  google('m-plus-rounded-1c', 'M PLUS Rounded 1c', '丸ゴシック', 'M PLUS Rounded 1c', [100, 300, 400, 500, 700, 800, 900], 'M+PLUS+Rounded+1c:wght@100;300;400;500;700;800;900'),
  google('zen-maru-gothic', 'Zen丸ゴシック', '丸ゴシック', 'Zen Maru Gothic', [300, 400, 500, 700, 900], 'Zen+Maru+Gothic:wght@300;400;500;700;900'),
  google('kosugi-maru', '小杉丸ゴシック', '丸ゴシック', 'Kosugi Maru', [400], 'Kosugi+Maru'),
  google('klee-one', 'クレー (教科書体風)', '手書き・デザイン', 'Klee One', [400, 600], 'Klee+One:wght@400;600'),
  google('kaisei-decol', '解星デコール', '手書き・デザイン', 'Kaisei Decol', [400, 500, 700], 'Kaisei+Decol:wght@400;500;700', JP_SERIF_FALLBACK),
  google('yomogi', 'よもぎ (手書き)', '手書き・デザイン', 'Yomogi', [400], 'Yomogi'),
  google('rocknroll-one', 'ロックンロール One', '手書き・デザイン', 'RocknRoll One', [400], 'RocknRoll+One'),
  google('dela-gothic-one', 'デラゴシック One (極太)', '手書き・デザイン', 'Dela Gothic One', [400], 'Dela+Gothic+One'),
  google('dotgothic16', 'ドットゴシック16', '手書き・デザイン', 'DotGothic16', [400], 'DotGothic16'),
  google('playfair-display', 'Playfair Display', '欧文 (和文は代替)', 'Playfair Display', [400, 500, 600, 700, 800, 900], 'Playfair+Display:wght@400..900', JP_SERIF_FALLBACK),
  google('oswald', 'Oswald', '欧文 (和文は代替)', 'Oswald', [200, 300, 400, 500, 600, 700], 'Oswald:wght@200..700'),
  google('bebas-neue', 'Bebas Neue', '欧文 (和文は代替)', 'Bebas Neue', [400], 'Bebas+Neue'),
  { id: 'system-gothic', label: 'システムのゴシック体', group: 'システム (オフラインでも可)', family: JP_SANS_FALLBACK, weights: [400, 700] },
  { id: 'system-mincho', label: 'システムの明朝体', group: 'システム (オフラインでも可)', family: JP_SERIF_FALLBACK, weights: [400, 700] },
];

export const DEFAULT_FONT_ID = 'noto-sans-jp';

const customPresets: FontPreset[] = [];

export function allFontPresets(): FontPreset[] {
  return [...FONT_PRESETS, ...customPresets];
}

export function getFontPreset(id: string): FontPreset {
  return allFontPresets().find((p) => p.id === id) ?? FONT_PRESETS[0];
}

/** 指定した太さに一番近い、そのフォントで使える太さ */
export function closestWeight(preset: FontPreset, weight: number): number {
  return preset.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best));
}

const stylesheets = new Map<string, Promise<void>>();

function loadStylesheet(spec: string): Promise<void> {
  let p = stylesheets.get(spec);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=block`;
      link.onload = () => resolve();
      link.onerror = () => {
        stylesheets.delete(spec);
        link.remove();
        reject(new Error(`stylesheet failed: ${spec}`));
      };
      document.head.append(link);
    });
    stylesheets.set(spec, p);
  }
  return p;
}

/**
 * Canvas に描く前に、text の描画に必要なフォントファイルを読み込んでおく。
 * Google Fonts の日本語フォントは文字種ごとに分割配信されるので、使う文字を渡す。
 * 読み込めなかった場合は false (描画は代替フォントで行われる)。
 */
export async function ensureFontLoaded(preset: FontPreset, weights: number[], text: string): Promise<boolean> {
  try {
    if (preset.google) await loadStylesheet(preset.google);
    const faces = await Promise.all(weights.map((w) => document.fonts.load(`${w} 32px ${preset.family}`, text)));
    return !preset.google || faces.some((f) => f.length > 0);
  } catch {
    return false;
  }
}

/** ユーザーが選んだフォントファイルを登録してプリセットとして返す */
export async function registerFontFile(file: File): Promise<FontPreset> {
  const n = customPresets.length + 1;
  const name = `UserFont${n}`;
  const face = new FontFace(name, await file.arrayBuffer());
  await face.load();
  document.fonts.add(face);
  const preset: FontPreset = {
    id: `custom-${n}`,
    label: file.name.replace(/\.[^.]+$/, ''),
    group: '読み込んだフォント',
    family: `"${name}", ${JP_SANS_FALLBACK}`,
    weights: [400, 700],
  };
  customPresets.push(preset);
  return preset;
}
