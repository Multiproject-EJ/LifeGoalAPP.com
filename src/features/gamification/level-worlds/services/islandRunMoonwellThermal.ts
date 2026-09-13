import type { IslandRunSignatureMissionProgressByIsland } from './islandRunSignatureMissions';
import { getIslandRunReservedTileIndices, resolveCollisionFreeTileIndices } from './islandRunTileReservations';

/** Optional restoration, independent of the Mystery objective and Frostwell. */
export interface MoonwellThermalProgress {
  missionId: 'moonwell-thermal';
  version: 1;
  heatCollectedAtMs: number | null;
  heatedAtMs: number | null;
  updatedAtMs: number;
}

export const getMoonwellThermalKey = (cycleIndex: number): string => `${Math.max(0, Math.floor(cycleIndex))}:3:moonwell`;
const timestamp = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

export function sanitizeMoonwellThermalProgress(raw: Record<string, unknown>): MoonwellThermalProgress {
  const heatedAtMs = timestamp(raw.heatedAtMs);
  return {
    missionId: 'moonwell-thermal', version: 1,
    heatCollectedAtMs: timestamp(raw.heatCollectedAtMs) ?? heatedAtMs,
    heatedAtMs,
    updatedAtMs: timestamp(raw.updatedAtMs) ?? 0,
  };
}

export function resolveMoonwellThermalProgress(ledger: IslandRunSignatureMissionProgressByIsland, cycleIndex: number): MoonwellThermalProgress {
  const record = ledger[getMoonwellThermalKey(cycleIndex)];
  return record?.missionId === 'moonwell-thermal' ? record : sanitizeMoonwellThermalProgress({});
}

export function mergeMoonwellThermalProgress(a: MoonwellThermalProgress, b: MoonwellThermalProgress): MoonwellThermalProgress {
  const earliest = (x: number | null, y: number | null) => x === null ? y : y === null ? x : Math.min(x, y);
  return { missionId: 'moonwell-thermal', version: 1,
    heatCollectedAtMs: earliest(a.heatCollectedAtMs, b.heatCollectedAtMs),
    heatedAtMs: earliest(a.heatedAtMs, b.heatedAtMs), updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs) };
}

/** Reserve controls, doors and Frostwell before choosing the heat pickup. */
export function getMoonwellHeatTileIndex(tileCount: number): number | null {
  const count = Math.max(1, Math.floor(tileCount));
  const reserved = new Set(getIslandRunReservedTileIndices(count));
  for (const index of [8, 17, 27]) {
    reserved.add(index);
    reserved.add(Math.floor(index / 36 * count));
  }
  return resolveCollisionFreeTileIndices({ tileCount: count, preferredFractions: [16 / 36], reservedIndices: reserved })[0] ?? null;
}

export function isMoonwellHeatAvailable(options: {
  islandNumber: number; buildLevel: number; progress: MoonwellThermalProgress;
}): boolean {
  return options.islandNumber === 3 && options.buildLevel >= 3
    && options.progress.heatCollectedAtMs === null && options.progress.heatedAtMs === null;
}

export function collectMoonwellHeatForLanding(options: {
  ledger: IslandRunSignatureMissionProgressByIsland; cycleIndex: number; islandNumber: number;
  buildLevel: number; tileCount: number; tileIndex: number; nowMs: number;
}): { ledger: IslandRunSignatureMissionProgressByIsland; collected: boolean } {
  const progress = resolveMoonwellThermalProgress(options.ledger, options.cycleIndex);
  if (!isMoonwellHeatAvailable({ ...options, progress }) || options.tileIndex !== getMoonwellHeatTileIndex(options.tileCount)) {
    return { ledger: options.ledger, collected: false };
  }
  return { collected: true, ledger: { ...options.ledger,
    [getMoonwellThermalKey(options.cycleIndex)]: { ...progress, heatCollectedAtMs: options.nowMs, updatedAtMs: options.nowMs },
  } };
}
