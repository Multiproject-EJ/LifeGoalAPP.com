/**
 * habitInsights — persistence for quick habit insight captures (cue chips +
 * optional note) logged from the Today screen, plus a capped dice reward to make
 * sharing feel like a game.
 *
 * Writes to public.habit_insights when Supabase is available; in demo / signed-out
 * mode it falls back to localStorage so the capture → Tip-of-the-Day loop still
 * works. The table is not in the generated Database types, so we use an untyped
 * client — matching services/habitChainAnalysis.ts.
 */

import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import { awardDice } from './gameRewards';
import type { HabitInsightRecord } from '../features/habits/habitInsightModel';

const DEMO_STORAGE_PREFIX = 'lifegoal_habit_insights_';
const DICE_CAP_PREFIX = 'lifegoal_insight_dice_';
const DICE_PER_CAPTURE = 1;
const DICE_DAILY_CAP = 3;

/** Local calendar date as YYYY-MM-DD. */
export function getInsightDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

type DemoInsightRow = {
  habit_id: string;
  captured_on: string;
  cue_tags: string[];
  note: string | null;
};

function readDemoInsights(userId: string): DemoInsightRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${DEMO_STORAGE_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as DemoInsightRow[]) : [];
  } catch {
    return [];
  }
}

function writeDemoInsights(userId: string, rows: DemoInsightRow[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${DEMO_STORAGE_PREFIX}${userId}`, JSON.stringify(rows.slice(-200)));
  } catch {
    /* ignore quota errors */
  }
}

export interface RecordHabitInsightInput {
  userId: string;
  habitId: string;
  cueTags: string[];
  note: string | null;
  capturedOn?: string;
}

/** Persist one insight (best-effort). Returns true when something was stored. */
export async function recordHabitInsight(input: RecordHabitInsightInput): Promise<boolean> {
  if (!input.userId || !input.habitId) return false;
  const capturedOn = input.capturedOn ?? getInsightDateKey();
  const cueTags = input.cueTags ?? [];
  const note = input.note?.trim() ? input.note.trim() : null;
  if (cueTags.length === 0 && !note) return false;

  if (!canUseSupabaseData()) {
    const rows = readDemoInsights(input.userId);
    rows.push({ habit_id: input.habitId, captured_on: capturedOn, cue_tags: cueTags, note });
    writeDemoInsights(input.userId, rows);
    return true;
  }

  const supabase = getUntypedSupabase();
  const { error } = await supabase.from('habit_insights').insert({
    user_id: input.userId,
    habit_id: input.habitId,
    captured_on: capturedOn,
    cue_tags: cueTags,
    note,
  });

  if (error) {
    console.warn('Failed to record habit insight:', error.message ?? error);
    return false;
  }
  return true;
}

/** Recent insights for a habit, newest first (capped by `limit`). */
export async function listRecentHabitInsights(
  userId: string,
  habitId: string,
  limit = 10,
): Promise<HabitInsightRecord[]> {
  if (!userId || !habitId) return [];

  if (!canUseSupabaseData()) {
    return readDemoInsights(userId)
      .filter((row) => row.habit_id === habitId)
      .sort((a, b) => b.captured_on.localeCompare(a.captured_on))
      .slice(0, limit)
      .map((row) => ({ cueTags: row.cue_tags ?? [], note: row.note ?? null, capturedOn: row.captured_on }));
  }

  const supabase = getUntypedSupabase();
  const { data, error } = await supabase
    .from('habit_insights')
    .select('cue_tags,note,captured_on')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .order('captured_on', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('Failed to load habit insights:', error.message ?? error);
    return [];
  }

  return ((data as Array<{ cue_tags: string[] | null; note: string | null; captured_on: string }> | null) ?? []).map(
    (row) => ({ cueTags: row.cue_tags ?? [], note: row.note ?? null, capturedOn: row.captured_on }),
  );
}

/**
 * Award a small dice reward for sharing an insight, capped per day so it can't be
 * farmed. Returns the number of dice actually awarded (0 when the daily cap is hit
 * or gamification rewards aren't applicable).
 */
export function awardInsightCaptureDice(userId: string): number {
  if (!userId || typeof window === 'undefined') return 0;

  const key = `${DICE_CAP_PREFIX}${getInsightDateKey()}_${userId}`;
  let awardedToday = 0;
  try {
    awardedToday = Number(window.localStorage.getItem(key) ?? '0') || 0;
  } catch {
    awardedToday = 0;
  }

  if (awardedToday >= DICE_DAILY_CAP) return 0;

  const amount = Math.min(DICE_PER_CAPTURE, DICE_DAILY_CAP - awardedToday);
  awardDice(userId, amount, 'habit_insight', 'Habit insight capture');

  try {
    window.localStorage.setItem(key, String(awardedToday + amount));
  } catch {
    /* ignore */
  }

  return amount;
}
