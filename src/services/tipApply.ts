/**
 * tipApply — execute a Tip of the Day "one-tap apply" action.
 *
 * Currently supports shrinking a quantity/duration habit's target. Reuses the
 * existing guardrailed, reversible habit-adjustment pipeline (saveAndApplySuggestion
 * → clampScheduleChange) rather than mutating the habit directly, so the change is
 * tracked and can be reverted from the normal suggestion UI.
 */

import { canUseSupabaseData } from '../lib/supabaseClient';
import { getHabitV2 } from './habitsV2';
import { saveAndApplySuggestion } from './habitAdjustments';
import type { TipApplyAction } from '../features/tip-of-day/tipOfDayContent';

export interface ApplyTipResult {
  ok: boolean;
  error?: string;
}

export async function applyTipAction(userId: string, action: TipApplyAction): Promise<ApplyTipResult> {
  if (!userId) return { ok: false, error: 'Not signed in' };
  if (action.kind !== 'shrink_target') return { ok: false, error: 'Unsupported action' };

  // Demo / signed-out: no durable habit store to change.
  if (!canUseSupabaseData()) {
    return { ok: false, error: 'Sign in to apply changes' };
  }

  const { data: habit, error } = await getHabitV2(action.habitId);
  if (error) return { ok: false, error: error.message };
  if (!habit) return { ok: false, error: 'Habit not found' };

  const result = await saveAndApplySuggestion({
    habit,
    userId,
    suggestion: {
      habitId: habit.id,
      classification: 'underperforming',
      suggestedAction: 'ease',
      rationale: 'Shrunk via Tip of the Day to keep the habit easy to start.',
      previewChange: {
        target_num: action.newTarget,
        changeDescription: action.changeDescription,
      },
    },
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
