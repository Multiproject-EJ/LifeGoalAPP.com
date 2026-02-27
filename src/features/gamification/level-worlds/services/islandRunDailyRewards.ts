export type DailyHeartRewardSource = 'spin_of_the_day' | 'daily_hatch';

export interface DailyHeartRewardPlan {
  source: DailyHeartRewardSource;
  hearts: 1 | 2 | 3;
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

export function planDailyHeartReward(userId: string, dayKey = getUtcDayKey()): DailyHeartRewardPlan {
  const base = hashString(`${userId}:${dayKey}`);
  const hearts = (Math.floor(seededRandom(base + 11.3) * 3) + 1) as 1 | 2 | 3;
  const source: DailyHeartRewardSource = seededRandom(base + 29.7) > 0.5 ? 'spin_of_the_day' : 'daily_hatch';

  return { source, hearts, dayKey };
}
