import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { ISLAND_RUN_ECONOMY_SOURCES, recordIslandRunDiceInflow } from './islandRunEconomyTelemetry';
import { HABIT_DICE_KEY, decideHabitDiceClaim } from './habitDiceReward';

/**
 * Pays a habit check-in in dice, once per habit per day, through the
 * canonical store under the Island Run action mutex. Returns the dice paid
 * (0 when already claimed today or over the daily cap).
 */
export function grantHabitCheckInDice(options: {
  session: Session;
  client: SupabaseClient | null;
  habitId: string;
  dateKey: string;
  rewardValue: number;
  nowMs?: number;
}): Promise<number> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const nowMs = options.nowMs ?? Date.now();
    const decision = decideHabitDiceClaim({
      ledger: state.signatureMissionProgressByIsland[HABIT_DICE_KEY],
      habitId: options.habitId,
      dateKey: options.dateKey,
      rewardValue: options.rewardValue,
      nowMs,
    });
    if (!decision.ok) return 0;
    recordIslandRunDiceInflow({
      source: ISLAND_RUN_ECONOMY_SOURCES.habitCheckInDice,
      amount: decision.dice,
      sessionId: options.session.user.id,
      metadata: { triggerSource: 'habit_check_in_dice', habitId: options.habitId },
    });
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: 'habit_check_in_dice',
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        dicePool: state.dicePool + decision.dice,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [HABIT_DICE_KEY]: decision.ledger },
      },
    });
    return decision.dice;
  });
}
