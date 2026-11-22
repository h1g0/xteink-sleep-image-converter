import type { Lang } from './i18n';

/** Group in the select box. Display names are i18n fontGroup.* */
export type FontGroup = 'gothic' | 'mincho' | 'maru' | 'design' | 'latin' | 'system' | 'custom';

export interface FontPreset {
  id: string;
  /** Display name. The English name is used when there is no Japanese name */
  label: { en: string; ja?: string };
  group: FontGroup;
  /** font-family value passed to the Canvas font */
  family: string;
  /** family parameter passed to the Google Fonts css2 API */
  google?: string;
  weights: number[];
}

const JP_SANS_FALLBACK = '"Yu Gothic", YuGothic, "Hiragino Sans", Meiryo, sans-serif';
const JP_SERIF_FALLBACK = '"Yu Mincho", YuMincho, "Hiragino Mincho ProN", serif';

interface GoogleOptions {
  ja?: string;
  /** Defaults to the font name */
  en?: string;
  /** Use a serif (Mincho) fallback font */
  serif?: boolean;
}

function google(
  id: string,
  group: FontGroup,
  name: string,
  weights: number[],
  spec: string,
  opts: GoogleOptions = {},
): FontPreset {
  const fallback = opts.serif ? JP_SERIF_FALLBACK : JP_SANS_FALLBACK;
  return {
    id,
    label: { en: opts.en ?? name, ja: opts.ja },
    group,
    family: `"${name}", ${fallback}`,
    google: spec,
    weights,
  };
}

export const FONT_PRESETS: FontPreset[] = [
  google('noto-sans-jp', 'gothic', 'Noto Sans JP', [100, 300, 400, 500, 700, 900], 'Noto+Sans+JP:wght@100..900'),
  google('biz-udpgothic', 'gothic', 'BIZ UDPGothic', [400, 700], 'BIZ+UDPGothic:wght@400;700', { ja: 'BIZ UDPゴシック' }),
  google('zen-kaku-gothic-new', 'gothic', 'Zen Kaku Gothic New', [300, 400, 500, 700, 900], 'Zen+Kaku+Gothic+New:wght@300;400;500;700;900', { ja: 'Zen角ゴシック New' }),
  google('m-plus-1', 'gothic', 'M PLUS 1', [100, 300, 400, 500, 700, 900], 'M+PLUS+1:wght@100..900'),
  google('noto-serif-jp', 'mincho', 'Noto Serif JP', [200, 300, 400, 500, 600, 700, 900], 'Noto+Serif+JP:wght@200..900', { serif: true }),
  google('biz-udpmincho', 'mincho', 'BIZ UDPMincho', [400, 700], 'BIZ+UDPMincho:wght@400;700', { ja: 'BIZ UDP明朝', serif: true }),
  google('shippori-mincho', 'mincho', 'Shippori Mincho', [400, 500, 600, 700, 800], 'Shippori+Mincho:wght@400;500;600;700;800', { ja: 'しっぽり明朝', serif: true }),
  google('zen-old-mincho', 'mincho', 'Zen Old Mincho', [400, 500, 600, 700, 900], 'Zen+Old+Mincho:wght@400;500;600;700;900', { ja: 'Zen オールド明朝', serif: true }),
  google('m-plus-rounded-1c', 'maru', 'M PLUS Rounded 1c', [100, 300, 400, 500, 700, 800, 900], 'M+PLUS+Rounded+1c:wght@100;300;400;500;700;800;900'),
  google('zen-maru-gothic', 'maru', 'Zen Maru Gothic', [300, 400, 500, 700, 900], 'Zen+Maru+Gothic:wght@300;400;500;700;900', { ja: 'Zen丸ゴシック' }),
  google('kosugi-maru', 'maru', 'Kosugi Maru', [400], 'Kosugi+Maru', { ja: '小杉丸ゴシック' }),
  google('klee-one', 'design', 'Klee One', [400, 600], 'Klee+One:wght@400;600', { ja: 'クレー（教科書体風）', en: 'Klee One (textbook style)' }),
  google('kaisei-decol', 'design', 'Kaisei Decol', [400, 500, 700], 'Kaisei+Decol:wght@400;500;700', { ja: '解星デコール', serif: true }),
  google('yomogi', 'design', 'Yomogi', [400], 'Yomogi', { ja: 'よもぎ（手書き）', en: 'Yomogi (handwriting)' }),
  google('rocknroll-one', 'design', 'RocknRoll One', [400], 'RocknRoll+One', { ja: 'ロックンロール One' }),
  google('dela-gothic-one', 'design', 'Dela Gothic One', [400], 'Dela+Gothic+One', { ja: 'デラゴシック One（極太）', en: 'Dela Gothic One (extra bold)' }),
  google('dotgothic16', 'design', 'DotGothic16', [400], 'DotGothic16', { ja: 'ドットゴシック16', en: 'DotGothic16 (pixel)' }),
  google('playfair-display', 'latin', 'Playfair Display', [400, 500, 600, 700, 800, 900], 'Playfair+Display:wght@400..900', { serif: true }),
  google('oswald', 'latin', 'Oswald', [200, 300, 400, 500, 600, 700], 'Oswald:wght@200..700'),
  google('bebas-neue', 'latin', 'Bebas Neue', [400], 'Bebas+Neue'),
  { id: 'system-gothic', label: { en: 'System sans-serif', ja: 'システムのゴシック体' }, group: 'system', family: JP_SANS_FALLBACK, weights: [400, 700] },
  { id: 'system-mincho', label: { en: 'System serif', ja: 'システムの明朝体' }, group: 'system', family: JP_SERIF_FALLBACK, weights: [400, 700] },
];

export const DEFAULT_FONT_ID = 'noto-sans-jp';

const customPresets: FontPreset[] = [];

export function allFontPresets(): FontPreset[] {
  return [...FONT_PRESETS, ...customPresets];
}

export function getFontPreset(id: string): FontPreset {
  return allFontPresets().find((p) => p.id === id) ?? FONT_PRESETS[0];
}

export function fontLabel(preset: FontPreset, lang: Lang): string {
  return (lang === 'ja' && preset.label.ja) || preset.label.en;
}

/** The weight available in the font that is closest to the requested weight */
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
 * Loads the font files needed to draw text before drawing to the Canvas.
 * Google Fonts serves Japanese fonts split into subsets by character, so pass the characters to be used.
 * Returns false if loading fails (drawing then falls back to a substitute font).
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

/** Registers a font file chosen by the user and returns it as a preset */
export async function registerFontFile(file: File): Promise<FontPreset> {
  const n = customPresets.length + 1;
  const name = `UserFont${n}`;
  const face = new FontFace(name, await file.arrayBuffer());
  await face.load();
  document.fonts.add(face);
  const preset: FontPreset = {
    id: `custom-${n}`,
    label: { en: file.name.replace(/\.[^.]+$/, '') },
    group: 'custom',
    family: `"${name}", ${JP_SANS_FALLBACK}`,
    weights: [400, 700],
  };
  customPresets.push(preset);
  return preset;
}
