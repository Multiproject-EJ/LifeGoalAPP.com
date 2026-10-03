import type { IslandRunGameStateRecord, PerIslandEggsLedger } from './islandRunGameStateStore';

/**
 * Real-life effort warms the egg (user decision 2026-10-03): a habit check-in,
 * a Compass Book answer or the first visit of the day brings all incubating
 * eggs closer to hatching. Before the life app opens there are no habits, so
 * Compass answers and daily visits carry the warmth. Each source warms once
 * per day and all sources share HABIT_EGG_WARMTH_DAILY_CAP, so effort speeds
 * hatching without skipping the wait entirely.
 */

const HOUR_MS = 60 * 60 * 1000;
export const HABIT_EGG_WARMTH_MS = 2 * HOUR_MS;
export const HABIT_EGG_WARMTH_DAILY_CAP = 3;

export interface WarmIncubatingEggsResult {
  record: IslandRunGameStateRecord;
  warmedCount: number;
  /** Eggs that became ready because of this warmth. */
  readyCount: number;
  /** Earliest hatch time still in the future after warming, if any. */
  nextHatchAtMs: number | null;
}

function isWarmable(entry: PerIslandEggsLedger[string], nowMs: number): boolean {
  return entry.status === 'incubating' && Number.isFinite(entry.hatchAtMs) && entry.hatchAtMs > nowMs;
}

export function countWarmableEggs(record: Pick<IslandRunGameStateRecord, 'perIslandEggs'>, nowMs: number): number {
  return Object.values(record.perIslandEggs ?? {}).filter((entry) => isWarmable(entry, nowMs)).length;
}

/**
 * Pure: pull every incubating egg's hatch time `warmMs` earlier (never before
 * now). An egg that reaches now becomes ready. The active-egg mirror fields
 * move by the same amount so the board timer agrees with the ledger.
 */
export function warmIncubatingEggs(record: IslandRunGameStateRecord, warmMs: number, nowMs: number): WarmIncubatingEggsResult {
  const safeWarmMs = Number.isFinite(warmMs) ? Math.max(0, Math.floor(warmMs)) : 0;
  const ledger = record.perIslandEggs ?? {};
  let warmedCount = 0;
  let readyCount = 0;
  let nextHatchAtMs: number | null = null;
  const nextLedger: PerIslandEggsLedger = { ...ledger };
  Object.entries(ledger).forEach(([key, entry]) => {
    if (safeWarmMs <= 0 || !isWarmable(entry, nowMs)) return;
    const hatchAtMs = Math.max(nowMs, entry.hatchAtMs - safeWarmMs);
    const ready = hatchAtMs <= nowMs;
    nextLedger[key] = { ...entry, hatchAtMs, status: ready ? 'ready' : 'incubating' };
    warmedCount += 1;
    if (ready) readyCount += 1;
    else if (nextHatchAtMs === null || hatchAtMs < nextHatchAtMs) nextHatchAtMs = hatchAtMs;
  });
  if (warmedCount === 0) return { record, warmedCount, readyCount, nextHatchAtMs };

  let activeEggHatchDurationMs = record.activeEggHatchDurationMs;
  if (record.activeEggTier !== null && Number.isFinite(record.activeEggSetAtMs) && Number.isFinite(activeEggHatchDurationMs)) {
    const setAtMs = record.activeEggSetAtMs as number;
    const duration = activeEggHatchDurationMs as number;
    if (setAtMs + duration > nowMs) {
      activeEggHatchDurationMs = Math.max(nowMs - setAtMs, duration - safeWarmMs, 0);
    }
  }

  return {
    record: { ...record, perIslandEggs: nextLedger, activeEggHatchDurationMs, runtimeVersion: record.runtimeVersion + 1 },
    warmedCount,
    readyCount,
    nextHatchAtMs,
  };
}

export interface HabitEggWarmthStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function ledgerKey(userId: string, dateISO: string): string {
  return `lifegoal:habit-egg-warmth:${userId}:${dateISO}`;
}

function readWarmedHabitIds(storage: HabitEggWarmthStorage, userId: string, dateISO: string): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(ledgerKey(userId, dateISO)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export type EggWarmthSource = `habit:${string}` | `compass:${string}` | `task:${string}` | 'daily-visit';

export function habitWarmthSource(habitId: string): EggWarmthSource {
  return `habit:${habitId}`;
}

/** Whether this source may still warm eggs today (not used yet, cap not reached). */
export function canHabitWarmEggsToday(storage: HabitEggWarmthStorage, userId: string, source: string, dateISO: string): boolean {
  const warmed = readWarmedHabitIds(storage, userId, dateISO);
  return !warmed.includes(source) && warmed.length < HABIT_EGG_WARMTH_DAILY_CAP;
}

export function recordHabitEggWarmth(storage: HabitEggWarmthStorage, userId: string, source: string, dateISO: string): number {
  const warmed = readWarmedHabitIds(storage, userId, dateISO);
  if (!warmed.includes(source)) warmed.push(source);
  try {
    storage.setItem(ledgerKey(userId, dateISO), JSON.stringify(warmed));
  } catch {
    // Storage full or blocked: the warmth still applied, the cap just cannot persist.
  }
  return warmed.length;
}

const SOURCE_LEAD: Record<'habit' | 'compass' | 'task' | 'visit', string> = {
  habit: 'Habit done!',
  task: 'Must-do done!',
  compass: 'Thanks for sharing!',
  visit: 'Welcome back!',
};

export function formatHabitEggWarmthNotice(
  result: { warmedCount: number; readyCount: number },
  warmthsUsedToday: number,
  kind: 'habit' | 'compass' | 'task' | 'visit' = 'habit',
): string {
  const hours = Math.round(HABIT_EGG_WARMTH_MS / HOUR_MS);
  const eggs = result.warmedCount === 1 ? 'Your egg' : `Your ${result.warmedCount} eggs`;
  const left = Math.max(0, HABIT_EGG_WARMTH_DAILY_CAP - warmthsUsedToday);
  const ready = result.readyCount > 0
    ? ` ${result.readyCount === 1 ? 'One is' : `${result.readyCount} are`} ready to hatch!`
    : '';
  const tail = left > 0 ? ` (${left} more today)` : ' (max warmth today)';
  return `🔥 ${SOURCE_LEAD[kind]} ${eggs} got ${hours}h warmer.${ready}${tail}`;
}
