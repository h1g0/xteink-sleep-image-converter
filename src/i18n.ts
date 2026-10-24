export type Lang = 'en' | 'ja';

const en = {
  'app.title': 'Xteink Sleep Image Converter',
  'app.lead':
    'Crop images for the X3 / X4, convert them to 4-level grayscale, and save them as BMP or XTCH. Your images never leave the browser.',
  'app.description':
    'A tool for making Xteink X3 / X4 sleep images: crop, convert to 4-level grayscale, draw a calendar, and save as BMP / XTCH.',
  'lang.label': 'Language',

  'preview.aria': 'Preview',
  'preview.open': 'Open image',
  'preview.noImage': 'No image',
  'preview.actualSize': 'Actual size',
  'preview.drop': 'Drop an image here',
  'preview.dropSub': 'You can also use “Open image” or paste (Ctrl+V)',
  'preview.hint': 'Drag to move the image and scroll to zoom. The calendar can be dragged too.',
  'preview.deviceView': 'Saved data (as seen with the device held upright)',
  'preview.loaded': '{name} ({w}×{h})',
  'preview.loadError': 'Couldn’t open {name} as an image',
  'preview.pasted': 'Pasted image',

  'output.heading': 'Output',
  'output.device': 'Device',
  'output.orientation': 'Orientation',
  'output.portrait': 'Portrait',
  'output.landscape': 'Landscape',
  'output.hold': 'How you hold it in landscape',
  'output.holdCw': 'Turned right (top edge on the right)',
  'output.holdCcw': 'Turned left (top edge on the left)',
  'output.format': 'Format',
  'output.bmpDepth': 'BMP bit depth',
  'output.depth8': '8-bit (recommended, most compatible)',
  'output.depth4': '4-bit',
  'output.depth2': '2-bit (smallest, for CrossPoint)',
  'output.depth24': '24-bit',
  'output.fileName': 'File name',
  'output.save': 'Save',
  'output.info': '{device} {w}×{h}px · {format} · {size}',
  'output.formatBmp': '{depth}-bit BMP',
  'output.formatXtch': 'XTCH (2-bit)',

  'place.heading': 'Image placement',
  'place.zoom': 'Zoom',
  'place.cover': 'Fill screen',
  'place.contain': 'Show whole image',
  'place.center': 'Re-center',
  'place.rotateLeft': '⟲ Rotate left',
  'place.rotateLeftTitle': 'Rotate 90° to the left',
  'place.rotateRight': '⟳ Rotate right',
  'place.rotateRightTitle': 'Rotate 90° to the right',
  'place.flip': 'Flip',
  'place.background': 'Margin color',

  'tone.heading': 'Tone & dithering',
  'tone.autoLevels': 'Auto levels',
  'tone.brightness': 'Brightness',
  'tone.contrast': 'Contrast',
  'tone.gamma': 'Gamma',
  'tone.sharpen': 'Sharpen',
  'tone.invert': 'Invert',
  'tone.dither': 'Dithering',
  'tone.fs': 'Floyd–Steinberg (smooth)',
  'tone.atkinson': 'Atkinson (crisp)',
  'tone.stucki': 'Stucki (fine)',
  'tone.bayer': 'Bayer (ordered pattern)',
  'tone.none': 'None (plain 4 levels)',
  'tone.strength': 'Dither strength',
  'tone.serpentine': 'Serpentine scan (reduces diagonal artifacts)',

  'cal.heading': 'Calendar',
  'cal.enabled': 'Draw a calendar',
  'cal.month': 'Month',
  'cal.prev': 'Previous month',
  'cal.next': 'Next month',
  'cal.thisMonth': 'This month',
  'cal.weekStart': 'Week starts on',
  'cal.sunday': 'Sunday',
  'cal.monday': 'Monday',
  'cal.holidays': 'Color Japanese holidays like Sundays',
  'cal.text': 'Text',
  'cal.font': 'Font',
  'cal.fontFile': 'Load a font file',
  'cal.dayWeight': 'Date weight',
  'cal.titleWeight': 'Heading weight',
  'cal.title': 'Heading',
  'cal.titleNone': 'None',
  'cal.titleAlign': 'Heading position',
  'cal.alignLeft': 'Left',
  'cal.alignCenter': 'Center',
  'cal.alignRight': 'Right',
  'cal.weekdayFormat': 'Weekday labels',
  'cal.weekdayNone': 'Hidden',
  'cal.titleSize': 'Heading size',
  'cal.weekdaySize': 'Weekday size',
  'cal.daySize': 'Date size',
  'cal.rowHeight': 'Row height',
  'cal.colors': 'Colors',
  'cal.textColor': 'Text',
  'cal.sundayColor': 'Sundays & holidays',
  'cal.saturdayColor': 'Saturdays',
  'cal.gridColor': 'Lines',
  'cal.showOtherMonths': 'Show days from adjacent months',
  'cal.otherMonthColor': 'Adjacent month color',
  'cal.grid': 'Grid lines',
  'cal.gridNone': 'None',
  'cal.gridHeader': 'Under the weekdays only',
  'cal.gridAll': 'Full grid',
  'cal.background': 'Background & outline',
  'cal.panel': 'Fill the background',
  'cal.panelColor': 'Background color',
  'cal.panelOpacity': 'Opacity',
  'cal.panelRadius': 'Corner radius',
  'cal.padding': 'Inner padding',
  'cal.outline': 'Outline the text',
  'cal.outlineColor': 'Outline color',
  'cal.outlineWidth': 'Outline width',
  'cal.crisp': 'Draw text without anti-aliasing',
  'cal.position': 'Position & size',
  'cal.width': 'Width',
  'cal.top': 'Top',
  'cal.middle': 'Middle',
  'cal.bottom': 'Bottom',

  'font.loading': 'Loading…',
  'font.failed': 'Couldn’t load the font (showing a fallback)',
  'font.fileError': 'This file couldn’t be loaded as a font',
  'fontGroup.gothic': 'Gothic (sans-serif)',
  'fontGroup.mincho': 'Mincho (serif)',
  'fontGroup.maru': 'Rounded',
  'fontGroup.design': 'Handwriting & display',
  'fontGroup.latin': 'Latin only (Japanese falls back)',
  'fontGroup.system': 'System (works offline)',
  'fontGroup.custom': 'Loaded fonts',

  'level.0': 'Black',
  'level.1': 'Dark gray',
  'level.2': 'Light gray',
  'level.3': 'White',

  'weight.label': '{w} ({name})',
  'weight.100': 'Thin',
  'weight.200': 'Extra light',
  'weight.300': 'Light',
  'weight.400': 'Regular',
  'weight.500': 'Medium',
  'weight.600': 'Semibold',
  'weight.700': 'Bold',
  'weight.800': 'Extra bold',
  'weight.900': 'Black',

  reset: 'Reset settings',
} satisfies Record<string, string>;

export type MessageKey = keyof typeof en;

const ja: Record<MessageKey, string> = {
  'app.title': 'Xteink スリープ画像コンバータ',
  'app.lead':
    'X3 / X4 用に画像を切り抜いて 4 階調に変換し、BMP または XTCH で保存します。画像はブラウザの外に送信されません。',
  'app.description':
    'Xteink X3 / X4 のスリープ画像を作るツール。切り抜き・4階調化・カレンダー描画をして BMP / XTCH で保存します。',
  'lang.label': '言語',

  'preview.aria': 'プレビュー',
  'preview.open': '画像を開く',
  'preview.noImage': '画像なし',
  'preview.actualSize': '等倍表示',
  'preview.drop': '画像をここにドロップ',
  'preview.dropSub': '「画像を開く」や貼り付け (Ctrl+V) でも読み込めます',
  'preview.hint': '画像はドラッグで移動、ホイールで拡大・縮小できます。カレンダーもドラッグで動かせます。',
  'preview.deviceView': '保存されるデータ（端末を縦に持ったときの向き）',
  'preview.loaded': '{name}（{w}×{h}）',
  'preview.loadError': '{name} は画像として読み込めませんでした',
  'preview.pasted': '貼り付けた画像',

  'output.heading': '出力',
  'output.device': '機種',
  'output.orientation': '向き',
  'output.portrait': '縦向き',
  'output.landscape': '横向き',
  'output.hold': '横向きでの持ち方',
  'output.holdCw': '右に倒す（端末の上端が右）',
  'output.holdCcw': '左に倒す（端末の上端が左）',
  'output.format': '形式',
  'output.bmpDepth': 'BMP の色深度',
  'output.depth8': '8bit（推奨・互換性が高い）',
  'output.depth4': '4bit',
  'output.depth2': '2bit（最小・CrossPoint 向け）',
  'output.depth24': '24bit',
  'output.fileName': 'ファイル名',
  'output.save': '保存する',
  'output.info': '{device} {w}×{h}px・{format}・{size}',
  'output.formatBmp': '{depth}bit BMP',
  'output.formatXtch': 'XTCH (2bit)',

  'place.heading': '画像の配置',
  'place.zoom': '拡大率',
  'place.cover': '画面を埋める',
  'place.contain': '全体を表示',
  'place.center': '中央に戻す',
  'place.rotateLeft': '⟲ 左回転',
  'place.rotateLeftTitle': '左に 90° 回転',
  'place.rotateRight': '⟳ 右回転',
  'place.rotateRightTitle': '右に 90° 回転',
  'place.flip': '左右反転',
  'place.background': '余白の色',

  'tone.heading': '画質・階調',
  'tone.autoLevels': '自動レベル補正',
  'tone.brightness': '明るさ',
  'tone.contrast': 'コントラスト',
  'tone.gamma': 'ガンマ',
  'tone.sharpen': 'シャープ',
  'tone.invert': '白黒を反転',
  'tone.dither': 'ディザリング',
  'tone.fs': 'Floyd–Steinberg（なめらか）',
  'tone.atkinson': 'Atkinson（くっきり）',
  'tone.stucki': 'Stucki（細かい）',
  'tone.bayer': 'Bayer（規則的な網点）',
  'tone.none': 'なし（単純な 4 階調化）',
  'tone.strength': 'ディザの強さ',
  'tone.serpentine': '往復走査（斜めの模様を抑える）',

  'cal.heading': 'カレンダー',
  'cal.enabled': 'カレンダーを描く',
  'cal.month': '年月',
  'cal.prev': '前の月',
  'cal.next': '次の月',
  'cal.thisMonth': '今月',
  'cal.weekStart': '週の始まり',
  'cal.sunday': '日曜',
  'cal.monday': '月曜',
  'cal.holidays': '祝日を日曜と同じ色にする',
  'cal.text': '文字',
  'cal.font': 'フォント',
  'cal.fontFile': 'フォントファイルを読み込む',
  'cal.dayWeight': '日付の太さ',
  'cal.titleWeight': '見出しの太さ',
  'cal.title': '見出し',
  'cal.titleNone': 'なし',
  'cal.titleAlign': '見出しの位置',
  'cal.alignLeft': '左',
  'cal.alignCenter': '中央',
  'cal.alignRight': '右',
  'cal.weekdayFormat': '曜日の表記',
  'cal.weekdayNone': '表示しない',
  'cal.titleSize': '見出しの大きさ',
  'cal.weekdaySize': '曜日の大きさ',
  'cal.daySize': '日付の大きさ',
  'cal.rowHeight': '行の高さ',
  'cal.colors': '色',
  'cal.textColor': '文字',
  'cal.sundayColor': '日曜・祝日',
  'cal.saturdayColor': '土曜',
  'cal.gridColor': '罫線',
  'cal.showOtherMonths': '前後の月の日付も表示',
  'cal.otherMonthColor': '前後の月の色',
  'cal.grid': '罫線',
  'cal.gridNone': 'なし',
  'cal.gridHeader': '曜日の下だけ',
  'cal.gridAll': '格子',
  'cal.background': '背景と縁取り',
  'cal.panel': '背景を塗る',
  'cal.panelColor': '背景の色',
  'cal.panelOpacity': '不透明度',
  'cal.panelRadius': '角の丸み',
  'cal.padding': '内側の余白',
  'cal.outline': '文字を縁取る',
  'cal.outlineColor': '縁の色',
  'cal.outlineWidth': '縁の太さ',
  'cal.crisp': '文字をアンチエイリアスなしで描く',
  'cal.position': '位置と大きさ',
  'cal.width': '幅',
  'cal.top': '上に置く',
  'cal.middle': '中央に置く',
  'cal.bottom': '下に置く',

  'font.loading': '読み込み中…',
  'font.failed': 'フォントを読み込めませんでした（代替フォントで表示中）',
  'font.fileError': 'このファイルはフォントとして読み込めませんでした',
  'fontGroup.gothic': 'ゴシック',
  'fontGroup.mincho': '明朝',
  'fontGroup.maru': '丸ゴシック',
  'fontGroup.design': '手書き・デザイン',
  'fontGroup.latin': '欧文（和文は代替）',
  'fontGroup.system': 'システム（オフラインでも可）',
  'fontGroup.custom': '読み込んだフォント',

  'level.0': '黒',
  'level.1': '濃いグレー',
  'level.2': '薄いグレー',
  'level.3': '白',

  'weight.label': '{w}（{name}）',
  'weight.100': '極細',
  'weight.200': '細',
  'weight.300': 'やや細',
  'weight.400': '標準',
  'weight.500': '中',
  'weight.600': 'やや太',
  'weight.700': '太',
  'weight.800': '極太',
  'weight.900': '最太',

  reset: '設定を初期状態に戻す',
};

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, ja };
const STORAGE_KEY = 'xteink-sleep-converter:lang';

let current: Lang = 'en';

export function getLang(): Lang {
  return current;
}

/** 保存しておいた言語、なければブラウザの言語設定から決める */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ja') return saved;
  } catch {
    // 保存できない環境ではブラウザの設定に従う
  }
  return navigator.languages.some((l) => l.toLowerCase().startsWith('ja')) ? 'ja' : 'en';
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // 同上
  }
}

export function isMessageKey(key: string): key is MessageKey {
  return key in en;
}

/** {name} の形の差し込みに対応した翻訳 */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return MESSAGES[current][key].replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/**
 * data-i18n (本文)、data-i18n-title (title 属性)、data-i18n-aria-label (aria-label 属性) を
 * 付けた要素を現在の言語に書き換える。data-i18n の要素は子要素を持たないこと。
 */
export function translateDocument(root: ParentNode = document): void {
  document.documentElement.lang = current;
  document.title = t('app.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'));
  const apply = (attr: string, write: (el: HTMLElement, text: string) => void) => {
    for (const el of root.querySelectorAll<HTMLElement>(`[${attr}]`)) {
      const key = el.getAttribute(attr)!;
      if (isMessageKey(key)) write(el, t(key));
    }
  };
  apply('data-i18n', (el, text) => (el.textContent = text));
  apply('data-i18n-title', (el, text) => (el.title = text));
  apply('data-i18n-aria-label', (el, text) => el.setAttribute('aria-label', text));
}
