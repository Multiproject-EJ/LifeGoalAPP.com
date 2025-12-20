import type { Database } from '../../lib/database.types';
import { LIFE_WHEEL_CATEGORIES } from '../checkins/LifeWheelCheckins';

type DailyItemRow = Database['public']['Tables']['vision_board_daily_items']['Row'];

type BalanceInsight = {
  balanceScore: number;
  insightArea: string;
  insightText: string;
};

function getAreaLabel(key: string | null): string {
  const match = LIFE_WHEEL_CATEGORIES.find((category) => category.key === key);
  return match ? match.label : 'Unassigned';
}

export function evaluateBalance(items: DailyItemRow[]): BalanceInsight {
  const revealed = items.filter((item) => item.status !== 'hidden');
  if (revealed.length === 0) {
    return {
      balanceScore: 0,
      insightArea: 'Unassigned',
      insightText: 'Reveal your cards to calculate your balance focus for today.',
    };
  }

  const areaCounts = revealed.reduce<Record<string, number>>((acc, item) => {
    const key = item.final_area || item.suggested_area || 'unassigned';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const uniqueAreas = Object.keys(areaCounts).length;
  const balanceScore = Math.round((uniqueAreas / Math.min(revealed.length, LIFE_WHEEL_CATEGORIES.length)) * 100);

  const sortedByRepresentation = LIFE_WHEEL_CATEGORIES
    .map((category) => ({ key: category.key, count: areaCounts[category.key] ?? 0 }))
    .sort((a, b) => a.count - b.count);

  const topGap = sortedByRepresentation[0];
  const insightArea = topGap?.key ? getAreaLabel(topGap.key) : 'Unassigned';
  const insightText = topGap?.key
    ? `Lean into ${getAreaLabel(topGap.key)} to round out today’s picks. A small action here will balance your board.`
    : 'Balance your selections across different areas for a stronger insight.';

  return { balanceScore, insightArea, insightText };
}
