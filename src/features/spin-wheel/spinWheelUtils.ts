import type { SpinPrize } from '../../types/gamification';

export type WheelSegment = SpinPrize & {
  color: string;
  startAngle: number;
  endAngle: number;
  centerAngle: number;
  wheelSize: 'small' | 'medium' | 'large';
  wheelWeight: number;
};

/**
 * 10 distinct, vibrant colors — one per segment.
 * Ordered so that adjacent segments always have high contrast.
 */
const SEGMENT_COLORS = [
  '#6d28d9', // purple
  '#db2777', // pink
  '#f97316', // orange
  '#eab308', // amber
  '#22c55e', // green
  '#06b6d4', // cyan
  '#2563eb', // blue
  '#4338ca', // indigo
  '#f43f5e', // rose
  '#14b8a6', // teal
];

export function buildWheelSegments(prizes: SpinPrize[]): WheelSegment[] {
  const segmentAngle = prizes.length > 0 ? 360 / prizes.length : 0;
  let currentAngle = 0;

  return prizes.map((prize, index) => {
    const wheelSize = prize.wheelSize ?? 'medium';
    const wheelWeight = prize.wheelWeight ?? 1;
    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentAngle;
    const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];

    currentAngle = endAngle;

    return {
      ...prize,
      wheelSize,
      wheelWeight,
      color,
      startAngle,
      endAngle,
      centerAngle: startAngle + segmentAngle / 2,
    };
  });
}
