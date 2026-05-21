import type { Session } from '@supabase/supabase-js';
import { awardDailyTreatDice } from './dailyTreats';
import { awardDailyTreeWatering } from './impactTrees';

export function awardDailyWisdomTreeWatering(options: {
  userId: string;
  islandRunSession?: Session | null;
  referenceDate?: Date;
}): void {
  const { userId, islandRunSession = null, referenceDate = new Date() } = options;

  awardDailyTreatDice({
    userId,
    diceAmount: 15,
    sourceLabel: 'Water the Wisdom Tree',
    islandRunSession,
  });
  awardDailyTreeWatering(userId, referenceDate);
}
