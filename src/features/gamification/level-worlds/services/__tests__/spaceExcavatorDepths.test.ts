import { resolveSpaceExcavatorDepthForBoard } from '../spaceExcavatorDepths';
import { assertEqual, type TestCase } from './testHarness';

export const spaceExcavatorDepthsTests: TestCase[] = [
  {
    name: 'resolveSpaceExcavatorDepthForBoard maps displayed board numbers to themed depths',
    run: () => {
      const expectedDepthByBoard: Array<[number, string]> = [
        [1, 'Surface Ruins'],
        [2, 'Surface Ruins'],
        [3, 'Moon Chamber'],
        [5, 'Moon Chamber'],
        [6, 'Crystal Vault'],
        [8, 'Crystal Vault'],
        [9, 'Ancient Core'],
        [10, 'Ancient Core'],
      ];

      for (const [boardNumber, expectedName] of expectedDepthByBoard) {
        assertEqual(
          resolveSpaceExcavatorDepthForBoard(boardNumber).name,
          expectedName,
          `board ${boardNumber} should resolve to ${expectedName}`,
        );
      }
    },
  },
];
