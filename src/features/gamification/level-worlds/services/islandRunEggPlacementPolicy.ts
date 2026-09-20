import { resolveIslandRunContractV2Stops } from './islandRunContractV2StopResolver';
import { EGG_MANIA_MAX_EGGS_PER_ISLAND, getEggSlotLedgerKey, parseEggSlotLedgerKey } from './islandRunEggMania';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';

/** New-journey placement eligibility, not ownership or collection eligibility.
 * Existing eggs remain resolvable; no migration deletes earned inventory. */
export function canPlaceIslandRunEggs(
  state: Pick<IslandRunGameStateRecord, 'currentIslandNumber' | 'signatureMissionProgressByIsland' | 'perIslandEggs' | 'stopBuildStateByIndex' | 'stopStatesByIndex' | 'completedStopsByIsland'>,
  islandNumber: number,
  ledgerKeys: readonly string[],
): boolean {
  const stops = state.stopStatesByIndex.map((entry, index) => ({ ...entry,
    objectiveComplete: entry.objectiveComplete || (state.completedStopsByIsland[String(islandNumber)] ?? [])
      .includes(['hatchery', 'habit', 'mystery', 'wisdom', 'boss'][index]),
  }));
  const hatcheryStatus = resolveIslandRunContractV2Stops({ islandNumber, stopStatesByIndex: stops,
    stopBuildStateByIndex: state.stopBuildStateByIndex }).statusesByIndex[0];
  if (state.stopBuildStateByIndex.length < 5 || !state.stopBuildStateByIndex.every(build => build.buildLevel >= 3)) return false;
  if (islandNumber < 4 || !['active', 'accessible', 'completed'].includes(hatcheryStatus) || !Number.isInteger(islandNumber) || islandNumber !== state.currentIslandNumber
    || ledgerKeys.length < 1 || ledgerKeys.length > EGG_MANIA_MAX_EGGS_PER_ISLAND) return false;
  return ledgerKeys.every(key => {
    const slot = parseEggSlotLedgerKey(key);
    return slot !== null && slot.islandNumber === islandNumber
      && slot.slotIndex < EGG_MANIA_MAX_EGGS_PER_ISLAND
      && key === getEggSlotLedgerKey(slot.islandNumber, slot.slotIndex)
      && !state.perIslandEggs[key];
  });
}
