import type { SpinPrize } from '../../types/gamification';

export type WheelSegment = SpinPrize & {
  color: string;
  startAngle: number;
  endAngle: number;
  centerAngle: number;
  wheelSize: 'small' | 'medium' | 'large';
  wheelWeight: number;
};

const POINTS_COLORS: Record<WheelSegment['wheelSize'], string> = {
  small: '#60a5fa',
  medium: '#38bdf8',
  large: '#22c55e',
};

const CHEST_COLORS: Record<WheelSegment['wheelSize'], string> = {
  small: '#facc15',
  medium: '#f59e0b',
  large: '#d97706',
};

export function buildWheelSegments(prizes: SpinPrize[]): WheelSegment[] {
  const totalWeight = prizes.reduce((sum, prize) => sum + (prize.wheelWeight ?? 1), 0);
  let currentAngle = 0;

  return prizes.map((prize) => {
    const wheelSize = prize.wheelSize ?? 'medium';
    const wheelWeight = prize.wheelWeight ?? 1;
    const segmentAngle = totalWeight > 0 ? (wheelWeight / totalWeight) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentAngle;
    const color =
      prize.type === 'treasure_chest' ? CHEST_COLORS[wheelSize] : POINTS_COLORS[wheelSize];

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
