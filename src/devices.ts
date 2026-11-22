export type DeviceId = 'x3' | 'x4';
export type Orientation = 'portrait' | 'landscape';
/** In landscape use, which way the device is turned 90° from its portrait orientation */
export type HoldDirection = 'cw' | 'ccw';

export interface Size {
  width: number;
  height: number;
}

export interface DeviceSpec extends Size {
  id: DeviceId;
  label: string;
}

/** All resolutions are given in portrait orientation (the orientation the sleep image is saved in) */
export const DEVICES: Record<DeviceId, DeviceSpec> = {
  x3: { id: 'x3', label: 'Xteink X3', width: 528, height: 792 },
  x4: { id: 'x4', label: 'Xteink X4', width: 480, height: 800 },
};

/** Logical frame size used for editing and preview (width and height are swapped in landscape) */
export function frameSize(device: DeviceId, orientation: Orientation): Size {
  const d = DEVICES[device];
  return orientation === 'portrait'
    ? { width: d.width, height: d.height }
    : { width: d.height, height: d.width };
}
