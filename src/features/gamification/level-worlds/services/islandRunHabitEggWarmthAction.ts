import type { Session } from '@supabase/supabase-js';
import { applyHabitEggWarmth } from './islandRunStateActions';
import { getIslandRunStateSnapshot } from './islandRunStateStore';
import {
  HABIT_EGG_WARMTH_MS,
  canHabitWarmEggsToday,
  countWarmableEggs,
  formatHabitEggWarmthNotice,
  recordHabitEggWarmth,
  type HabitEggWarmthStorage,
} from './islandRunHabitEggWarmth';
import { scheduleEggHatchNotification } from '../../../../services/habitAlertNotifications';

function defaultStorage(): HabitEggWarmthStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Called after a habit is checked in for today. Warms incubating eggs once
 * per habit per day (up to the daily cap) and returns the player-facing
 * notice, or null when nothing was warmed. A check-in with no incubating egg
 * does not use up the habit's warmth.
 */
export function warmEggsFromHabitCheckIn(options: {
  session: Session;
  habitId: string;
  dateISO: string;
  nowMs?: number;
  storage?: HabitEggWarmthStorage | null;
}): string | null {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  if (!storage) return null;
  const userId = options.session.user.id;
  const nowMs = options.nowMs ?? Date.now();
  if (!canHabitWarmEggsToday(storage, userId, options.habitId, options.dateISO)) return null;
  if (countWarmableEggs(getIslandRunStateSnapshot(options.session), nowMs) === 0) return null;

  const result = applyHabitEggWarmth({ session: options.session, client: null, warmMs: HABIT_EGG_WARMTH_MS, nowMs });
  if (!result.changed) return null;
  const used = recordHabitEggWarmth(storage, userId, options.habitId, options.dateISO);
  if (result.nextHatchAtMs !== null) {
    scheduleEggHatchNotification(userId, result.nextHatchAtMs).catch(() => undefined);
  }
  return formatHabitEggWarmthNotice(result, used);
}
