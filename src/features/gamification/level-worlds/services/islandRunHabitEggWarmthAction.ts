import type { Session } from '@supabase/supabase-js';
import { applyHabitEggWarmth } from './islandRunStateActions';
import { getIslandRunStateSnapshot } from './islandRunStateStore';
import {
  HABIT_EGG_WARMTH_MS,
  canHabitWarmEggsToday,
  countWarmableEggs,
  formatHabitEggWarmthNotice,
  habitWarmthSource,
  recordHabitEggWarmth,
  type EggWarmthSource,
  type HabitEggWarmthStorage,
} from './islandRunHabitEggWarmth';
import { scheduleEggHatchNotification } from '../../../../services/habitAlertNotifications';

/** Window event the shared EggWarmthToastHost listens for. */
export const EGG_WARMTH_EVENT = 'lifegoal:egg-warmth';

function defaultStorage(): HabitEggWarmthStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function localDateISO(nowMs: number): string {
  const date = new Date(nowMs);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function announce(notice: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(EGG_WARMTH_EVENT, { detail: { notice } }));
  } catch {
    // Presentation only.
  }
}

/**
 * Warms incubating eggs once per source per day (sources share the daily cap)
 * and returns the player-facing notice, or null when nothing was warmed. A
 * source with no incubating egg to warm does not use up its warmth.
 */
export function warmEggsFromSource(options: {
  session: Session;
  source: EggWarmthSource;
  dateISO?: string;
  nowMs?: number;
  storage?: HabitEggWarmthStorage | null;
  announce?: boolean;
}): string | null {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  if (!storage) return null;
  const userId = options.session.user.id;
  const nowMs = options.nowMs ?? Date.now();
  const dateISO = options.dateISO ?? localDateISO(nowMs);
  if (!canHabitWarmEggsToday(storage, userId, options.source, dateISO)) return null;
  if (countWarmableEggs(getIslandRunStateSnapshot(options.session), nowMs) === 0) return null;

  const result = applyHabitEggWarmth({ session: options.session, client: null, warmMs: HABIT_EGG_WARMTH_MS, nowMs, triggerSource: `egg_warmth_${options.source.split(':')[0]}` });
  if (!result.changed) return null;
  const used = recordHabitEggWarmth(storage, userId, options.source, dateISO);
  if (result.nextHatchAtMs !== null) {
    scheduleEggHatchNotification(userId, result.nextHatchAtMs).catch(() => undefined);
  }
  const kind = options.source.startsWith('habit:') ? 'habit' : options.source.startsWith('compass:') ? 'compass' : 'visit';
  const notice = formatHabitEggWarmthNotice(result, used, kind);
  if (options.announce !== false) announce(notice);
  return notice;
}

/** Called after a habit is checked in for today. */
export function warmEggsFromHabitCheckIn(options: {
  session: Session;
  habitId: string;
  dateISO: string;
  nowMs?: number;
  storage?: HabitEggWarmthStorage | null;
}): string | null {
  return warmEggsFromSource({ ...options, source: habitWarmthSource(options.habitId) });
}
