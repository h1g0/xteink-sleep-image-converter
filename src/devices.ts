export type DeviceId = 'x3' | 'x4';
export type Orientation = 'portrait' | 'landscape';
/** 横向きで使うとき、端末を縦持ちの状態からどちらへ 90° 回して持つか */
export type HoldDirection = 'cw' | 'ccw';

export interface Size {
  width: number;
  height: number;
}

export interface DeviceSpec extends Size {
  id: DeviceId;
  label: string;
}

/** 解像度はすべて縦持ち（スリープ画像として保存する向き）での値 */
export const DEVICES: Record<DeviceId, DeviceSpec> = {
  x3: { id: 'x3', label: 'Xteink X3', width: 528, height: 792 },
  x4: { id: 'x4', label: 'Xteink X4', width: 480, height: 800 },
};

/** 編集・プレビューに使う論理的なフレームサイズ（横向きなら幅と高さが入れ替わる） */
export function frameSize(device: DeviceId, orientation: Orientation): Size {
  const d = DEVICES[device];
  return orientation === 'portrait'
    ? { width: d.width, height: d.height }
    : { width: d.height, height: d.width };
}
