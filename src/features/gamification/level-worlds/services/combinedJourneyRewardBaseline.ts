import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Combined Journey Level — launch baseline (R8).
 *
 * Idempotently records the caller's journey level the first time they open the
 * overlay post-launch, and returns the effective baseline. Chests are only
 * offered for thresholds strictly above this baseline, so existing players don't
 * receive a flood of chests for pre-launch progress.
 *
 * Returns null when there is no client or the RPC fails, so the caller can treat
 * the baseline as "not ready" and withhold the claim CTA rather than risk
 * offering pre-launch chests.
 */
export async function ensureJourneyBaseline(
  client: SupabaseClient | null,
  level: number,
): Promise<number | null> {
  if (!client) return null;
  const safeLevel = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
  try {
    const { data, error } = await client.rpc('ensure_combined_journey_baseline', {
      p_level: safeLevel,
    });
    if (error) return null;
    const value = Array.isArray(data) ? data[0] : data;
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : null;
  } catch {
    return null;
  }
}
