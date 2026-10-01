import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import {
  STOP_UPGRADE_BASE_COSTS,
  getEffectiveIslandNumber,
  getIslandEssenceMultiplier,
  resolveBuildSpendStepForTier,
} from './islandRunContractV2EssenceBuild';
import { MAX_BUILD_LEVEL } from './islandRunBuildConstants';
import { usesOpeningGamesCampaign } from './islandRunOpeningGames';

/**
 * Island 002 Opening Arena mission (user request 2026-09-30, new campaign).
 *
 * 1. Order the Opening Arena hover base (a massive flying construction plot)
 *    from the Mission Phone.
 * 2. Play on: after {@link OPENING_ARENA_DELIVERY_ROLLS} rolls the hover base is
 *    towed in and anchored beside the island, carrying its steel construction.
 * 3. Build the arena on it with cash in its own build modal, three levels like
 *    a landmark.
 * The golden sky lift (the centre landmark) and the Crystal Miners drop zones
 * are presentation around it. The Stormfront waits for the finished arena.
 *
 * Pure rules; canonical, mutex-protected actions live in
 * `island2OpeningArenaActions.ts`. Presentation never writes.
 */

export const OPENING_ARENA_ISLAND_NUMBER = 2;
export const OPENING_ARENA_DELIVERY_ROLLS = 3;
/** The arena is the size of a small island: it costs more than a landmark. */
export const OPENING_ARENA_COST_SCALE = 2.5;
export const OPENING_ARENA_KEY_PATTERN = /^(0|[1-9]\d*):2:opening-arena$/;
export const OPENING_ARENA_SEAT_COUNT = 5000;
export const SKY_LIFT_CAPACITY = 200;

export interface OpeningArenaProgress {
  missionId: 'island2-opening-arena';
  version: 1;
  orderedAtMs: number | null;
  /** Rolls left until the hover base is towed in (after ordering). */
  rollsUntilDelivery: number;
  /** When the hover base was anchored to the island (after its arrival played). */
  anchoredAtMs: number | null;
  arenaLevel: number;
  /** Money funded towards the arena's next level. */
  spentTowardLevel: number;
  essenceSpent: number;
  completedAtMs: number | null;
  updatedAtMs: number;
}

export function getOpeningArenaKey(cycleIndex: number): string {
  return `${Math.max(0, Math.floor(cycleIndex))}:2:opening-arena`;
}

export function createOpeningArenaProgress(): OpeningArenaProgress {
  return {
    missionId: 'island2-opening-arena',
    version: 1,
    orderedAtMs: null,
    rollsUntilDelivery: 0,
    anchoredAtMs: null,
    arenaLevel: 0,
    spentTowardLevel: 0,
    essenceSpent: 0,
    completedAtMs: null,
    updatedAtMs: 0,
  };
}

const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
const stamp = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);
const earliest = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.min(a, b));

export function sanitizeOpeningArenaProgress(value: unknown): OpeningArenaProgress {
  const base = createOpeningArenaProgress();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const record = value as Record<string, unknown>;
  const progress: OpeningArenaProgress = {
    ...base,
    orderedAtMs: stamp(record.orderedAtMs),
    rollsUntilDelivery: Math.min(OPENING_ARENA_DELIVERY_ROLLS, count(record.rollsUntilDelivery)),
    anchoredAtMs: stamp(record.anchoredAtMs),
    arenaLevel: Math.min(MAX_BUILD_LEVEL, count(record.arenaLevel)),
    spentTowardLevel: count(record.spentTowardLevel),
    essenceSpent: count(record.essenceSpent),
    completedAtMs: stamp(record.completedAtMs),
    updatedAtMs: count(record.updatedAtMs),
  };
  // Each step needs the one before it: order → delivery → anchor → build.
  if (progress.orderedAtMs === null) return { ...base, updatedAtMs: progress.updatedAtMs };
  if (progress.rollsUntilDelivery > 0) progress.anchoredAtMs = null;
  if (progress.anchoredAtMs === null) {
    progress.arenaLevel = 0;
    progress.spentTowardLevel = 0;
  }
  if (progress.arenaLevel < MAX_BUILD_LEVEL) progress.completedAtMs = null;
  else progress.spentTowardLevel = 0;
  return progress;
}

/** Devices merge on the furthest progress. */
export function mergeOpeningArenaProgress(a: OpeningArenaProgress, b: OpeningArenaProgress): OpeningArenaProgress {
  const buildKey = (p: OpeningArenaProgress) => p.arenaLevel * 1e9 + p.spentTowardLevel;
  const built = buildKey(a) >= buildKey(b) ? a : b;
  // The countdown only exists once ordered; the device further along wins.
  const pendingRolls = [a, b].filter((p) => p.orderedAtMs !== null).map((p) => p.rollsUntilDelivery);
  return sanitizeOpeningArenaProgress({
    ...a,
    orderedAtMs: earliest(a.orderedAtMs, b.orderedAtMs),
    rollsUntilDelivery: pendingRolls.length > 0 ? Math.min(...pendingRolls) : 0,
    anchoredAtMs: earliest(a.anchoredAtMs, b.anchoredAtMs),
    arenaLevel: built.arenaLevel,
    spentTowardLevel: built.spentTowardLevel,
    essenceSpent: Math.max(a.essenceSpent, b.essenceSpent),
    completedAtMs: earliest(a.completedAtMs, b.completedAtMs),
    updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
  });
}

export function resolveOpeningArenaProgress(ledger: Readonly<Record<string, unknown>> | null | undefined, cycleIndex: number): OpeningArenaProgress {
  return sanitizeOpeningArenaProgress(ledger?.[getOpeningArenaKey(cycleIndex)]);
}

type ArenaState = Pick<IslandRunGameStateRecord, 'currentIslandNumber' | 'signatureMissionProgressByIsland'>;

/** The mission runs on new-campaign Island 002 only. */
export function isOpeningArenaAvailable(state: ArenaState): boolean {
  return state.currentIslandNumber === OPENING_ARENA_ISLAND_NUMBER
    && usesOpeningGamesCampaign(state.signatureMissionProgressByIsland ?? {});
}

export type OpeningArenaStage = 'order' | 'in_transit' | 'arriving' | 'building' | 'complete';

export function resolveOpeningArenaStage(progress: OpeningArenaProgress): OpeningArenaStage {
  if (progress.orderedAtMs === null) return 'order';
  if (progress.rollsUntilDelivery > 0) return 'in_transit';
  if (progress.anchoredAtMs === null) return 'arriving';
  return progress.arenaLevel >= MAX_BUILD_LEVEL ? 'complete' : 'building';
}

export function isOpeningArenaComplete(progress: OpeningArenaProgress): boolean {
  return resolveOpeningArenaStage(progress) === 'complete';
}

export function applyOpeningArenaOrder(progress: OpeningArenaProgress, nowMs: number): OpeningArenaProgress {
  if (progress.orderedAtMs !== null) return progress;
  return { ...progress, orderedAtMs: nowMs, rollsUntilDelivery: OPENING_ARENA_DELIVERY_ROLLS, updatedAtMs: nowMs };
}

/** One roll on Island 002 brings the ordered hover base closer. */
export function applyOpeningArenaRoll<T extends Record<string, unknown>>(ledger: T, cycleIndex: number, islandNumber: number, nowMs: number): T {
  if (islandNumber !== OPENING_ARENA_ISLAND_NUMBER) return ledger;
  const key = getOpeningArenaKey(cycleIndex);
  if (!(key in ledger)) return ledger;
  const current = sanitizeOpeningArenaProgress(ledger[key]);
  if (current.orderedAtMs === null || current.rollsUntilDelivery <= 0) return ledger;
  return { ...ledger, [key]: { ...current, rollsUntilDelivery: current.rollsUntilDelivery - 1, updatedAtMs: nowMs } };
}

export function applyOpeningArenaAnchor(progress: OpeningArenaProgress, nowMs: number): OpeningArenaProgress {
  if (resolveOpeningArenaStage(progress) !== 'arriving') return progress;
  return { ...progress, anchoredAtMs: nowMs, updatedAtMs: nowMs };
}

/** Money to raise the arena from `currentLevel` to the next level. */
export function getOpeningArenaLevelCost(options: { currentLevel: number; islandNumber: number; cycleIndex: number }): number {
  const base = STOP_UPGRADE_BASE_COSTS[Math.min(Math.max(0, Math.floor(options.currentLevel)), STOP_UPGRADE_BASE_COSTS.length - 1)] ?? 300;
  const multiplier = getIslandEssenceMultiplier(getEffectiveIslandNumber(options.islandNumber, options.cycleIndex));
  return Math.max(1, Math.floor(base * OPENING_ARENA_COST_SCALE * multiplier));
}

export type OpeningArenaFundResult =
  | { status: 'ok'; progress: OpeningArenaProgress; spent: number; leveledUp: boolean; money: number }
  | { status: 'not_anchored' | 'already_complete' | 'insufficient_money' | 'wrong_island'; progress: OpeningArenaProgress; spent: 0; leveledUp: false; money: number };

/** One hold step of money on the arena (like landmark hold-to-build). */
export function applyOpeningArenaFundStep(options: {
  progress: OpeningArenaProgress;
  islandNumber: number;
  cycleIndex: number;
  money: number;
  nowMs: number;
}): OpeningArenaFundResult {
  const { progress, islandNumber, cycleIndex, nowMs } = options;
  const money = Math.max(0, Math.floor(Number.isFinite(options.money) ? options.money : 0));
  const fail = (status: Exclude<OpeningArenaFundResult['status'], 'ok'>) => ({ status, progress, spent: 0 as const, leveledUp: false as const, money });
  if (islandNumber !== OPENING_ARENA_ISLAND_NUMBER) return fail('wrong_island');
  const stage = resolveOpeningArenaStage(progress);
  if (stage === 'complete') return fail('already_complete');
  if (stage !== 'building') return fail('not_anchored');
  const required = getOpeningArenaLevelCost({ currentLevel: progress.arenaLevel, islandNumber, cycleIndex });
  const remaining = Math.max(0, required - progress.spentTowardLevel);
  const step = Math.min(remaining, resolveBuildSpendStepForTier(required), money);
  if (step < 1) return fail('insufficient_money');
  const funded = progress.spentTowardLevel + step;
  const leveledUp = funded >= required;
  const arenaLevel = leveledUp ? progress.arenaLevel + 1 : progress.arenaLevel;
  const next: OpeningArenaProgress = {
    ...progress,
    arenaLevel,
    spentTowardLevel: leveledUp ? 0 : funded,
    essenceSpent: progress.essenceSpent + step,
    completedAtMs: arenaLevel >= MAX_BUILD_LEVEL ? progress.completedAtMs ?? nowMs : null,
    updatedAtMs: nowMs,
  };
  return { status: 'ok', progress: next, spent: step, leveledUp, money: money - step };
}

/** Completion value on Island 002: ordered + delivered + anchored + 3 levels. */
export function resolveOpeningArenaCompletionValue(progress: OpeningArenaProgress): { value: number; target: number } {
  const target = 2 + MAX_BUILD_LEVEL;
  const stage = resolveOpeningArenaStage(progress);
  if (stage === 'order' || stage === 'in_transit' || stage === 'arriving') return { value: stage === 'order' ? 0 : 1, target };
  return { value: 2 + progress.arenaLevel, target };
}
