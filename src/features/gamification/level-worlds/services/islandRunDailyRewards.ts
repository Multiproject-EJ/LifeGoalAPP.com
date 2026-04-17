export type DailyDiceRewardSource = 'spin_of_the_day' | 'daily_hatch';

/**
 * Daily dice reward plan — hearts retired, replaced with direct dice awards.
 * The dice amounts are tuned to roughly match what 1-3 hearts used to buy
 * via the starter dice pack (2 hearts → 15 dice).
 */
export interface DailyDiceRewardPlan {
  source: DailyDiceRewardSource;
  /** Dice awarded (replaces hearts). */
  dice: 5 | 10 | 15;
  /** Bonus essence awarded. */
  essence: number;
  dayKey: string;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getUtcDayKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DICE_TIERS = [5, 10, 15] as const;

export function planDailyDiceReward(userId: string, dayKey = getUtcDayKey()): DailyDiceRewardPlan {
  const base = hashString(`${userId}:${dayKey}`);
  const dice = DICE_TIERS[Math.floor(seededRandom(base + 11.3) * 3)] ?? 5;
  const essence = Math.floor(seededRandom(base + 7.1) * 8) + 3; // 3–10 bonus essence
  const source: DailyDiceRewardSource = seededRandom(base + 29.7) > 0.5 ? 'spin_of_the_day' : 'daily_hatch';

  return { source, dice, essence, dayKey };
}

// ── Legacy compat aliases (deprecated) ──────────────────────────────────────
/** @deprecated Use DailyDiceRewardSource instead. */
export type DailyHeartRewardSource = DailyDiceRewardSource;
/** @deprecated Use DailyDiceRewardPlan instead. Hearts are retired. */
export type DailyHeartRewardPlan = DailyDiceRewardPlan;
/** @deprecated Use planDailyDiceReward instead. Hearts are retired. */
export const planDailyHeartReward = planDailyDiceReward;
