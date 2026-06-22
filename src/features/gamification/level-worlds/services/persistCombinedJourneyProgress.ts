/**
 * Combined Journey Level — write-through persistence.
 *
 * The Combined Journey Level is derived client-side and is the canonical score
 * for both player rank and the leaderboard. The leaderboard is a cross-user
 * server query, so it needs a persisted snapshot to rank against. This module
 * writes that snapshot to the caller's own `gamification_profiles` row whenever
 * they view their dual-track progress.
 *
 * Properties:
 * - Self-only: writes the authenticated user's row (RLS enforces this too).
 * - Derived, not authoritative: the value can always be recomputed from
 *   milestones; it never feeds the XP/gold economy.
 * - Best-effort: failures are returned, not thrown, so a transient write error
 *   never blocks the overlay.
 */

import type { TypedSupabaseClient } from '../../../../lib/supabaseClient';
import {
  deriveCombinedJourneyLevel,
  type CombinedJourneyLevelInput,
} from './combinedJourneyLevel';

export interface PersistCombinedJourneyResult {
  persisted: boolean;
  level: number;
  xp: number;
  error: Error | null;
}

/**
 * Recompute the Combined Journey Level from `inputs` and write the snapshot to
 * the user's profile row. No-op-safe if the row does not exist (update matches
 * zero rows rather than erroring).
 */
export async function persistCombinedJourneyProgress(
  client: TypedSupabaseClient,
  userId: string,
  inputs: CombinedJourneyLevelInput,
): Promise<PersistCombinedJourneyResult> {
  const summary = deriveCombinedJourneyLevel(inputs);
  try {
    const { error } = await client
      .from('gamification_profiles')
      .update({
        combined_journey_level: summary.level,
        combined_journey_xp: summary.xp,
      })
      .eq('user_id', userId);

    if (error) throw error;
    return { persisted: true, level: summary.level, xp: summary.xp, error: null };
  } catch (error) {
    return {
      persisted: false,
      level: summary.level,
      xp: summary.xp,
      error:
        error instanceof Error
          ? error
          : new Error('Failed to persist combined journey progress'),
    };
  }
}
