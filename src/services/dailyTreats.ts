import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { queueArenaTransferWhisperBundle } from '../features/gamification/level-worlds/narrative/landmarkWhispers';
import { applyTokenHopRewards } from '../features/gamification/level-worlds/services/islandRunStateActions';
import { ISLAND_RUN_ECONOMY_SOURCES } from '../features/gamification/level-worlds/services/islandRunEconomyTelemetry';
import { awardDice } from './gameRewards';

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
