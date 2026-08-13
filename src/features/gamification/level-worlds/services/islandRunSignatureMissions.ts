import { getEffectiveIslandNumber, getIslandEssenceMultiplier } from './islandRunContractV2EssenceBuild';

export const FROSTWELL_ISLAND_NUMBER = 3;
export const FROSTWELL_DEPTH_METERS = 500;
export const FROSTWELL_BASE_TECH_COST = 1_000;
/** Three route positions, deliberately clear of landmark-door clusters. */
export const FROSTWELL_DRILL_TILE_INDICES = Object.freeze([8, 17, 27] as const);
export const FROSTWELL_SPIN_METERS = Object.freeze([15, 20, 25, 30, 40, 50, 60, 75] as const);

export interface FrostwellIceworksProgress {
  missionId: 'frostwell-iceworks';
  version: 2;
  metersDrilled: number;
  spinsEarned: number;
  spinsUsed: number;
  lastSpinMeters: number | null;
  builtAtMs: number | null;
  updatedAtMs: number;
}

export type IslandRunSignatureMissionProgressByIsland = Record<string, FrostwellIceworksProgress>;

export function getIslandRunSignatureMissionKey(cycleIndex: number, islandNumber: number): string {
  return `${Math.max(0, Math.floor(cycleIndex))}:${Math.max(1, Math.floor(islandNumber))}`;
}

function finiteInteger(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;
}

export function sanitizeIslandRunSignatureMissionProgress(
  value: unknown,
): IslandRunSignatureMissionProgressByIsland {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: IslandRunSignatureMissionProgressByIsland = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
    const record = raw as Record<string, unknown>;
    // Version 1 briefly represented the original 50m concept as twenty 2.5m
    // turns. Preserve that actual drilled distance when reading a local draft.
    const legacyRolls = finiteInteger(record.rollsCompleted ?? record.rolls_completed);
    const metersDrilled = record.metersDrilled ?? record.meters_drilled;
    const builtAtRaw = record.builtAtMs ?? record.built_at_ms;
    const updatedAtRaw = record.updatedAtMs ?? record.updated_at_ms;
    const lastSpinRaw = record.lastSpinMeters ?? record.last_spin_meters;
    result[key] = {
      missionId: 'frostwell-iceworks',
      version: 2,
      metersDrilled: Math.max(0, Math.min(
        FROSTWELL_DEPTH_METERS,
        typeof metersDrilled === 'number' && Number.isFinite(metersDrilled)
          ? Math.floor(metersDrilled)
          : Math.floor(Math.max(0, legacyRolls) * 2.5),
      )),
      spinsEarned: Math.max(0, finiteInteger(record.spinsEarned ?? record.spins_earned)),
      spinsUsed: Math.max(0, finiteInteger(record.spinsUsed ?? record.spins_used)),
      lastSpinMeters: typeof lastSpinRaw === 'number' && Number.isFinite(lastSpinRaw)
        ? Math.max(0, Math.floor(lastSpinRaw))
        : null,
      builtAtMs: typeof builtAtRaw === 'number' && Number.isFinite(builtAtRaw) ? Math.max(0, builtAtRaw) : null,
      updatedAtMs: typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw) ? Math.max(0, updatedAtRaw) : 0,
    };
  });
  return result;
}

export function resolveFrostwellIceworksProgress(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  cycleIndex: number;
  islandNumber?: number;
}): FrostwellIceworksProgress {
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber ?? FROSTWELL_ISLAND_NUMBER);
  return options.ledger[key] ?? {
    missionId: 'frostwell-iceworks',
    version: 2,
    metersDrilled: 0,
    spinsEarned: 0,
    spinsUsed: 0,
    lastSpinMeters: null,
    builtAtMs: null,
    updatedAtMs: 0,
  };
}

export function getFrostwellAvailableSpins(progress: FrostwellIceworksProgress): number {
  return Math.max(0, progress.spinsEarned - progress.spinsUsed);
}

export function isFrostwellDrillTile(islandNumber: number, tileIndex: number): boolean {
  return islandNumber === FROSTWELL_ISLAND_NUMBER
    && FROSTWELL_DRILL_TILE_INDICES.includes(tileIndex as typeof FROSTWELL_DRILL_TILE_INDICES[number]);
}

export function grantFrostwellDrillSpinForLanding(options: {
  ledger: IslandRunSignatureMissionProgressByIsland;
  islandNumber: number;
  cycleIndex: number;
  tileIndex: number;
  nowMs: number;
}): { ledger: IslandRunSignatureMissionProgressByIsland; granted: boolean } {
  if (!isFrostwellDrillTile(options.islandNumber, options.tileIndex)) {
    return { ledger: options.ledger, granted: false };
  }
  const key = getIslandRunSignatureMissionKey(options.cycleIndex, options.islandNumber);
  const current = resolveFrostwellIceworksProgress(options);
  if (current.builtAtMs !== null || current.metersDrilled >= FROSTWELL_DEPTH_METERS) {
    return { ledger: options.ledger, granted: false };
  }
  return {
    granted: true,
    ledger: {
      ...options.ledger,
      [key]: {
        ...current,
        spinsEarned: current.spinsEarned + 1,
        updatedAtMs: options.nowMs,
      },
    },
  };
}

export function resolveFrostwellSpinMeters(randomValue: number): number {
  const normalized = Number.isFinite(randomValue) ? Math.max(0, Math.min(0.999999, randomValue)) : 0;
  return FROSTWELL_SPIN_METERS[Math.floor(normalized * FROSTWELL_SPIN_METERS.length)];
}

export function mergeIslandRunSignatureMissionProgress(
  remote: IslandRunSignatureMissionProgressByIsland,
  local: IslandRunSignatureMissionProgressByIsland,
): IslandRunSignatureMissionProgressByIsland {
  const merged: IslandRunSignatureMissionProgressByIsland = {};
  new Set([...Object.keys(remote), ...Object.keys(local)]).forEach((key) => {
    const a = remote[key];
    const b = local[key];
    if (!a) { merged[key] = b; return; }
    if (!b) { merged[key] = a; return; }
    const builtAtMs = a.builtAtMs === null ? b.builtAtMs : b.builtAtMs === null ? a.builtAtMs : Math.min(a.builtAtMs, b.builtAtMs);
    const latest = a.updatedAtMs >= b.updatedAtMs ? a : b;
    merged[key] = {
      missionId: 'frostwell-iceworks',
      version: 2,
      metersDrilled: Math.max(a.metersDrilled, b.metersDrilled),
      spinsEarned: Math.max(a.spinsEarned, b.spinsEarned),
      spinsUsed: Math.max(a.spinsUsed, b.spinsUsed),
      lastSpinMeters: latest.lastSpinMeters,
      builtAtMs,
      updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
    };
  });
  return merged;
}

export function getFrostwellIceworksTechCost(cycleIndex: number): number {
  const effectiveIsland = getEffectiveIslandNumber(FROSTWELL_ISLAND_NUMBER, cycleIndex);
  return Math.round(FROSTWELL_BASE_TECH_COST * getIslandEssenceMultiplier(effectiveIsland));
}

export function getFrostwellDepthProgress(progress: FrostwellIceworksProgress): number {
  return Math.min(1, Math.max(0, progress.metersDrilled / FROSTWELL_DEPTH_METERS));
}
