import { resolveIslandRunFeatureAccess } from './islandRunFeatureAccess';
import { EGG_MANIA_MAX_EGGS_PER_ISLAND, getEggSlotLedgerKey, parseEggSlotLedgerKey } from './islandRunEggMania';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';

/** New-journey placement eligibility, not ownership or collection eligibility.
 * Existing eggs remain resolvable; no migration deletes earned inventory. */
export function canPlaceIslandRunEggs(
  state: Pick<IslandRunGameStateRecord, 'currentIslandNumber' | 'signatureMissionProgressByIsland' | 'perIslandEggs'>,
  islandNumber: number,
  ledgerKeys: readonly string[],
): boolean {
  const access = resolveIslandRunFeatureAccess(state);
  if (!access.gradual) return true;
  if (!access.eggs || !Number.isInteger(islandNumber) || islandNumber !== state.currentIslandNumber
    || ledgerKeys.length < 1 || ledgerKeys.length > EGG_MANIA_MAX_EGGS_PER_ISLAND) return false;
  return ledgerKeys.every(key => {
    const slot = parseEggSlotLedgerKey(key);
    return slot !== null && slot.islandNumber === islandNumber
      && slot.slotIndex < EGG_MANIA_MAX_EGGS_PER_ISLAND
      && key === getEggSlotLedgerKey(slot.islandNumber, slot.slotIndex)
      && !state.perIslandEggs[key];
  });
}
