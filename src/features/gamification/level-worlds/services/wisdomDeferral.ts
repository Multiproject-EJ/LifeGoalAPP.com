import { COMPASS_BOOK_ACTIVITIES, getActivityForIsland } from '../../../compass-book/content/compassBookCurriculum';

/**
 * Wisdom stop "Come back later" (user request 2026-09-30).
 *
 * Pressing it closes the stop for {@link WISDOM_DEFERRAL_ROLLS} rolls. When the
 * stop opens again it asks a different question from a pool of
 * {@link WISDOM_PROMPT_POOL_SIZE} Compass prompts: the island's own activity
 * first, then the next ones in curriculum order, skipping answered ones.
 * Island 001's First Signal is fixed and never rotates.
 *
 * Stored in the canonical mission ledger under `${cycle}:${island}:wisdom-deferral`.
 */

export const WISDOM_DEFERRAL_ROLLS = 3;
export const WISDOM_PROMPT_POOL_SIZE = 5;
export const WISDOM_DEFERRAL_KEY_PATTERN = /^(0|[1-9]\d*):([1-9]\d*):wisdom-deferral$/;

export interface WisdomDeferral {
  missionId: 'wisdom-deferral';
  version: 1;
  /** How many times the player chose "Come back later" on this visit. */
  deferrals: number;
  /** Rolls left before the Wisdom stop can open again. */
  rollsRemaining: number;
  updatedAtMs: number;
}

export function getWisdomDeferralKey(cycleIndex: number, islandNumber: number): string {
  return `${Math.max(0, Math.floor(cycleIndex))}:${Math.max(1, Math.floor(islandNumber))}:wisdom-deferral`;
}

const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);

export function createWisdomDeferral(): WisdomDeferral {
  return { missionId: 'wisdom-deferral', version: 1, deferrals: 0, rollsRemaining: 0, updatedAtMs: 0 };
}

export function sanitizeWisdomDeferral(value: unknown): WisdomDeferral {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createWisdomDeferral();
  const record = value as Record<string, unknown>;
  return {
    missionId: 'wisdom-deferral',
    version: 1,
    deferrals: count(record.deferrals),
    rollsRemaining: Math.min(WISDOM_DEFERRAL_ROLLS, count(record.rollsRemaining)),
    updatedAtMs: count(record.updatedAtMs),
  };
}

/** Devices merge on the newest deferral; within one deferral the lower countdown wins. */
export function mergeWisdomDeferral(a: WisdomDeferral, b: WisdomDeferral): WisdomDeferral {
  if (a.deferrals !== b.deferrals) return a.deferrals > b.deferrals ? a : b;
  return a.rollsRemaining <= b.rollsRemaining ? a : b;
}

export function resolveWisdomDeferral(
  ledger: Readonly<Record<string, unknown>> | null | undefined,
  cycleIndex: number,
  islandNumber: number,
): WisdomDeferral {
  return sanitizeWisdomDeferral(ledger?.[getWisdomDeferralKey(cycleIndex, islandNumber)]);
}

export function applyWisdomDeferral(current: WisdomDeferral, nowMs: number): WisdomDeferral {
  return { ...current, deferrals: current.deferrals + 1, rollsRemaining: WISDOM_DEFERRAL_ROLLS, updatedAtMs: nowMs };
}

/** One roll on the island counts the cooldown down (no entry, no change). */
export function applyWisdomDeferralRoll<T extends Record<string, unknown>>(
  ledger: T,
  cycleIndex: number,
  islandNumber: number,
  nowMs: number,
): T {
  const key = getWisdomDeferralKey(cycleIndex, islandNumber);
  if (!(key in ledger)) return ledger;
  const current = sanitizeWisdomDeferral(ledger[key]);
  if (current.rollsRemaining <= 0) return ledger;
  return { ...ledger, [key]: { ...current, rollsRemaining: current.rollsRemaining - 1, updatedAtMs: nowMs } };
}

/** The Compass prompts this island's Wisdom stop can ask, own activity first. */
export function resolveWisdomPromptPool(islandNumber: number): string[] {
  const own = getActivityForIsland(islandNumber);
  if (!own) return [];
  if (islandNumber === 1) return [own.id];
  const start = COMPASS_BOOK_ACTIVITIES.findIndex((activity) => activity.id === own.id);
  const pool: string[] = [];
  for (let offset = 0; offset < COMPASS_BOOK_ACTIVITIES.length && pool.length < WISDOM_PROMPT_POOL_SIZE; offset += 1) {
    const activity = COMPASS_BOOK_ACTIVITIES[(start + offset) % COMPASS_BOOK_ACTIVITIES.length];
    if (activity.islandNumber !== 1) pool.push(activity.id);
  }
  return pool;
}

/**
 * The prompt the Wisdom stop asks now: rotates one step per "Come back later",
 * skipping prompts already answered (falls back to the rotation if all are).
 */
export function resolveWisdomPromptActivityId(options: {
  islandNumber: number;
  deferrals: number;
  isAnswered?: (activityId: string) => boolean;
}): string | null {
  const pool = resolveWisdomPromptPool(options.islandNumber);
  if (pool.length === 0) return null;
  const start = options.deferrals % pool.length;
  for (let step = 0; step < pool.length; step += 1) {
    const candidate = pool[(start + step) % pool.length];
    if (!options.isAnswered?.(candidate)) return candidate;
  }
  return pool[start];
}
