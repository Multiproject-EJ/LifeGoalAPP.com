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
  '#6366f1', // indigo   — Essence 10
  '#f97316', // orange   — Essence 25
  '#06b6d4', // cyan     — Essence 50
  '#a855f7', // purple   — Shards 2
  '#22c55e', // green    — Shards 5
  '#3b82f6', // blue     — Dice 8
  '#ef4444', // red      — Dice 15
  '#eab308', // yellow   — Game Tokens
  '#14b8a6', // teal     — Treasure Chest
  '#ec4899', // pink     — Mystery Box
];

export function buildWheelSegments(prizes: SpinPrize[]): WheelSegment[] {
  const totalWeight = prizes.reduce((sum, prize) => sum + (prize.wheelWeight ?? 1), 0);
  let currentAngle = 0;

  return prizes.map((prize, index) => {
    const wheelSize = prize.wheelSize ?? 'medium';
    const wheelWeight = prize.wheelWeight ?? 1;
    const segmentAngle = totalWeight > 0 ? (wheelWeight / totalWeight) * 360 : 0;
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
