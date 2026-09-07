import { hasReceivedCompassBook } from '../islandRunCompassBookReceipt';
import type { IslandRunSignatureMissionProgressByIsland } from '../islandRunSignatureMissions';
import { assertEqual, type TestCase } from './testHarness';

function receiptState(
  currentIslandNumber: number,
  signatureMissionProgressByIsland: IslandRunSignatureMissionProgressByIsland = {},
  cycleIndex = 0,
) {
  return { currentIslandNumber, cycleIndex, signatureMissionProgressByIsland };
}

export const islandRunCompassBookReceiptTests: TestCase[] = [
  {
    name: 'keeps the Compass Book concealed until the Island 008 Living Compass finale',
    run: () => {
      assertEqual(hasReceivedCompassBook(receiptState(1)), false, 'Island 001 only gathers First Signals');
      assertEqual(hasReceivedCompassBook(receiptState(7)), false, 'Island 007 still conceals the Compass Book concept');
      assertEqual(hasReceivedCompassBook(receiptState(8)), false, 'arriving on Island 008 does not grant the book');

      const ledger: IslandRunSignatureMissionProgressByIsland = {
        '0:8': {
          missionId: 'jungle-expedition-living-compass',
          version: 1,
          claimedPickupTileIndices: [2, 9, 16, 25, 34],
          chargesEarned: 5,
          chargesSpent: 5,
          activatedStages: 5,
          lastActivatedStage: 5,
          completedAtMs: 100,
          updatedAtMs: 100,
        },
      };
      assertEqual(hasReceivedCompassBook(receiptState(8, ledger)), true, 'the fifth seal grants the Compass Book');
    },
  },
  {
    name: 'grandfathers players who already travelled beyond the new receipt island',
    run: () => {
      assertEqual(hasReceivedCompassBook(receiptState(9)), true, 'an older Island 009 save keeps book access without a migrated ledger');
      assertEqual(hasReceivedCompassBook(receiptState(1, {}, 1)), true, 'a completed cycle always retains the book');
    },
  },
];
