import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import {
  STOP_UPGRADE_BASE_COSTS,
  getEffectiveIslandNumber,
  getIslandEssenceMultiplier,
  getStopUpgradeCost,
  resolveBuildSpendStepForTier,
} from './islandRunContractV2EssenceBuild';
import { MAX_BUILD_LEVEL } from './islandRunBuildConstants';
import { usesOpeningGamesCampaign } from './islandRunOpeningGames';

/**
 * Island 002 Stormfront (user request 2026-09-30).
 *
 * When every Island 002 landmark reaches Level 3, a storm rolls in: a
 * cascading lightning wave approaches and stops, the rain clears, and then a
 * massive strike hits the centre of the island. The four outer landmarks each
 * lose their top level (Level 3 → Level 2) and must be rebuilt. An add-on
 * mission asks the player to build two storm-safe structures, like landmarks
 * (three funded levels each):
 * - the Storm-Safe Lightning Grid (rods + grounding ring around the island);
 * - the Covered Sky Hangar (a covered landing strip where the Event Arena
 *   planes take off and are stored).
 * Island 002 clears only after the strike, the rebuild (ordinary landmark
 * rule) and both structures at Level 3.
 *
 * Pure rules: canonical, mutex-protected actions in
 * `island2StormfrontActions.ts` commit the results. Presentation never writes.
 */

export const STORMFRONT_ISLAND_NUMBER = 2;
/** The four outer landmarks lose a level; the central Boss/Arena is spared. */
export const STORMFRONT_DAMAGED_STOP_INDICES: readonly number[] = [0, 1, 2, 3];
export const STORMFRONT_LANDMARK_COUNT = 5;

/** Own ledger key per journey cycle (Island 002's mission key is taken). */
export function getStormfrontKey(cycleIndex: number): string {
  return `${Math.max(0, Math.floor(cycleIndex))}:2:stormfront`;
}
export const STORMFRONT_KEY_PATTERN = /^(0|[1-9]\d*):2:stormfront$/;

export function resolveStormfrontProgress(ledger: Readonly<Record<string, unknown>> | null | undefined, cycleIndex: number): StormfrontProgress {
  return sanitizeStormfrontProgress(ledger?.[getStormfrontKey(cycleIndex)]);
}

export type StormfrontStructureId = 'lightning-grid' | 'sky-hangar';

export const STORMFRONT_STRUCTURES: ReadonlyArray<{ id: StormfrontStructureId; title: string; blurb: string; costScale: number }> = [
  {
    id: 'lightning-grid',
    title: 'Storm-Safe Lightning Grid',
    blurb: 'Lightning rods and a grounding ring that catch every strike before it reaches the landmarks.',
    costScale: 1.6,
  },
  {
    id: 'sky-hangar',
    title: 'Covered Sky Hangar',
    blurb: 'A covered landing strip where the Event Arena planes take off and are stored safe from storms.',
    costScale: 2,
  },
];

export interface StormfrontProgress {
  missionId: 'island2-stormfront';
  version: 1;
  /** When the lightning strike was committed (landmarks lost a level). */
  struckAtMs: number | null;
  /** When the player finished watching the storm (presentation bookkeeping only). */
  cinematicSeenAtMs: number | null;
  levels: Record<StormfrontStructureId, number>;
  /** Money funded towards each structure's next level. */
  spentTowardLevel: Record<StormfrontStructureId, number>;
  essenceSpent: number;
  completedAtMs: number | null;
  updatedAtMs: number;
}

export function createStormfrontProgress(): StormfrontProgress {
  return {
    missionId: 'island2-stormfront',
    version: 1,
    struckAtMs: null,
    cinematicSeenAtMs: null,
    levels: { 'lightning-grid': 0, 'sky-hangar': 0 },
    spentTowardLevel: { 'lightning-grid': 0, 'sky-hangar': 0 },
    essenceSpent: 0,
    completedAtMs: null,
    updatedAtMs: 0,
  };
}

const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
const stamp = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);
const level = (value: unknown) => Math.min(MAX_BUILD_LEVEL, count(value));
const earliest = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.min(a, b));

export function isStormfrontStructureId(value: unknown): value is StormfrontStructureId {
  return value === 'lightning-grid' || value === 'sky-hangar';
}

export function sanitizeStormfrontProgress(value: unknown): StormfrontProgress {
  const base = createStormfrontProgress();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const record = value as Record<string, unknown>;
  const levels = (record.levels && typeof record.levels === 'object' ? record.levels : {}) as Record<string, unknown>;
  const spent = (record.spentTowardLevel && typeof record.spentTowardLevel === 'object' ? record.spentTowardLevel : {}) as Record<string, unknown>;
  const progress: StormfrontProgress = {
    ...base,
    struckAtMs: stamp(record.struckAtMs),
    cinematicSeenAtMs: stamp(record.cinematicSeenAtMs),
    levels: { 'lightning-grid': level(levels['lightning-grid']), 'sky-hangar': level(levels['sky-hangar']) },
    spentTowardLevel: { 'lightning-grid': count(spent['lightning-grid']), 'sky-hangar': count(spent['sky-hangar']) },
    essenceSpent: count(record.essenceSpent),
    completedAtMs: stamp(record.completedAtMs),
    updatedAtMs: count(record.updatedAtMs),
  };
  // Structures can only be built after the strike; completion needs both at Level 3.
  if (progress.struckAtMs === null) {
    progress.levels = { ...base.levels };
    progress.spentTowardLevel = { ...base.spentTowardLevel };
    progress.completedAtMs = null;
  } else if (!isStormfrontStructuresComplete(progress)) {
    progress.completedAtMs = null;
  }
  return progress;
}

/** Devices merge by keeping the furthest progress on each structure. */
export function mergeStormfrontProgress(a: StormfrontProgress, b: StormfrontProgress): StormfrontProgress {
  const pick = (id: StormfrontStructureId) => {
    const aKey = a.levels[id] * 1e9 + a.spentTowardLevel[id];
    const bKey = b.levels[id] * 1e9 + b.spentTowardLevel[id];
    return aKey >= bKey ? a : b;
  };
  const grid = pick('lightning-grid');
  const hangar = pick('sky-hangar');
  return sanitizeStormfrontProgress({
    ...a,
    struckAtMs: earliest(a.struckAtMs, b.struckAtMs),
    cinematicSeenAtMs: earliest(a.cinematicSeenAtMs, b.cinematicSeenAtMs),
    levels: { 'lightning-grid': grid.levels['lightning-grid'], 'sky-hangar': hangar.levels['sky-hangar'] },
    spentTowardLevel: { 'lightning-grid': grid.spentTowardLevel['lightning-grid'], 'sky-hangar': hangar.spentTowardLevel['sky-hangar'] },
    essenceSpent: Math.max(a.essenceSpent, b.essenceSpent),
    completedAtMs: earliest(a.completedAtMs, b.completedAtMs),
    updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
  });
}

export function isStormfrontStructuresComplete(progress: StormfrontProgress): boolean {
  return progress.levels['lightning-grid'] >= MAX_BUILD_LEVEL && progress.levels['sky-hangar'] >= MAX_BUILD_LEVEL;
}

/** Money needed to raise a structure from `currentLevel` to the next level. */
export function getStormfrontLevelCost(options: { structureId: StormfrontStructureId; currentLevel: number; islandNumber: number; cycleIndex: number }): number {
  const structure = STORMFRONT_STRUCTURES.find((entry) => entry.id === options.structureId)!;
  const base = STOP_UPGRADE_BASE_COSTS[Math.min(Math.max(0, Math.floor(options.currentLevel)), STOP_UPGRADE_BASE_COSTS.length - 1)] ?? 300;
  const multiplier = getIslandEssenceMultiplier(getEffectiveIslandNumber(options.islandNumber, options.cycleIndex));
  return Math.max(1, Math.floor(base * structure.costScale * multiplier));
}

type StrikeState = Pick<IslandRunGameStateRecord, 'currentIslandNumber' | 'stopBuildStateByIndex' | 'signatureMissionProgressByIsland'>;

/**
 * The storm strikes once, when every Island 002 landmark is at Level 3.
 * Only new-campaign saves get the storm (same gate as the departure
 * requirement), so existing saves never lose levels without the add-on.
 */
export function shouldStrikeStormfront(state: StrikeState, progress: StormfrontProgress): boolean {
  if (state.currentIslandNumber !== STORMFRONT_ISLAND_NUMBER || progress.struckAtMs !== null) return false;
  if (!usesOpeningGamesCampaign(state.signatureMissionProgressByIsland ?? {})) return false;
  return Array.from({ length: STORMFRONT_LANDMARK_COUNT }, (_, index) => state.stopBuildStateByIndex[index]?.buildLevel ?? 0)
    .every((buildLevel) => buildLevel >= MAX_BUILD_LEVEL);
}

/**
 * The strike: each damaged landmark drops from Level 3 to Level 2 with fresh
 * Level-3 funding required (money already spent is not refunded or reused).
 */
export function applyStormfrontStrike(options: {
  state: Pick<IslandRunGameStateRecord, 'currentIslandNumber' | 'cycleIndex' | 'stopBuildStateByIndex' | 'stopStatesByIndex'>;
  progress: StormfrontProgress;
  nowMs: number;
}): {
  stopBuildStateByIndex: IslandRunGameStateRecord['stopBuildStateByIndex'];
  stopStatesByIndex: IslandRunGameStateRecord['stopStatesByIndex'];
  progress: StormfrontProgress;
} {
  const effectiveIslandNumber = getEffectiveIslandNumber(options.state.currentIslandNumber, options.state.cycleIndex);
  const damaged = new Set(STORMFRONT_DAMAGED_STOP_INDICES);
  const stopBuildStateByIndex = options.state.stopBuildStateByIndex.map((entry, index) => {
    if (!damaged.has(index) || (entry?.buildLevel ?? 0) < MAX_BUILD_LEVEL) return entry;
    return {
      buildLevel: MAX_BUILD_LEVEL - 1,
      spentEssence: 0,
      requiredEssence: getStopUpgradeCost({ islandNumber: effectiveIslandNumber, stopIndex: index, currentBuildLevel: MAX_BUILD_LEVEL - 1 }),
    };
  });
  const stopStatesByIndex = options.state.stopStatesByIndex.map((entry, index) => (
    damaged.has(index) ? { ...entry, buildComplete: false } : entry
  ));
  return {
    stopBuildStateByIndex,
    stopStatesByIndex,
    progress: { ...options.progress, struckAtMs: options.nowMs, updatedAtMs: options.nowMs },
  };
}

export type StormfrontFundResult =
  | { status: 'ok'; progress: StormfrontProgress; spent: number; leveledUp: boolean; money: number }
  | { status: 'not_struck' | 'already_complete' | 'insufficient_money' | 'wrong_island' | 'unknown_structure'; progress: StormfrontProgress; spent: 0; leveledUp: false; money: number };

/**
 * One hold step on a storm-safe structure (like landmark hold-to-build: up to
 * a fifth of the current level per step, never more than the player has).
 */
export function applyStormfrontFundStep(options: {
  progress: StormfrontProgress;
  structureId: unknown;
  islandNumber: number;
  cycleIndex: number;
  money: number;
  nowMs: number;
}): StormfrontFundResult {
  const { progress, islandNumber, cycleIndex, nowMs } = options;
  const money = Math.max(0, Math.floor(Number.isFinite(options.money) ? options.money : 0));
  const fail = (status: Exclude<StormfrontFundResult['status'], 'ok'>) => ({ status, progress, spent: 0 as const, leveledUp: false as const, money });
  if (islandNumber !== STORMFRONT_ISLAND_NUMBER) return fail('wrong_island');
  if (!isStormfrontStructureId(options.structureId)) return fail('unknown_structure');
  if (progress.struckAtMs === null) return fail('not_struck');
  const id = options.structureId;
  const currentLevel = progress.levels[id];
  if (currentLevel >= MAX_BUILD_LEVEL) return fail('already_complete');
  const required = getStormfrontLevelCost({ structureId: id, currentLevel, islandNumber, cycleIndex });
  const remaining = Math.max(0, required - progress.spentTowardLevel[id]);
  const step = Math.min(remaining, resolveBuildSpendStepForTier(required), money);
  if (step < 1) return fail('insufficient_money');
  const funded = progress.spentTowardLevel[id] + step;
  const leveledUp = funded >= required;
  const levels = { ...progress.levels, [id]: leveledUp ? currentLevel + 1 : currentLevel };
  const spentTowardLevel = { ...progress.spentTowardLevel, [id]: leveledUp ? 0 : funded };
  const next: StormfrontProgress = {
    ...progress,
    levels,
    spentTowardLevel,
    essenceSpent: progress.essenceSpent + step,
    updatedAtMs: nowMs,
  };
  next.completedAtMs = isStormfrontStructuresComplete(next) ? (progress.completedAtMs ?? nowMs) : null;
  return { status: 'ok', progress: next, spent: step, leveledUp, money: money - step };
}

/** Completion value for the Island 002 requirement: strike + 3 levels per structure. */
export function resolveStormfrontCompletionValue(progress: StormfrontProgress): { value: number; target: number } {
  const target = 1 + MAX_BUILD_LEVEL * STORMFRONT_STRUCTURES.length;
  if (progress.struckAtMs === null) return { value: 0, target };
  return { value: 1 + progress.levels['lightning-grid'] + progress.levels['sky-hangar'], target };
}
