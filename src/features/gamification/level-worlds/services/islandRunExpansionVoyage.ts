import {
  isExpansionIslandNumber,
  isExpansionPackId,
  type ExpansionPackId,
  type ExpansionVoyageId,
} from './islandRunExpansionPacks';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';

/**
 * Canonical expansion-voyage state (dev only until production ready).
 *
 * Only one voyage is active at a time. The active voyage's position lives in
 * the ordinary record fields (currentIslandNumber, tokenIndex, stops, timer,
 * active egg…), so every existing reader keeps working unchanged. Switching
 * voyage stashes the leaving voyage's position here and restores the
 * arriving one's. Currencies, creatures and collections stay shared.
 */
export interface VoyagePathSnapshot {
  currentIslandNumber: number;
  cycleIndex: number;
  tokenIndex: number;
  islandStartedAtMs: number;
  islandExpiresAtMs: number;
  bossTrialResolvedIslandNumber: number | null;
  activeStopIndex: number;
  activeStopType: 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
  stopStatesByIndex: Array<Record<string, unknown>>;
  stopBuildStateByIndex: Array<Record<string, unknown>>;
  bossState: Record<string, unknown>;
  activeEggTier: 'common' | 'rare' | 'mythic' | null;
  activeEggSetAtMs: number | null;
  activeEggHatchDurationMs: number | null;
  activeEggIsDormant: boolean;
}

export const VOYAGE_PATH_SNAPSHOT_KEYS = [
  'currentIslandNumber', 'cycleIndex', 'tokenIndex', 'islandStartedAtMs', 'islandExpiresAtMs',
  'bossTrialResolvedIslandNumber', 'activeStopIndex', 'activeStopType', 'stopStatesByIndex',
  'stopBuildStateByIndex', 'bossState', 'activeEggTier', 'activeEggSetAtMs', 'activeEggHatchDurationMs',
  'activeEggIsDormant',
] as const satisfies ReadonlyArray<keyof VoyagePathSnapshot>;

export interface ExpansionVoyageState {
  version: 1;
  activeVoyageId: ExpansionVoyageId;
  ownedPackIds: ExpansionPackId[];
  completedPackIds: ExpansionPackId[];
  /** Positions of the voyages that are not active right now. */
  stashedPathsByVoyage: Partial<Record<ExpansionVoyageId, VoyagePathSnapshot>>;
  updatedAtMs: number;
}

export function createDefaultExpansionVoyageState(): ExpansionVoyageState {
  return { version: 1, activeVoyageId: 'main', ownedPackIds: [], completedPackIds: [], stashedPathsByVoyage: {}, updatedAtMs: 0 };
}

function finiteInt(value: unknown, fallback: number, min = Number.NEGATIVE_INFINITY): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.floor(value)) : fallback;
}

const STOP_TYPES = new Set(['hatchery', 'habit', 'mystery', 'wisdom', 'boss']);
const EGG_TIERS = new Set(['common', 'rare', 'mythic']);

export function sanitizeVoyagePathSnapshot(value: unknown): VoyagePathSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const island = finiteInt(raw.currentIslandNumber, 0);
  if (island < 1) return null;
  if (!Array.isArray(raw.stopStatesByIndex) || !Array.isArray(raw.stopBuildStateByIndex)) return null;
  if (!raw.bossState || typeof raw.bossState !== 'object') return null;
  const isObject = (entry: unknown): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object';
  const eggTier = EGG_TIERS.has(raw.activeEggTier as string) ? raw.activeEggTier as VoyagePathSnapshot['activeEggTier'] : null;
  return {
    currentIslandNumber: island,
    cycleIndex: finiteInt(raw.cycleIndex, 0, 0),
    tokenIndex: finiteInt(raw.tokenIndex, 0, 0),
    islandStartedAtMs: finiteInt(raw.islandStartedAtMs, 0, 0),
    islandExpiresAtMs: finiteInt(raw.islandExpiresAtMs, 0, 0),
    bossTrialResolvedIslandNumber: raw.bossTrialResolvedIslandNumber === null ? null : finiteInt(raw.bossTrialResolvedIslandNumber, 0) || null,
    activeStopIndex: Math.min(4, finiteInt(raw.activeStopIndex, 0, 0)),
    activeStopType: STOP_TYPES.has(raw.activeStopType as string) ? raw.activeStopType as VoyagePathSnapshot['activeStopType'] : 'hatchery',
    stopStatesByIndex: raw.stopStatesByIndex.filter(isObject),
    stopBuildStateByIndex: raw.stopBuildStateByIndex.filter(isObject),
    bossState: raw.bossState as Record<string, unknown>,
    activeEggTier: eggTier,
    activeEggSetAtMs: eggTier ? finiteInt(raw.activeEggSetAtMs, 0, 0) : null,
    activeEggHatchDurationMs: eggTier ? finiteInt(raw.activeEggHatchDurationMs, 0, 0) : null,
    activeEggIsDormant: eggTier ? raw.activeEggIsDormant === true : false,
  };
}

function uniquePackIds(value: unknown): ExpansionPackId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isExpansionPackId))];
}

export function sanitizeExpansionVoyageState(value: unknown, fallback = createDefaultExpansionVoyageState()): ExpansionVoyageState {
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Record<string, unknown>;
  const ownedPackIds = uniquePackIds(raw.ownedPackIds);
  const completedPackIds = uniquePackIds(raw.completedPackIds).filter((id) => ownedPackIds.includes(id));
  const stashed: ExpansionVoyageState['stashedPathsByVoyage'] = {};
  if (raw.stashedPathsByVoyage && typeof raw.stashedPathsByVoyage === 'object') {
    for (const [voyageId, snapshot] of Object.entries(raw.stashedPathsByVoyage as Record<string, unknown>)) {
      if (voyageId !== 'main' && !ownedPackIds.includes(voyageId as ExpansionPackId)) continue;
      const clean = sanitizeVoyagePathSnapshot(snapshot);
      if (!clean) continue;
      // A pack's stash must point at its own islands; main's never at a pack island.
      if (voyageId === 'main' ? isExpansionIslandNumber(clean.currentIslandNumber) : !isExpansionIslandNumber(clean.currentIslandNumber)) continue;
      stashed[voyageId as ExpansionVoyageId] = clean;
    }
  }
  const requestedActive = raw.activeVoyageId;
  const activeVoyageId: ExpansionVoyageId = isExpansionPackId(requestedActive) && ownedPackIds.includes(requestedActive)
    ? requestedActive
    : 'main';
  // Never keep a stash for the voyage that is currently live.
  delete stashed[activeVoyageId];
  return {
    version: 1,
    activeVoyageId,
    ownedPackIds,
    completedPackIds,
    stashedPathsByVoyage: stashed,
    updatedAtMs: finiteInt(raw.updatedAtMs, 0, 0),
  };
}

/** Last writer wins; voyage switches are whole-state swaps, never merged field by field. */
export function mergeExpansionVoyageStateForConflict(remote: ExpansionVoyageState, local: ExpansionVoyageState): ExpansionVoyageState {
  return local.updatedAtMs >= remote.updatedAtMs ? local : remote;
}

export function pickVoyagePathSnapshot(record: IslandRunGameStateRecord): VoyagePathSnapshot {
  const snapshot = {} as Record<string, unknown>;
  for (const key of VOYAGE_PATH_SNAPSHOT_KEYS) snapshot[key] = (record as unknown as Record<string, unknown>)[key];
  return JSON.parse(JSON.stringify(snapshot)) as VoyagePathSnapshot;
}

/** Overlay a stashed position onto the record (everything else stays shared). */
export function applyVoyagePath<T extends IslandRunGameStateRecord>(record: T, path: VoyagePathSnapshot): T {
  return {
    ...record,
    ...path,
    stopStatesByIndex: path.stopStatesByIndex as IslandRunGameStateRecord['stopStatesByIndex'],
    stopBuildStateByIndex: path.stopBuildStateByIndex as IslandRunGameStateRecord['stopBuildStateByIndex'],
    bossState: path.bossState as IslandRunGameStateRecord['bossState'],
  };
}

/**
 * The main path's position, wherever the player is right now. Main-journey
 * readers (journey milestones, XP ladder) use this so pack islands never
 * count as main-path progress.
 */
export function resolveMainPathRecord<T extends IslandRunGameStateRecord>(record: T): T {
  if (record.expansionVoyageState.activeVoyageId === 'main') return record;
  const main = record.expansionVoyageState.stashedPathsByVoyage.main;
  return main ? applyVoyagePath(record, main) : record;
}
