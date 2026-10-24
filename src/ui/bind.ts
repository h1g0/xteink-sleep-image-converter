/**
 * data-bind="a.b" を付けた入力要素と設定オブジェクトのプロパティを結び付ける小さな仕組み。
 *
 * - data-type="number" を付けた select / radio は値を数値として扱う (range と number は常に数値)
 * - data-out="a.b" を付けた要素には値を表示する (data-unit で単位、data-digits で小数点以下の桁数)
 * - data-show-if="a.b" / "a.b=値" / "a.b!=値" を付けた要素は条件に合うときだけ表示する
 */

type Bindable = HTMLInputElement | HTMLSelectElement;
type AnyRecord = Record<string, unknown>;

export function getPath(obj: object, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as AnyRecord)[k], obj);
}

function setPath(obj: object, path: string, value: unknown): void {
  const keys = path.split('.');
  const last = keys.pop()!;
  const target = keys.reduce<unknown>((o, k) => (o as AnyRecord)[k], obj) as AnyRecord;
  target[last] = value;
}

function isNumeric(el: Bindable): boolean {
  return el.dataset.type === 'number' || el.type === 'range' || el.type === 'number';
}

function readValue(el: Bindable): unknown {
  if (el instanceof HTMLInputElement && el.type === 'checkbox') return el.checked;
  if (isNumeric(el)) {
    const v = Number(el.value);
    return Number.isFinite(v) ? v : undefined;
  }
  return el.value;
}

export class Binder {
  private readonly controls: Bindable[];

  constructor(
    private readonly root: ParentNode,
    private readonly state: object,
    onChange: (path: string) => void,
  ) {
    this.controls = [...root.querySelectorAll<Bindable>('[data-bind]')];
    for (const el of this.controls) {
      const path = el.dataset.bind!;
      const live = el instanceof HTMLInputElement && (el.type === 'range' || el.type === 'text');
      el.addEventListener(live ? 'input' : 'change', () => {
        if (el instanceof HTMLInputElement && el.type === 'radio' && !el.checked) return;
        const value = readValue(el);
        if (value === undefined) return;
        setPath(this.state, path, value);
        this.updateOutputs();
        this.updateVisibility();
        onChange(path);
      });
    }
    this.refresh();
  }

  /** 設定オブジェクトの値を入力要素に反映する */
  refresh(): void {
    for (const el of this.controls) {
      const v = getPath(this.state, el.dataset.bind!);
      if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = Boolean(v);
      else if (el instanceof HTMLInputElement && el.type === 'radio') el.checked = el.value === String(v);
      else if (document.activeElement !== el || el.type === 'range') el.value = String(v);
    }
    this.updateOutputs();
    this.updateVisibility();
  }

  private updateOutputs(): void {
    for (const out of this.root.querySelectorAll<HTMLElement>('[data-out]')) {
      const v = getPath(this.state, out.dataset.out!);
      const digits = out.dataset.digits ? Number(out.dataset.digits) : null;
      const text = typeof v === 'number' && digits !== null ? v.toFixed(digits) : String(v);
      out.textContent = text + (out.dataset.unit ?? '');
    }
  }

  private updateVisibility(): void {
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-show-if]')) {
      el.hidden = !evaluate(this.state, el.dataset.showIf!);
    }
  }
}

function evaluate(state: object, cond: string): boolean {
  return cond.split('&&').every((part) => {
    const m = part.trim().match(/^([\w.]+)\s*(!=|=)?\s*(.*)$/);
    if (!m) return true;
    const [, path, op, expected] = m;
    const v = getPath(state, path);
    if (!op) return Boolean(v);
    const options = expected.split('|');
    const hit = options.includes(String(v));
    return op === '=' ? hit : !hit;
  });
}
