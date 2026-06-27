import type { Json } from '../../lib/database.types';
import type { HabitHealthState } from './habitHealth';

export type HabitRhythmDaypart = 'morning' | 'day' | 'evening' | 'night' | 'anytime';

export type HabitRhythm = {
  daypart: HabitRhythmDaypart;
  source?: 'user' | 'default' | 'legacy';
};

export type HabitRhythmWindow = {
  daypart: Exclude<HabitRhythmDaypart, 'anytime'>;
  label: string;
  startHour: number;
  endHour: number;
  emoji: string;
};

export const DEFAULT_HABIT_RHYTHM_DAYPART: Exclude<HabitRhythmDaypart, 'anytime'> = 'day';
export const HABIT_RHYTHM_BONUS_MULTIPLIER = 10;
export const HABIT_RHYTHM_BONUS_CAP_GOLD = 500;

export const HABIT_RHYTHM_WINDOWS: HabitRhythmWindow[] = [
  { daypart: 'morning', label: 'Morning', startHour: 5, endHour: 11, emoji: '🌅' },
  { daypart: 'day', label: 'Daytime', startHour: 11, endHour: 16, emoji: '☀️' },
  { daypart: 'evening', label: 'Evening', startHour: 16, endHour: 21, emoji: '🌆' },
  { daypart: 'night', label: 'Night', startHour: 21, endHour: 5, emoji: '🌙' },
];

const VALID_DAYPARTS = new Set<HabitRhythmDaypart>(['morning', 'day', 'evening', 'night', 'anytime']);
const STRUGGLING_HEALTH_STATES = new Set<HabitHealthState>(['at_risk', 'stalled']);

export function isHabitRhythmDaypart(value: unknown): value is HabitRhythmDaypart {
  return typeof value === 'string' && VALID_DAYPARTS.has(value as HabitRhythmDaypart);
}

export function getHabitRhythmWindow(daypart: HabitRhythmDaypart): HabitRhythmWindow | null {
  return HABIT_RHYTHM_WINDOWS.find((window) => window.daypart === daypart) ?? null;
}

export function getHabitRhythmLabel(daypart: HabitRhythmDaypart): string {
  if (daypart === 'anytime') return 'Anytime';
  return getHabitRhythmWindow(daypart)?.label ?? 'Daytime';
}

export function getHabitRhythmEmoji(daypart: HabitRhythmDaypart): string {
  if (daypart === 'anytime') return '🕒';
  return getHabitRhythmWindow(daypart)?.emoji ?? '☀️';
}

export function getCurrentHabitRhythmDaypart(now = new Date()): Exclude<HabitRhythmDaypart, 'anytime'> {
  const hour = now.getHours();
  return HABIT_RHYTHM_WINDOWS.find((window) => isHourInRhythmWindow(hour, window))?.daypart ?? DEFAULT_HABIT_RHYTHM_DAYPART;
}

export function isHourInRhythmWindow(hour: number, window: HabitRhythmWindow): boolean {
  if (window.startHour < window.endHour) {
    return hour >= window.startHour && hour < window.endHour;
  }
  return hour >= window.startHour || hour < window.endHour;
}

export function normalizeHabitRhythm(value: unknown): HabitRhythm {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const rhythm = value as Record<string, unknown>;
    if (isHabitRhythmDaypart(rhythm.daypart)) {
      return {
        daypart: rhythm.daypart,
        source: rhythm.source === 'user' || rhythm.source === 'default' || rhythm.source === 'legacy'
          ? rhythm.source
          : 'user',
      };
    }
  }

  if (isHabitRhythmDaypart(value)) {
    return { daypart: value, source: 'legacy' };
  }

  return { daypart: DEFAULT_HABIT_RHYTHM_DAYPART, source: 'default' };
}

export function extractHabitRhythm(schedule: Json | null | undefined): HabitRhythm {
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return { daypart: DEFAULT_HABIT_RHYTHM_DAYPART, source: 'default' };
  }

  const scheduleObject = schedule as Record<string, unknown>;
  return normalizeHabitRhythm(scheduleObject.rhythm ?? scheduleObject.default_timing);
}

export function buildScheduleWithHabitRhythm<T extends Record<string, unknown>>(schedule: T, rhythm: HabitRhythm): T {
  return {
    ...schedule,
    rhythm: {
      daypart: rhythm.daypart === 'anytime' ? DEFAULT_HABIT_RHYTHM_DAYPART : rhythm.daypart,
      source: rhythm.source ?? 'user',
    },
  };
}

export function isHabitInCurrentRhythmWindow(params: {
  schedule: Json | null | undefined;
  now?: Date;
}): boolean {
  const rhythm = extractHabitRhythm(params.schedule);
  const effectiveDaypart = rhythm.daypart === 'anytime' ? DEFAULT_HABIT_RHYTHM_DAYPART : rhythm.daypart;
  return effectiveDaypart === getCurrentHabitRhythmDaypart(params.now);
}

export function getHabitRhythmBonusGold(params: {
  baseGold: number;
  schedule: Json | null | undefined;
  healthState: HabitHealthState | undefined;
  completed: boolean;
  scheduledToday: boolean;
  now?: Date;
}): number | null {
  if (params.completed || !params.scheduledToday) return null;
  if (!STRUGGLING_HEALTH_STATES.has(params.healthState ?? 'active')) return null;
  if (!isHabitInCurrentRhythmWindow({ schedule: params.schedule, now: params.now })) return null;

  return Math.min(HABIT_RHYTHM_BONUS_CAP_GOLD, Math.max(params.baseGold, Math.round(params.baseGold * HABIT_RHYTHM_BONUS_MULTIPLIER)));
}

export function rankHabitsByRhythm<T extends { id: string; name: string; schedule: Json | null }>(params: {
  habits: T[];
  completionsByHabitId: Record<string, { completed?: boolean; progressState?: string } | undefined>;
  healthStateByHabitId: Record<string, HabitHealthState | undefined>;
  adherenceByHabitId: Record<string, { percentage?: number } | undefined>;
  scheduledTodayByHabitId: Record<string, boolean | undefined>;
  now?: Date;
}): T[] {
  const now = params.now ?? new Date();
  const scoreHabit = (habit: T): number => {
    if (params.completionsByHabitId[habit.id]?.completed) return -10000;
    if (!params.scheduledTodayByHabitId[habit.id]) return -1000;

    const healthState = params.healthStateByHabitId[habit.id] ?? 'active';
    const adherence = params.adherenceByHabitId[habit.id]?.percentage ?? 100;
    const inWindow = isHabitInCurrentRhythmWindow({ schedule: habit.schedule, now });
    let score = 0;
    if (inWindow) score += 500;
    if (healthState === 'stalled') score += 220;
    if (healthState === 'at_risk') score += 180;
    score += Math.max(0, 100 - adherence);
    return score;
  };

  return [...params.habits].sort((a, b) => {
    const scoreDelta = scoreHabit(b) - scoreHabit(a);
    if (scoreDelta !== 0) return scoreDelta;
    return a.name.localeCompare(b.name);
  });
}
