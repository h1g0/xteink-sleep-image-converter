import './style.css';
import { formatTitle, type TitleFormat } from './calendar/model';
import { calendarText, layoutCalendar } from './calendar/render';
import { DEVICES, frameSize, type Size } from './devices';
import { bmpFileSize, encodeBmp } from './encode/bmp';
import { encodeXtch, xtchFileSize } from './encode/xtch';
import {
  allFontPresets,
  closestWeight,
  ensureFontLoaded,
  fontLabel,
  getFontPreset,
  registerFontFile,
  type FontGroup,
} from './fonts';
import {
  detectLang,
  getLang,
  isMessageKey,
  setLang,
  t,
  translateDocument,
  type Lang,
  type MessageKey,
} from './i18n';
import { levelsToImageData, Renderer, toDeviceLevels } from './render/pipeline';
import {
  containScale,
  coverScale,
  DEFAULT_PLACEMENT,
  SourceImage,
  type Placement,
  type QuarterTurn,
} from './render/source';
import {
  clampCalendar,
  clearSettings,
  defaultSettings,
  loadSettings,
  moveCalendarToFrame,
  placeCalendar,
  saveSettings,
  type AppSettings,
  type VerticalAnchor,
} from './state';
import { Binder } from './ui/bind';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

setLang(detectLang());
translateDocument();

const state: AppSettings = loadSettings(getLang());
let frame: Size = frameSize(state.device, state.orientation);
let placement: Placement = { ...DEFAULT_PLACEMENT };
let source: SourceImage | null = null;
let lastLevels: Uint8Array | null = null;
const renderer = new Renderer();

const preview = $<HTMLCanvasElement>('preview');
const previewCtx = preview.getContext('2d')!;
const devicePreview = $<HTMLCanvasElement>('device-preview');
const devicePreviewCtx = devicePreview.getContext('2d')!;
const stage = $<HTMLDivElement>('stage');
const zoomInput = $<HTMLInputElement>('zoom');
const fontSelect = $<HTMLSelectElement>('font-select');

// ---------- 選択肢の生成 ----------

function populateLevelSelects(): void {
  const labels = ([0, 1, 2, 3] as const).map((level) => t(`level.${level}`));
  for (const select of document.querySelectorAll<HTMLSelectElement>('select[data-options="levels"]')) {
    select.replaceChildren(...labels.map((label, i) => new Option(label, String(i))));
  }
}

function populateFontSelect(): void {
  const groups = new Map<FontGroup, HTMLOptGroupElement>();
  for (const preset of allFontPresets()) {
    let group = groups.get(preset.group);
    if (!group) {
      group = document.createElement('optgroup');
      group.label = t(`fontGroup.${preset.group}`);
      groups.set(preset.group, group);
    }
    group.append(new Option(fontLabel(preset, getLang()), preset.id));
  }
  fontSelect.replaceChildren(...groups.values());
}

/** フォントで使える太さに選択肢を合わせ、設定値も使える太さに寄せる */
function populateWeightSelects(): void {
  const preset = getFontPreset(state.calendar.fontId);
  state.calendar.fontId = preset.id;
  state.calendar.fontWeight = closestWeight(preset, state.calendar.fontWeight);
  state.calendar.titleWeight = closestWeight(preset, state.calendar.titleWeight);
  for (const select of document.querySelectorAll<HTMLSelectElement>('select[data-options="weights"]')) {
    select.replaceChildren(...preset.weights.map((w) => new Option(weightLabel(w), String(w))));
  }
}

function weightLabel(w: number): string {
  const key = `weight.${w}`;
  return isMessageKey(key) ? t('weight.label', { w, name: t(key) }) : String(w);
}

populateLevelSelects();
populateFontSelect();
populateWeightSelects();
clampCalendar(state.calendar, frame);

const binder = new Binder(document, state, onSettingChange);

// ---------- 設定の変更 ----------

let saveTimer = 0;
function scheduleSave(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveSettings(state), 300);
}

function onSettingChange(path: string): void {
  if (path === 'device' || path === 'orientation') {
    const next = frameSize(state.device, state.orientation);
    moveCalendarToFrame(state.calendar, frame, next);
    frame = next;
    placement.offsetX = 0;
    placement.offsetY = 0;
  }
  if (path === 'calendar.fontId') populateWeightSelects();
  if (path.startsWith('calendar.')) {
    clampCalendar(state.calendar, frame);
    if (/^calendar\.(fontId|fontWeight|titleWeight|titleFormat|weekdayFormat)$/.test(path)) void loadCalendarFont();
  }
  if (path === 'fileName') state.fileName = state.fileName.replace(/[\\/:*?"<>|]/g, '_');
  binder.refresh();
  syncControls();
  scheduleSave();
  requestRender();
}

/** data-bind で扱っていない入力欄の表示を設定に合わせる */
function syncControls(): void {
  const c = state.calendar;
  $<HTMLInputElement>('cal-month').value = `${c.year}-${String(c.month).padStart(2, '0')}`;
  for (const option of document.querySelector<HTMLSelectElement>('[data-bind="calendar.titleFormat"]')!.options) {
    option.text = formatTitle(option.value as TitleFormat, c.year, c.month) || t('cal.titleNone');
  }
  const widthInput = $<HTMLInputElement>('cal-width');
  widthInput.max = String(frame.width);
  widthInput.value = String(c.width);
  zoomInput.value = String(Math.round(placement.zoom * 100));
  $<HTMLOutputElement>('zoom-out').textContent = `${Math.round(placement.zoom * 100)}%`;
  $('file-ext').textContent = `.${state.format}`;
  const dev = DEVICES[state.device];
  const size = state.format === 'bmp' ? bmpFileSize(dev.width, dev.height, state.bmpDepth) : xtchFileSize(dev.width, dev.height);
  const format = state.format === 'bmp' ? t('output.formatBmp', { depth: state.bmpDepth }) : t('output.formatXtch');
  $('output-info').textContent = t('output.info', {
    device: dev.label,
    w: dev.width,
    h: dev.height,
    format,
    size: formatBytes(size),
  });
}

function formatBytes(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`;
}

// ---------- フォント ----------

let fontStatus: MessageKey | null = null;
function showFontStatus(key: MessageKey | null): void {
  fontStatus = key;
  $('font-status').textContent = key ? t(key) : '';
}

let fontToken = 0;
async function loadCalendarFont(): Promise<void> {
  const c = state.calendar;
  const preset = getFontPreset(c.fontId);
  const token = ++fontToken;
  showFontStatus(preset.google ? 'font.loading' : null);
  const ok = await ensureFontLoaded(preset, [c.fontWeight, c.titleWeight], calendarText(c));
  if (token !== fontToken) return;
  showFontStatus(ok ? null : 'font.failed');
  requestRender();
}

document.fonts.addEventListener('loadingdone', () => requestRender());

$<HTMLInputElement>('font-file').addEventListener('change', async (e) => {
  const input = e.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const preset = await registerFontFile(file);
    populateFontSelect();
    state.calendar.fontId = preset.id;
    onSettingChange('calendar.fontId');
  } catch {
    showFontStatus('font.fileError');
  }
});

// ---------- 描画 ----------

let renderQueued = false;
function requestRender(): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render(): void {
  const t0 = performance.now();
  const levels = renderer.render({
    frame,
    source,
    placement,
    background: state.background,
    tone: state.tone,
    dither: state.dither,
    calendar: state.calendar,
    calendarFamily: getFontPreset(state.calendar.fontId).family,
  });
  const elapsed = performance.now() - t0;
  lastLevels = levels;

  if (preview.width !== frame.width || preview.height !== frame.height) {
    preview.width = frame.width;
    preview.height = frame.height;
  }
  previewCtx.putImageData(levelsToImageData(levels, frame.width, frame.height), 0, 0);

  if (state.orientation === 'landscape') {
    const dev = DEVICES[state.device];
    devicePreview.width = dev.width;
    devicePreview.height = dev.height;
    const deviceLevels = toDeviceLevels(levels, frame, state.orientation, state.hold);
    devicePreviewCtx.putImageData(levelsToImageData(deviceLevels, dev.width, dev.height), 0, 0);
  }
  stage.dataset.renderMs = elapsed.toFixed(1);
}

// ---------- 画像の読み込み ----------

/** 画像の読み込み状況。言語を切り替えたときに表示し直せるよう、文言ではなく状態を持つ */
type SourceStatus = { kind: 'none' } | { kind: 'loaded' | 'error'; name: string | null };
let sourceStatus: SourceStatus = { kind: 'none' };

function showSourceStatus(status: SourceStatus): void {
  sourceStatus = status;
  const info = $('source-info');
  if (status.kind === 'none') {
    info.textContent = t('preview.noImage');
    return;
  }
  const name = status.name ?? t('preview.pasted');
  info.textContent =
    status.kind === 'loaded' && source
      ? t('preview.loaded', { name, w: source.width, h: source.height })
      : t('preview.loadError', { name });
}

/** name が null のときは貼り付けた画像として表示する */
async function loadImage(blob: Blob, name: string | null): Promise<void> {
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    source?.close();
    source = new SourceImage(bitmap, name ?? '');
    placement = { ...DEFAULT_PLACEMENT };
    showSourceStatus({ kind: 'loaded', name });
    $('drop-hint').hidden = true;
    syncControls();
    requestRender();
  } catch {
    showSourceStatus({ kind: 'error', name });
  }
}

$<HTMLInputElement>('file-input').addEventListener('change', (e) => {
  const input = e.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) void loadImage(file, file.name);
});

stage.addEventListener('dragover', (e) => {
  e.preventDefault();
  stage.classList.add('dragging');
});
stage.addEventListener('dragleave', () => stage.classList.remove('dragging'));
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  stage.classList.remove('dragging');
  const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (file) void loadImage(file, file.name);
});

document.addEventListener('paste', (e) => {
  const target = e.target as HTMLElement | null;
  if (target?.closest('input, textarea')) return;
  const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
  const file = item?.getAsFile();
  if (file) {
    e.preventDefault();
    void loadImage(file, file.name || null);
  }
});

// ---------- 画像の配置 ----------

function setZoom(zoom: number, anchor?: { x: number; y: number }): void {
  const next = Math.min(4, Math.max(0.1, zoom));
  if (anchor) {
    // anchor の下にある画像の点が動かないように中心をずらす
    const f = next / placement.zoom;
    const cx = frame.width / 2 + placement.offsetX;
    const cy = frame.height / 2 + placement.offsetY;
    placement.offsetX = anchor.x + (cx - anchor.x) * f - frame.width / 2;
    placement.offsetY = anchor.y + (cy - anchor.y) * f - frame.height / 2;
  }
  placement.zoom = next;
  syncControls();
  requestRender();
}

zoomInput.addEventListener('input', () => setZoom(Number(zoomInput.value) / 100));

$('fit-cover').addEventListener('click', () => {
  placement.offsetX = 0;
  placement.offsetY = 0;
  setZoom(1);
});

$('fit-contain').addEventListener('click', () => {
  if (!source) return;
  placement.offsetX = 0;
  placement.offsetY = 0;
  setZoom(containScale(source, frame, placement.rotation) / coverScale(source, frame, placement.rotation));
});

$('center-image').addEventListener('click', () => {
  placement.offsetX = 0;
  placement.offsetY = 0;
  requestRender();
});

function rotate(delta: 1 | 3): void {
  placement.rotation = ((placement.rotation + delta) % 4) as QuarterTurn;
  // 中心からのずれも一緒に回す
  const { offsetX: x, offsetY: y } = placement;
  [placement.offsetX, placement.offsetY] = delta === 1 ? [-y, x] : [y, -x];
  requestRender();
}

$('rotate-left').addEventListener('click', () => rotate(3));
$('rotate-right').addEventListener('click', () => rotate(1));
$('flip').addEventListener('click', () => {
  placement.flipH = !placement.flipH;
  requestRender();
});

// ---------- プレビュー上のドラッグとホイール ----------

type Drag =
  | { kind: 'image'; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'calendar'; startX: number; startY: number; origX: number; origY: number };

let drag: Drag | null = null;

function toFrame(e: { clientX: number; clientY: number }): { x: number; y: number } {
  const rect = preview.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * preview.width) / rect.width,
    y: ((e.clientY - rect.top) * preview.height) / rect.height,
  };
}

function hitCalendar(p: { x: number; y: number }): boolean {
  const c = state.calendar;
  if (!c.enabled) return false;
  const L = layoutCalendar(c);
  return p.x >= L.x && p.x <= L.x + L.width && p.y >= L.y && p.y <= L.y + L.height;
}

preview.addEventListener('pointerdown', (e) => {
  const p = toFrame(e);
  if (hitCalendar(p)) {
    drag = { kind: 'calendar', startX: p.x, startY: p.y, origX: state.calendar.x, origY: state.calendar.y };
  } else if (source) {
    drag = { kind: 'image', startX: p.x, startY: p.y, origX: placement.offsetX, origY: placement.offsetY };
  } else {
    return;
  }
  preview.setPointerCapture(e.pointerId);
  preview.classList.add('dragging');
  e.preventDefault();
});

preview.addEventListener('pointermove', (e) => {
  const p = toFrame(e);
  if (!drag) {
    preview.style.cursor = hitCalendar(p) ? 'move' : source ? 'grab' : 'default';
    return;
  }
  const dx = p.x - drag.startX;
  const dy = p.y - drag.startY;
  if (drag.kind === 'image') {
    placement.offsetX = drag.origX + dx;
    placement.offsetY = drag.origY + dy;
  } else {
    state.calendar.x = drag.origX + dx;
    state.calendar.y = drag.origY + dy;
    clampCalendar(state.calendar, frame);
    binder.refresh();
  }
  requestRender();
});

function endDrag(): void {
  if (drag?.kind === 'calendar') scheduleSave();
  drag = null;
  preview.classList.remove('dragging');
}
preview.addEventListener('pointerup', endDrag);
preview.addEventListener('pointercancel', endDrag);

preview.addEventListener(
  'wheel',
  (e) => {
    if (!source) return;
    e.preventDefault();
    setZoom(placement.zoom * Math.exp(-e.deltaY * 0.0015), toFrame(e));
  },
  { passive: false },
);

$<HTMLInputElement>('actual-size').addEventListener('change', (e) => {
  stage.classList.toggle('actual', (e.currentTarget as HTMLInputElement).checked);
});

// ---------- カレンダーの年月と位置 ----------

function setMonth(year: number, month: number): void {
  const d = new Date(year, month - 1, 1);
  state.calendar.year = d.getFullYear();
  state.calendar.month = d.getMonth() + 1;
  onSettingChange('calendar.titleFormat');
}

$<HTMLInputElement>('cal-month').addEventListener('change', (e) => {
  const m = (e.currentTarget as HTMLInputElement).value.match(/^(\d{4})-(\d{2})$/);
  if (m) setMonth(Number(m[1]), Number(m[2]));
});
$('prev-month').addEventListener('click', () => setMonth(state.calendar.year, state.calendar.month - 1));
$('next-month').addEventListener('click', () => setMonth(state.calendar.year, state.calendar.month + 1));
$('this-month').addEventListener('click', () => {
  const now = new Date();
  setMonth(now.getFullYear(), now.getMonth() + 1);
});

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-anchor]')) {
  button.addEventListener('click', () => {
    placeCalendar(state.calendar, frame, button.dataset.anchor as VerticalAnchor);
    onSettingChange('calendar.y');
  });
}

// ---------- 保存 ----------

$('download').addEventListener('click', () => {
  if (!lastLevels) render();
  const dev = DEVICES[state.device];
  const levels = toDeviceLevels(lastLevels!, frame, state.orientation, state.hold);
  const name = state.fileName.trim() || 'sleep';
  const bytes =
    state.format === 'bmp'
      ? encodeBmp(levels, dev.width, dev.height, state.bmpDepth)
      : encodeXtch(levels, dev.width, dev.height, { title: name, language: getLang() });
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: state.format === 'bmp' ? 'image/bmp' : 'application/octet-stream',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.${state.format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
});

$('reset-settings').addEventListener('click', () => {
  clearSettings();
  Object.assign(state, defaultSettings(getLang()));
  frame = frameSize(state.device, state.orientation);
  placement = { ...DEFAULT_PLACEMENT };
  populateWeightSelects();
  onSettingChange('calendar.fontId');
});

// ---------- 表示言語 ----------

/** 画面の文言だけを切り替える。カレンダーの見出しや曜日の書式は設定のまま変えない */
function applyLanguage(lang: Lang): void {
  setLang(lang);
  translateDocument();
  populateLevelSelects();
  populateFontSelect();
  populateWeightSelects();
  binder.refresh();
  syncControls();
  showSourceStatus(sourceStatus);
  showFontStatus(fontStatus);
}

for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="lang"]')) {
  radio.checked = radio.value === getLang();
  radio.addEventListener('change', () => {
    if (radio.checked) applyLanguage(radio.value as Lang);
  });
}

showSourceStatus(sourceStatus);
syncControls();
void loadCalendarFont();
requestRender();
