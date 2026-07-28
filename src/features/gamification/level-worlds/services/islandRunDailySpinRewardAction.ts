import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { ISLAND_RUN_ECONOMY_SOURCES, recordIslandRunDiceInflow } from './islandRunEconomyTelemetry';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';

export interface DailySpinIslandRunRewardDeltas {
  dice: number;
  essence: number;
  shards: number;
}

export type GrantDailySpinIslandRunRewardsResult =
  | {
      ok: true;
      record: IslandRunGameStateRecord;
      applied: DailySpinIslandRunRewardDeltas;
    }
  | {
      ok: false;
      record: IslandRunGameStateRecord;
      applied: DailySpinIslandRunRewardDeltas;
      errorMessage: string;
    };

function sanitizeRewardAmount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * Atomically credits a Daily Spin award to the canonical Island Run wallet.
 *
 * This deliberately uses the same mutex + full-record commit path as rolls
 * and other gameplay actions, preventing a wheel reward from being lost to a
 * concurrent roll, hydration, or another reward write.
 */
export function grantDailySpinIslandRunRewards(options: {
  session: Session;
  client: SupabaseClient | null;
  deltas: DailySpinIslandRunRewardDeltas;
  triggerSource?: string;
}): Promise<GrantDailySpinIslandRunRewardsResult> {
  const { session, client, triggerSource } = options;

  return withIslandRunActionLock(session.user.id, async () => {
    const current = getIslandRunStateSnapshot(session);
    const applied: DailySpinIslandRunRewardDeltas = {
      dice: sanitizeRewardAmount(options.deltas.dice),
      essence: sanitizeRewardAmount(options.deltas.essence),
      shards: sanitizeRewardAmount(options.deltas.shards),
    };

    if (applied.dice === 0 && applied.essence === 0 && applied.shards === 0) {
      return { ok: true, record: current, applied };
    }

    const next: IslandRunGameStateRecord = {
      ...current,
      dicePool: current.dicePool + applied.dice,
      essence: current.essence + applied.essence,
      essenceLifetimeEarned: current.essenceLifetimeEarned + applied.essence,
      shards: current.shards + applied.shards,
      runtimeVersion: current.runtimeVersion + 1,
    };

    const commitResult = await commitIslandRunState({
      session,
      client,
      record: next,
      triggerSource: triggerSource ?? 'daily_spin_reward',
    });

    if (!commitResult.ok) {
      return {
        ok: false,
        record: next,
        applied,
        errorMessage: commitResult.errorMessage,
      };
    }

    recordIslandRunDiceInflow({
      source: ISLAND_RUN_ECONOMY_SOURCES.dailySpinDice,
      amount: applied.dice,
      sessionId: session.user.id,
      metadata: { triggerSource: triggerSource ?? 'daily_spin_reward' },
    });

    return { ok: true, record: next, applied };
  });
}
