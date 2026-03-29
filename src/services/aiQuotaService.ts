import type { AiCostLevel } from './aiTaskRouting';

type DailyUsage = {
  dayKey: string;
  counts: Record<AiCostLevel, number>;
};

type SessionUsage = {
  sessionKey: string;
  counts: Record<AiCostLevel, number>;
};

const AI_DAILY_QUOTA_STORAGE_KEY = 'lifegoal_ai_quota_usage_v2';
const AI_SESSION_QUOTA_STORAGE_KEY = 'lifegoal_ai_session_quota_usage_v1';
const AI_SESSION_ID_STORAGE_KEY = 'lifegoal_ai_session_id_v1';

const FREE_DAILY_LIMIT: Record<AiCostLevel, number> = {
  level_1: 60,
  level_2: 12,
};

const FREE_SESSION_LIMIT: Record<AiCostLevel, number> = {
  level_1: 18,
  level_2: 4,
};

function getDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function defaultCounts(): Record<AiCostLevel, number> {
  return { level_1: 0, level_2: 0 };
}

function getSessionKey(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = window.sessionStorage.getItem(AI_SESSION_ID_STORAGE_KEY);
  if (existing) return existing;
  const created = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  window.sessionStorage.setItem(AI_SESSION_ID_STORAGE_KEY, created);
  return created;
}

function readDailyUsage(): DailyUsage {
  const dayKey = getDayKey();
  if (typeof window === 'undefined') return { dayKey, counts: defaultCounts() };
  const raw = window.localStorage.getItem(AI_DAILY_QUOTA_STORAGE_KEY);
  if (!raw) return { dayKey, counts: defaultCounts() };
  try {
    const parsed = JSON.parse(raw) as DailyUsage;
    if (!parsed || parsed.dayKey !== dayKey) return { dayKey, counts: defaultCounts() };
    return {
      dayKey,
      counts: {
        level_1: parsed.counts?.level_1 ?? 0,
        level_2: parsed.counts?.level_2 ?? 0,
      },
    };
  } catch {
    return { dayKey, counts: defaultCounts() };
  }
}

function writeDailyUsage(usage: DailyUsage): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AI_DAILY_QUOTA_STORAGE_KEY, JSON.stringify(usage));
}

function readSessionUsage(): SessionUsage {
  const sessionKey = getSessionKey();
  if (typeof window === 'undefined') return { sessionKey, counts: defaultCounts() };
  const raw = window.sessionStorage.getItem(AI_SESSION_QUOTA_STORAGE_KEY);
  if (!raw) return { sessionKey, counts: defaultCounts() };
  try {
    const parsed = JSON.parse(raw) as SessionUsage;
    if (!parsed || parsed.sessionKey !== sessionKey) return { sessionKey, counts: defaultCounts() };
    return {
      sessionKey,
      counts: {
        level_1: parsed.counts?.level_1 ?? 0,
        level_2: parsed.counts?.level_2 ?? 0,
      },
    };
  } catch {
    return { sessionKey, counts: defaultCounts() };
  }
}

function writeSessionUsage(usage: SessionUsage): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(AI_SESSION_QUOTA_STORAGE_KEY, JSON.stringify(usage));
}

export type AiQuotaSnapshot = {
  level: AiCostLevel;
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  sessionUsed: number;
  sessionLimit: number;
  sessionRemaining: number;
};

export function getQuotaSnapshot(level: AiCostLevel): AiQuotaSnapshot {
  const daily = readDailyUsage();
  const session = readSessionUsage();
  const dailyLimit = FREE_DAILY_LIMIT[level];
  const sessionLimit = FREE_SESSION_LIMIT[level];
  const dailyUsed = daily.counts[level];
  const sessionUsed = session.counts[level];
  return {
    level,
    dailyUsed,
    dailyLimit,
    dailyRemaining: Math.max(0, dailyLimit - dailyUsed),
    sessionUsed,
    sessionLimit,
    sessionRemaining: Math.max(0, sessionLimit - sessionUsed),
  };
}

export function consumeQuota(level: AiCostLevel): AiQuotaSnapshot {
  const daily = readDailyUsage();
  const session = readSessionUsage();
  daily.counts[level] += 1;
  session.counts[level] += 1;
  writeDailyUsage(daily);
  writeSessionUsage(session);
  return getQuotaSnapshot(level);
}

