import { getAiTaskLevel, resolveModelForAiTask, type AiTaskKey } from './aiTaskRouting';

export type AiMode = 'premium' | 'free_quota' | 'fallback';

export type AiEntitlementDecision = {
  mode: AiMode;
  allowed: boolean;
  model: string | null;
  reason: string;
  quotaRemaining: number | null;
};

type DailyUsage = {
  dayKey: string;
  counts: Record<'level_1' | 'level_2', number>;
};

const AI_QUOTA_STORAGE_KEY = 'lifegoal_ai_quota_usage_v1';
const FREE_DAILY_LIMIT: Record<'level_1' | 'level_2', number> = {
  level_1: 60,
  level_2: 12,
};

function getDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultUsage(dayKey: string): DailyUsage {
  return {
    dayKey,
    counts: {
      level_1: 0,
      level_2: 0,
    },
  };
}

function readUsage(): DailyUsage {
  const dayKey = getDayKey();
  if (typeof window === 'undefined') {
    return getDefaultUsage(dayKey);
  }

  const raw = window.localStorage.getItem(AI_QUOTA_STORAGE_KEY);
  if (!raw) return getDefaultUsage(dayKey);

  try {
    const parsed = JSON.parse(raw) as DailyUsage;
    if (!parsed || parsed.dayKey !== dayKey) {
      return getDefaultUsage(dayKey);
    }
    return {
      dayKey: parsed.dayKey,
      counts: {
        level_1: parsed.counts?.level_1 ?? 0,
        level_2: parsed.counts?.level_2 ?? 0,
      },
    };
  } catch {
    return getDefaultUsage(dayKey);
  }
}

function writeUsage(usage: DailyUsage): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AI_QUOTA_STORAGE_KEY, JSON.stringify(usage));
}

export function resolveAiEntitlement(task: AiTaskKey, apiKeyPresent: boolean): AiEntitlementDecision {
  if (!apiKeyPresent) {
    return {
      mode: 'fallback',
      allowed: false,
      model: null,
      reason: 'No API key configured',
      quotaRemaining: null,
    };
  }

  const tier = (import.meta.env.VITE_AI_TIER ?? '').toString().trim().toLowerCase();
  if (tier === 'premium') {
    return {
      mode: 'premium',
      allowed: true,
      model: resolveModelForAiTask(task, 'premium'),
      reason: 'Premium entitlement',
      quotaRemaining: null,
    };
  }

  const level = getAiTaskLevel(task);
  const usage = readUsage();
  const limit = FREE_DAILY_LIMIT[level];
  const used = usage.counts[level];

  if (used >= limit) {
    return {
      mode: 'fallback',
      allowed: false,
      model: null,
      reason: `Free quota exhausted for ${level}`,
      quotaRemaining: 0,
    };
  }

  usage.counts[level] += 1;
  writeUsage(usage);

  return {
    mode: 'free_quota',
    allowed: true,
    model: resolveModelForAiTask(task, 'free'),
    reason: 'Free quota available',
    quotaRemaining: Math.max(0, limit - usage.counts[level]),
  };
}
