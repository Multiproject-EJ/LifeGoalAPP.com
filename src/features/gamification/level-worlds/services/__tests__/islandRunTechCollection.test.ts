import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';
import {
  isTechCollectionTileType,
  resolveTechCollection,
  resolveTechCollectionSlot,
  techCollectionCellBackgroundPosition,
  techCollectionRowCol,
  TECH_COLLECTION_CELL_COUNT,
  TECH_COLLECTION_FULL_BOARD_REWARD_DICE,
  TECH_COLLECTION_LINE_REWARD_DICE,
} from '../islandRunTechCollection';

export const islandRunTechCollectionTests: TestCase[] = [
  {
    name: 'adds a brand-new slot and reports the next collected set',
    run: () => {
      const result = resolveTechCollection({ slotIndex: 4, collectedSlots: [0, 1], rewardedLines: [] });
      assertEqual(result.isDuplicate, false, 'new slot is not a duplicate');
      assertEqual(result.nextCollectedCount, 3, 'collected count advances');
      assertDeepEqual(result.nextCollectedSlots, [0, 1, 4], 'collected set includes the new slot, sorted');
      assertEqual(result.totalRewardDice, 0, 'a non-line pickup pays no dice');
    },
  },
  {
    name: 'ignores a duplicate already-collected slot with no reward or state change',
    run: () => {
      const result = resolveTechCollection({ slotIndex: 1, collectedSlots: [0, 1, 2], rewardedLines: [0] });
      assertEqual(result.isDuplicate, true, 'duplicate slot is flagged');
      assertEqual(result.nextCollectedCount, 3, 'collected count is unchanged');
      assertDeepEqual(result.nextCollectedSlots, [0, 1, 2], 'collected set is unchanged');
      assertDeepEqual(result.nextRewardedLines, [0], 'rewarded ledger is unchanged');
      assertEqual(result.totalRewardDice, 0, 'duplicate pays nothing');
      assertEqual(result.isFullBoardNewlyCompleted, false, 'duplicate never completes the board');
    },
  },
  {
    name: 'resolves a board tile to a deterministic 3x3 slot',
    run: () => {
      assertEqual(resolveTechCollectionSlot(13, 24), 13 % 9, 'wraps into 0-8 by modulo');
      assertEqual(resolveTechCollectionSlot(13, 24), resolveTechCollectionSlot(13, 24), 'stable for same input');
      assertEqual(resolveTechCollectionSlot(-13, 24), 13 % 9, 'negative indices are absolute-valued');
      assertEqual(resolveTechCollectionSlot(5, 4), 5 % 4, 'small boards clamp the modulo to tile count');
      assert(
        resolveTechCollectionSlot(99, 24) >= 0 && resolveTechCollectionSlot(99, 24) < TECH_COLLECTION_CELL_COUNT,
        'always in range',
      );
    },
  },
  {
    name: 'detects a single newly completed line and pays one line reward',
    run: () => {
      // Slots 0 and 1 collected; adding 2 completes the top row (line index 0).
      const result = resolveTechCollection({ slotIndex: 2, collectedSlots: [0, 1], rewardedLines: [] });
      assertDeepEqual(result.newlyCompletedLines, [0], 'top row line index reported');
      assertEqual(result.lineRewardDice, TECH_COLLECTION_LINE_REWARD_DICE, 'one line reward');
      assertEqual(result.totalRewardDice, TECH_COLLECTION_LINE_REWARD_DICE, 'total matches one line');
      assertDeepEqual(result.nextRewardedLines, [0], 'completed line recorded in ledger');
    },
  },
  {
    name: 'aggregates two lines completed by the same pickup',
    run: () => {
      // {1,3,5,7} collected; adding center 4 completes column [1,4,7] and row [3,4,5].
      const result = resolveTechCollection({ slotIndex: 4, collectedSlots: [1, 3, 5, 7], rewardedLines: [] });
      assertDeepEqual(result.newlyCompletedLines, [1, 4], 'both completed line indices reported');
      assertEqual(result.lineRewardDice, 2 * TECH_COLLECTION_LINE_REWARD_DICE, 'two line rewards aggregated');
      assertEqual(result.totalRewardDice, 20, 'total is +20 dice');
      assertEqual(result.isFullBoardNewlyCompleted, false, 'five slots is not a full board');
    },
  },
  {
    name: 'never repays a previously rewarded line',
    run: () => {
      // Top row already collected AND already rewarded (line 0). Re-resolving the
      // last cell as a fresh slot must not re-pay it.
      const result = resolveTechCollection({ slotIndex: 3, collectedSlots: [0, 1, 2], rewardedLines: [0] });
      assert(!result.newlyCompletedLines.includes(0), 'line 0 not reported again');
      assertEqual(result.lineRewardDice, 0, 'no dice for the already-rewarded line');
    },
  },
  {
    name: 'reports the eighth-to-ninth transition as a full-board completion with +100',
    run: () => {
      const result = resolveTechCollection({
        slotIndex: 8,
        collectedSlots: [0, 1, 2, 3, 4, 5, 6, 7],
        // Lines fully inside the first eight slots already paid out.
        rewardedLines: [0, 1, 3, 4, 7],
      });
      assertEqual(result.isFullBoardNewlyCompleted, true, '8 -> 9 transition flagged');
      assertEqual(result.nextCollectedCount, 9, 'grid is now full');
      assertEqual(result.fullBoardRewardDice, TECH_COLLECTION_FULL_BOARD_REWARD_DICE, 'full-board bonus is +100');
      // Adding slot 8 completes lines 2 [6,7,8], 5 [2,5,8], 6 [0,4,8] = +30, plus +100.
      assertDeepEqual(result.newlyCompletedLines, [2, 5, 6], 'final three lines reported');
      assertEqual(result.totalRewardDice, 30 + 100, 'final line + full-board reward aggregated');
    },
  },
  {
    name: 'an already-full grid reports no new completion and stays idempotent',
    run: () => {
      const full = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      const result = resolveTechCollection({ slotIndex: 8, collectedSlots: full, rewardedLines: [0, 1, 2, 3, 4, 5, 6, 7] });
      assertEqual(result.isDuplicate, true, 'replaying the ninth slot is a duplicate');
      assertEqual(result.isFullBoardNewlyCompleted, false, 'no second full-board completion');
      assertEqual(result.totalRewardDice, 0, 'no replayed reward');
    },
  },
  {
    name: 'rejects an out-of-range slot as a no-op duplicate',
    run: () => {
      const result = resolveTechCollection({ slotIndex: 99, collectedSlots: [0], rewardedLines: [] });
      assertEqual(result.isDuplicate, true, 'out-of-range slot is treated as duplicate');
      assertDeepEqual(result.nextCollectedSlots, [0], 'collected set unchanged');
      assertEqual(result.totalRewardDice, 0, 'no reward');
    },
  },
  {
    name: 'maps slots to row/column and image background positions',
    run: () => {
      assertDeepEqual(techCollectionRowCol(0), { row: 0, column: 0 }, 'slot 0 is top-left');
      assertDeepEqual(techCollectionRowCol(8), { row: 2, column: 2 }, 'slot 8 is bottom-right');
      assertDeepEqual(techCollectionCellBackgroundPosition(0), { x: 0, y: 0 }, 'top-left ninth');
      assertDeepEqual(techCollectionCellBackgroundPosition(8), { x: 100, y: 100 }, 'bottom-right ninth');
      assertDeepEqual(techCollectionCellBackgroundPosition(4), { x: 50, y: 50 }, 'center ninth');
    },
  },
  {
    name: 'recognises the eligible collectable tile types',
    run: () => {
      ['currency', 'chest', 'micro', 'card'].forEach((t) =>
        assert(isTechCollectionTileType(t), `${t} is collectable`),
      );
      ['hazard', 'landmark_door', 'traffic_light', 'encounter'].forEach((t) =>
        assert(!isTechCollectionTileType(t), `${t} is not collectable`),
      );
    },
  },
];
