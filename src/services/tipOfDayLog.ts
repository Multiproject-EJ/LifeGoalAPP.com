/**
 * tipOfDayLog — persistence for the "Tip of the Day — AI Coach".
 *
 * Records one row per user per local day in public.tip_of_day_log: which variation
 * was shown, the habit it focused on, the generated deck (for history / future
 * tuning), and any action the user took. All writes are best-effort: a Tip of the
 * Day must never block the app, so failures are logged and swallowed.
 *
 * The table is not in the generated Database types, so we use an untyped client —
 * matching services/habitChainAnalysis.ts.
 */

import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import { extractSuggestionSummary, type TipCheckIn, type TipVariation } from '../features/tip-of-day/tipOfDayContent';

export type TipAction = 'applied' | 'captured' | 'dismissed';
export type TipFollowupResult = 'worked' | 'partly' | 'not_yet' | 'didnt_work';

/** Variations whose tips suggest a concrete action worth a "did you try it?" check-in. */
const ACTIONABLE_VARIATIONS: TipVariation[] = ['reshape_struggling', 'environment_cue'];

/** Local calendar date as YYYY-MM-DD. */
export function getTipDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

export interface RecordTipShownInput {
  userId: string;
  variation: TipVariation;
  habitId: string | null;
  payload: unknown;
  source: 'openai' | 'fallback';
  shownOn?: string;
}

/**
 * Upsert today's tip row. Idempotent per (user_id, shown_on): re-opening the same
 * day updates the stored deck/source rather than creating duplicates.
 */
export async function recordTipShown(input: RecordTipShownInput): Promise<void> {
  if (!canUseSupabaseData() || !input.userId) {
    return; // demo / signed-out: nothing durable to write.
  }

  const supabase = getUntypedSupabase();
  const { error } = await supabase
    .from('tip_of_day_log')
    .upsert(
      {
        user_id: input.userId,
        shown_on: input.shownOn ?? getTipDateKey(),
        variation: input.variation,
        habit_id: input.habitId,
        payload: input.payload ?? {},
        source: input.source,
      },
      { onConflict: 'user_id,shown_on' },
    );

  if (error) {
    console.warn('Failed to record Tip of the Day shown:', error.message ?? error);
  }
}

/**
 * Find the most recent prior actionable tip that hasn't had a follow-up yet, so we
 * can ask "did you try yesterday's tip?". Returns null when none qualifies (e.g.
 * demo mode, no history, or the last tip was a non-actionable science tip).
 */
export async function getPreviousTipForCheckIn(
  userId: string,
  beforeDate: string = getTipDateKey(),
): Promise<TipCheckIn | null> {
  if (!canUseSupabaseData() || !userId) return null;

  const supabase = getUntypedSupabase();
  const { data, error } = await supabase
    .from('tip_of_day_log')
    .select('id,variation,habit_id,payload,shown_on')
    .eq('user_id', userId)
    .lt('shown_on', beforeDate)
    .is('followup_result', null)
    .in('variation', ACTIONABLE_VARIATIONS)
    .order('shown_on', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Failed to load previous tip for check-in:', error.message ?? error);
    return null;
  }
  if (!data) return null;

  const suggestionText = extractSuggestionSummary(data.payload);
  if (!suggestionText) return null;

  const habitTitle =
    data.payload && typeof data.payload === 'object'
      ? ((data.payload as { habitTitle?: string | null }).habitTitle ?? null)
      : null;

  return { tipId: data.id as string, habitTitle, suggestionText };
}

/** Record the user's answer to the "did you try it?" check-in (best-effort). */
export async function recordTipFollowup(tipId: string, result: TipFollowupResult): Promise<void> {
  if (!canUseSupabaseData() || !tipId) return;

  const supabase = getUntypedSupabase();
  const { error } = await supabase
    .from('tip_of_day_log')
    .update({ followup_result: result, followup_at: new Date().toISOString() })
    .eq('id', tipId);

  if (error) {
    console.warn('Failed to record Tip of the Day follow-up:', error.message ?? error);
  }
}

/** Update the action the user took on today's tip (best-effort). */
export async function recordTipAction(
  userId: string,
  action: TipAction,
  shownOn: string = getTipDateKey(),
): Promise<void> {
  if (!canUseSupabaseData() || !userId) {
    return;
  }

  const supabase = getUntypedSupabase();
  const { error } = await supabase
    .from('tip_of_day_log')
    .update({ action_taken: action })
    .eq('user_id', userId)
    .eq('shown_on', shownOn);

  if (error) {
    console.warn('Failed to record Tip of the Day action:', error.message ?? error);
  }
}
