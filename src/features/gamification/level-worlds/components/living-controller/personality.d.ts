export const ARRIVAL_STYLES: readonly ('spin' | 'bubble' | 'rise' | 'rocket' | 'swoop-left' | 'swoop-right')[];
export type ArrivalStyle = (typeof ARRIVAL_STYLES)[number];
export const ARRIVAL_FLIGHT: number;
export const ARRIVAL_LANDING: number;
export function resolveArrivalStyle(arrivalKey: string | number | undefined): ArrivalStyle;
export function createPersonalityClock(): (time: number, snapshot: Record<string, unknown>) => { kind: string; style?: ArrivalStyle; age: number };
export function personalityPose(performance: { kind: string; style?: ArrivalStyle; age: number }): {
  x: number; y: number; rx: number; ry: number; rz: number; scale: number; dark: boolean; burst: number; cowboy: boolean;
  thrust: number; flameX: number; flameY: number;
};
