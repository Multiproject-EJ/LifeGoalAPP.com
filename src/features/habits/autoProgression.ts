import type { Json } from '../../lib/database.types';
import type { HabitV2Row } from '../../services/habitsV2';
import { parseSchedule, type HabitSchedule } from './scheduleInterpreter';

export type AutoProgressTier = 'seed' | 'minimum' | 'standard';
export type AutoProgressShift = 'downshift' | 'upgrade';

export type AutoProgressState = {
  tier: AutoProgressTier;
  baseSchedule: Json | null;
  baseTarget: number | null;
  lastShiftAt?: string | null;
  lastShiftType?: AutoProgressShift | null;
};

export const AUTO_PROGRESS_TIERS: Record<
  AutoProgressTier,
  { label: string; description: string }
> = {
  seed: {
    label: 'Seed',
    description: 'Tiny steps to rebuild momentum.',
  },
  minimum: {
    label: 'Minimum',
    description: 'A steady baseline that keeps the habit alive.',
  },
  standard: {
    label: 'Standard',
    description: 'The full cadence you are aiming for.',
  },
};

export const AUTO_PROGRESS_UPGRADE_RULES = {
  minStreakDays: 14,
  minAdherence30: 85,
};

const FALLBACK_TIER: AutoProgressTier = 'standard';

function isTier(value: unknown): value is AutoProgressTier {
  return value === 'seed' || value === 'minimum' || value === 'standard';
}

export function buildDefaultAutoProgressState(params: {
  schedule: Json | null;
  target: number | null;
}): AutoProgressState {
  return {
    tier: FALLBACK_TIER,
    baseSchedule: params.schedule ?? null,
    baseTarget: params.target ?? null,
    lastShiftAt: null,
    lastShiftType: null,
  };
}

export function getAutoProgressState(habit: HabitV2Row): AutoProgressState {
  const fallback = buildDefaultAutoProgressState({
    schedule: habit.schedule ?? null,
    target: habit.target_num ?? null,
  });

  if (!habit.autoprog || typeof habit.autoprog !== 'object') {
    return fallback;
  }

  const record = habit.autoprog as Record<string, unknown>;
  const tier = isTier(record.tier) ? record.tier : fallback.tier;
  const baseSchedule =
    typeof record.baseSchedule !== 'undefined' ? (record.baseSchedule as Json) : fallback.baseSchedule;
  const baseTarget =
    typeof record.baseTarget === 'number' ? record.baseTarget : fallback.baseTarget;
  const lastShiftAt = typeof record.lastShiftAt === 'string' ? record.lastShiftAt : null;
  const lastShiftType =
    record.lastShiftType === 'downshift' || record.lastShiftType === 'upgrade'
      ? record.lastShiftType
      : null;

  return {
    tier,
    baseSchedule,
    baseTarget,
    lastShiftAt,
    lastShiftType,
  };
}

export function getNextDownshiftTier(tier: AutoProgressTier): AutoProgressTier | null {
  if (tier === 'standard') return 'minimum';
  if (tier === 'minimum') return 'seed';
  return null;
}

export function getNextUpgradeTier(tier: AutoProgressTier): AutoProgressTier | null {
  if (tier === 'seed') return 'minimum';
  if (tier === 'minimum') return 'standard';
  return null;
}

function getScheduleForTier(
  baseSchedule: HabitSchedule | null,
  tier: AutoProgressTier,
): HabitSchedule | null {
  if (!baseSchedule) return null;
  if (tier === 'standard') return baseSchedule;

  if (baseSchedule.mode === 'daily') {
    return {
      mode: 'times_per_week',
      timesPerWeek: tier === 'minimum' ? 5 : 3,
    };
  }

  if (baseSchedule.mode === 'times_per_week') {
    const baseTimes = baseSchedule.timesPerWeek ?? 1;
    const delta = tier === 'minimum' ? -1 : -2;
    return {
      ...baseSchedule,
      timesPerWeek: Math.max(1, baseTimes + delta),
    };
  }

  if (baseSchedule.mode === 'specific_days') {
    const baseDays = baseSchedule.days ?? [];
    const removeCount = tier === 'minimum' ? 1 : 2;
    const targetLength = Math.max(1, baseDays.length - removeCount);
    return {
      ...baseSchedule,
      days: baseDays.slice(0, targetLength),
    };
  }

  if (baseSchedule.mode === 'every_n_days') {
    const baseInterval = baseSchedule.intervalDays ?? 1;
    const delta = tier === 'minimum' ? 1 : 2;
    return {
      ...baseSchedule,
      intervalDays: baseInterval + delta,
    };
  }

  return baseSchedule;
}

function getTargetForTier(baseTarget: number | null, tier: AutoProgressTier): number | null {
  if (typeof baseTarget !== 'number') return null;
  if (tier === 'standard') return baseTarget;
  const factor = tier === 'minimum' ? 0.9 : 0.75;
  return Math.max(1, Math.round(baseTarget * factor));
}

export function buildAutoProgressPlan(params: {
  habit: HabitV2Row;
  targetTier: AutoProgressTier;
  shiftType: AutoProgressShift;
}): { state: AutoProgressState; schedule: Json | null; target: number | null } {
  const { habit, targetTier, shiftType } = params;
  const state = getAutoProgressState(habit);
  const baseScheduleJson = state.baseSchedule ?? habit.schedule ?? null;
  const baseSchedule = parseSchedule(baseScheduleJson);
  const nextSchedule = getScheduleForTier(baseSchedule, targetTier);
  const baseTarget = typeof state.baseTarget === 'number' ? state.baseTarget : habit.target_num ?? null;
  const nextTarget = getTargetForTier(baseTarget, targetTier);
  const now = new Date().toISOString();

  return {
    state: {
      tier: targetTier,
      baseSchedule: baseScheduleJson,
      baseTarget,
      lastShiftAt: now,
      lastShiftType: shiftType,
    },
    schedule: (nextSchedule ?? baseSchedule) as Json,
    target: nextTarget,
  };
}
