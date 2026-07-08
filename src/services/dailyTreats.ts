import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { queueArenaTransferWhisperBundle } from '../features/gamification/level-worlds/narrative/landmarkWhispers';
import { applyTokenHopRewards } from '../features/gamification/level-worlds/services/islandRunStateActions';
import { ISLAND_RUN_ECONOMY_SOURCES } from '../features/gamification/level-worlds/services/islandRunEconomyTelemetry';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import { awardDice } from './gameRewards';
import { recordTelemetryEvent } from './telemetry';

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

export async function awardDailyTreatGold(
  userId: string,
  goldAmount: number,
  sourceLabel: string
): Promise<ServiceResponse<{ newGoldBalance: number }>> {
  if (!goldAmount || goldAmount <= 0) {
    return { data: { newGoldBalance: 0 }, error: null };
  }

  const { data: profile, error: profileError } = await fetchGamificationProfile(userId);

  if (profileError || !profile) {
    return { data: null, error: profileError || new Error('Profile not found') };
  }

  const newBalance = profile.total_points + goldAmount;

  if (!canUseSupabaseData()) {
    saveDemoProfile({ ...profile, total_points: newBalance });
  } else {
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase
      .from('gamification_profiles')
      .update({ total_points: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      return { data: null, error: updateError };
    }
  }

  void recordTelemetryEvent({
    userId,
    eventType: 'economy_earn',
    metadata: {
      currency: 'gold',
      amount: goldAmount,
      balance: newBalance,
      sourceType: 'daily_treats',
      sourceLabel,
    },
  });

  return { data: { newGoldBalance: newBalance }, error: null };
}

export function awardDailyTreatDice(options: {
  userId: string;
  diceAmount: number;
  sourceLabel: string;
  islandRunSession?: Session | null;
  islandRunClient?: SupabaseClient | null;
}): void {
  const { userId, diceAmount, sourceLabel, islandRunSession, islandRunClient = null } = options;
  const safeDiceAmount = Number.isFinite(diceAmount) ? Math.max(0, Math.floor(diceAmount)) : 0;
  if (safeDiceAmount <= 0) return;

  awardDice(userId, safeDiceAmount, 'daily_treats', sourceLabel);

  if (!islandRunSession || islandRunSession.user.id !== userId) return;

  applyTokenHopRewards({
    session: islandRunSession,
    client: islandRunClient,
    deltas: { dicePool: safeDiceAmount },
    telemetryDiceSource: ISLAND_RUN_ECONOMY_SOURCES.dailyTreatDice,
    triggerSource: 'daily_treats_dice_award',
  });

  queueArenaTransferWhisperBundle(userId, {
    source: 'daily_treats',
    dice: safeDiceAmount,
    id: `daily_treats:${sourceLabel}:${safeDiceAmount}`,
  });
}
