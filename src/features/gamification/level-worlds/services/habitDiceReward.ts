/**
 * Habit check-ins pay dice (user decision 2026-10-03: Gold is retired, real
 * life feeds the game). A habit that is struggling pays more than one that is
 * already easy, reusing the habit's existing 5–85 reward value.
 *
 * Once per habit per local day, recorded in the signature mission ledger so
 * the claim syncs with the save and cannot be repeated by toggling a habit
 * off and on, or from a second device.
 */

export const HABIT_DICE_KEY = 'habit-dice';
export const HABIT_DICE_MIN = 5;
export const HABIT_DICE_MAX = 15;
/** Daily safety cap on paid check-ins (normal days stay well below it). */
export const HABIT_DICE_DAILY_CAP = 12;

const HABIT_REWARD_VALUE_MIN = 5;
const HABIT_REWARD_VALUE_MAX = 85;

export interface HabitDiceLedger {
  missionId: 'habit-dice';
  version: 1;
  /** Local date (YYYY-MM-DD) the claims belong to. */
  dateKey: string;
  claimedHabitIds: string[];
  updatedAtMs: number;
}

/** Maps a habit's 5–85 reward value onto 5–15 dice. */
export function habitDiceForRewardValue(rewardValue: number): number {
  const value = Number.isFinite(rewardValue) ? rewardValue : HABIT_REWARD_VALUE_MIN;
  const t = (Math.min(HABIT_REWARD_VALUE_MAX, Math.max(HABIT_REWARD_VALUE_MIN, value)) - HABIT_REWARD_VALUE_MIN)
    / (HABIT_REWARD_VALUE_MAX - HABIT_REWARD_VALUE_MIN);
  return Math.round(HABIT_DICE_MIN + t * (HABIT_DICE_MAX - HABIT_DICE_MIN));
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeHabitDiceLedger(value: unknown): HabitDiceLedger | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.missionId !== 'habit-dice' || record.version !== 1) return null;
  if (typeof record.dateKey !== 'string' || !DATE_KEY.test(record.dateKey)) return null;
  const ids = Array.isArray(record.claimedHabitIds)
    ? [...new Set(record.claimedHabitIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 128))]
    : [];
  const updatedAtMs = typeof record.updatedAtMs === 'number' && Number.isFinite(record.updatedAtMs) ? record.updatedAtMs : 0;
  return { missionId: 'habit-dice', version: 1, dateKey: record.dateKey, claimedHabitIds: ids.slice(0, 200), updatedAtMs };
}

/** The later day wins; the same day keeps every claim from both sides. */
export function mergeHabitDiceLedger(a: unknown, b: unknown): HabitDiceLedger | null {
  const left = sanitizeHabitDiceLedger(a);
  const right = sanitizeHabitDiceLedger(b);
  if (!left) return right;
  if (!right) return left;
  if (left.dateKey !== right.dateKey) return left.dateKey > right.dateKey ? left : right;
  return {
    ...left,
    claimedHabitIds: [...new Set([...left.claimedHabitIds, ...right.claimedHabitIds])].slice(0, 200),
    updatedAtMs: Math.max(left.updatedAtMs, right.updatedAtMs),
  };
}

export type HabitDiceClaimDecision =
  | { ok: true; ledger: HabitDiceLedger; dice: number }
  | { ok: false; reason: 'already_claimed' | 'daily_cap' | 'invalid' };

/** Pure claim rule: once per habit per day, at most HABIT_DICE_DAILY_CAP per day. */
export function decideHabitDiceClaim(options: {
  ledger: unknown;
  habitId: string;
  dateKey: string;
  rewardValue: number;
  nowMs: number;
}): HabitDiceClaimDecision {
  if (!options.habitId || !DATE_KEY.test(options.dateKey)) return { ok: false, reason: 'invalid' };
  const existing = sanitizeHabitDiceLedger(options.ledger);
  const today = existing && existing.dateKey === options.dateKey ? existing.claimedHabitIds : [];
  if (today.includes(options.habitId)) return { ok: false, reason: 'already_claimed' };
  if (today.length >= HABIT_DICE_DAILY_CAP) return { ok: false, reason: 'daily_cap' };
  return {
    ok: true,
    dice: habitDiceForRewardValue(options.rewardValue),
    ledger: {
      missionId: 'habit-dice',
      version: 1,
      dateKey: options.dateKey,
      claimedHabitIds: [...today, options.habitId],
      updatedAtMs: Math.max(options.nowMs, (existing?.updatedAtMs ?? 0) + 1),
    },
  };
}
