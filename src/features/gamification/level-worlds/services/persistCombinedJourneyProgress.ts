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
 * - Derived with an earned-XP floor, not authoritative for the XP/gold economy.
 * - Monotonic for this write path: stale clients using this service cannot
 *   replace a higher checkpoint. This is not a database-wide write policy.
 * - Best-effort: failures are returned, not thrown, so a transient write error
 *   never blocks the overlay.
 */

import type { TypedSupabaseClient } from '../../../../lib/supabaseClient';
import {
  deriveCombinedJourneyLevel,
  normalizeJourneyXp,
  type CombinedJourneyLevelInput,
} from './combinedJourneyLevel';
import { recordEarnedJourneyXp } from './earnedJourneyXp';

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
    const { data: updated, error } = await client
      .from('gamification_profiles')
      .update({
        combined_journey_level: summary.level,
        combined_journey_xp: summary.xp,
      })
      .eq('user_id', userId)
      .lte('combined_journey_xp', summary.xp)
      .select('combined_journey_xp')
      .maybeSingle();

    if (error) throw error;
    // A stale tab may lose the conditional update. Read the winning checkpoint,
    // and distinguish that from an absent/RLS-invisible row.
    let stored = updated;
    if (!stored) {
      const existing = await client.from('gamification_profiles')
        .select('combined_journey_xp').eq('user_id', userId).maybeSingle();
      if (existing.error) throw existing.error;
      stored = existing.data;
    }
    if (!stored) return { persisted: false, level: summary.level, xp: summary.xp, error: null };
    const saved = deriveCombinedJourneyLevel({
      earnedXpFloor: Math.max(summary.xp, normalizeJourneyXp(stored.combined_journey_xp)),
    });
    recordEarnedJourneyXp(userId, saved.xp);

    // League membership is represented by row existence. Updating an absent
    // row is a safe no-op, while joined players keep their asynchronous score
    // current whenever the canonical Combined Journey snapshot is refreshed.
    // The migration ships with this feature; generated database types will
    // include the table after the next schema-codegen pass.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leagueClient = client as any;
    try {
      await leagueClient
        .from('adventure_league_entries')
        .update({
          combined_journey_level: saved.level,
          combined_journey_xp: saved.xp,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .lte('combined_journey_xp', saved.xp);
    } catch {
      // League mirroring is best-effort and must never invalidate the
      // successfully persisted canonical gamification profile snapshot.
    }

    return { persisted: true, level: saved.level, xp: saved.xp, error: null };
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
