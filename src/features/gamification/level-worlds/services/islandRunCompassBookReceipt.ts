import {
  COMPASS_BOOK_FIRST_SIGNAL_COUNT,
  COMPASS_BOOK_RECEIPT_ISLAND_NUMBER,
  COMPASS_BOOK_VISIBLE_FRAGMENT_START_ISLAND_NUMBER,
} from '../../../compass-book/logic/journey';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { resolveStagedRestorationMissionProgress } from './islandRunSignatureMissions';

export {
  COMPASS_BOOK_FIRST_SIGNAL_COUNT,
  COMPASS_BOOK_RECEIPT_ISLAND_NUMBER,
  COMPASS_BOOK_VISIBLE_FRAGMENT_START_ISLAND_NUMBER,
};

type CompassBookReceiptState = Pick<
  IslandRunGameStateRecord,
  'currentIslandNumber' | 'cycleIndex' | 'signatureMissionProgressByIsland'
>;

/**
 * The Compass Book is awarded by the Living Compass finale on Island 008.
 * Players whose older saves have already advanced beyond that island retain
 * access even if their pre-migration ledger has no explicit completion record.
 */
export function hasReceivedCompassBook(state: CompassBookReceiptState): boolean {
  const islandNumber = Math.max(1, Math.floor(state.currentIslandNumber));
  const cycleIndex = Math.max(0, Math.floor(state.cycleIndex));
  if (cycleIndex > 0 || islandNumber > COMPASS_BOOK_RECEIPT_ISLAND_NUMBER) return true;
  if (islandNumber < COMPASS_BOOK_RECEIPT_ISLAND_NUMBER) return false;

  const mission = resolveStagedRestorationMissionProgress({
    ledger: state.signatureMissionProgressByIsland,
    cycleIndex,
    islandNumber: COMPASS_BOOK_RECEIPT_ISLAND_NUMBER,
  });
  return mission?.completedAtMs !== null;
}
