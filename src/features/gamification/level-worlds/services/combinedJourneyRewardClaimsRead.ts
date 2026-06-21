import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Combined Journey Level — read the caller's claimed threshold chests (R5).
 *
 * RLS scopes the ledger to the authenticated user, so this returns only the
 * caller's own claims. Read-only; never writes. Returns an empty list when there
 * is no client or the query fails, so the UI degrades gracefully.
 */
const CLAIMS_TABLE = 'combined_journey_reward_claims';

export async function fetchClaimedJourneyThresholds(
  client: SupabaseClient | null,
): Promise<number[]> {
  if (!client) return [];
  try {
    const { data, error } = await client.from(CLAIMS_TABLE).select('threshold_level');
    if (error || !Array.isArray(data)) return [];
    const thresholds: number[] = [];
    for (const row of data) {
      const value = (row as { threshold_level?: unknown }).threshold_level;
      if (typeof value === 'number' && Number.isFinite(value)) {
        thresholds.push(Math.floor(value));
      }
    }
    return thresholds;
  } catch {
    return [];
  }
}
