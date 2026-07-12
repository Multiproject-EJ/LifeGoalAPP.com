// Task Tower session telemetry — Supabase persistence.
// One row per game open (startTaskTowerSession), updated with final stats
// when the player leaves through the rewards screen. Best-effort by design:
// failures are logged and swallowed so persistence can never block play.
// The localStorage session log in services/gameRewards.ts remains the
// offline/demo fallback. Table: supabase/migrations/0277_task_tower_sessions.sql.

import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';

export interface TaskTowerSessionStart {
  towerSize: number;
  queuedCount: number;
}

export interface TaskTowerSessionResult {
  blocksCleared: number;
  storeysCleared: number;
  coinsEarned: number;
  diceEarned: number;
  tokensEarned: number;
  maxCombo: number;
  durationSeconds: number;
  allClear: boolean;
}

/**
 * Record a new Task Tower session. Returns the row id used to complete the
 * session later, or null when Supabase isn't available (demo mode, offline,
 * signed out) or the insert fails.
 */
export async function startTaskTowerSession(
  userId: string,
  start: TaskTowerSessionStart,
): Promise<string | null> {
  if (!canUseSupabaseData()) {
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('task_tower_sessions')
      .insert({
        user_id: userId,
        tower_size: start.towerSize,
        queued_count: start.queuedCount,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('Task Tower: failed to record session start', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (error) {
    console.warn('Task Tower: failed to record session start', error);
    return null;
  }
}

/**
 * Attach final stats to a session started with startTaskTowerSession.
 * No-op when the start insert didn't happen (sessionId null).
 */
export async function completeTaskTowerSession(
  sessionId: string | null,
  result: TaskTowerSessionResult,
): Promise<void> {
  if (!sessionId || !canUseSupabaseData()) {
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('task_tower_sessions')
      .update({
        completed_at: new Date().toISOString(),
        blocks_cleared: result.blocksCleared,
        storeys_cleared: result.storeysCleared,
        coins_earned: result.coinsEarned,
        dice_earned: result.diceEarned,
        tokens_earned: result.tokensEarned,
        max_combo: result.maxCombo,
        duration_seconds: result.durationSeconds,
        all_clear: result.allClear,
      })
      .eq('id', sessionId);

    if (error) {
      console.warn('Task Tower: failed to record session completion', error.message);
    }
  } catch (error) {
    console.warn('Task Tower: failed to record session completion', error);
  }
}
