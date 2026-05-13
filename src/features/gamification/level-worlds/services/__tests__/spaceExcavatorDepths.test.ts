import { SPACE_EXCAVATOR_DEPTH_LEVELS, resolveSpaceExcavatorDepthForBoard } from '../spaceExcavatorDepths';
import { assertEqual, type TestCase } from './testHarness';

export const spaceExcavatorDepthsTests: TestCase[] = [
  {
    name: 'SPACE_EXCAVATOR_DEPTH_LEVELS covers boards 1-10 without range gaps',
    run: () => {
      let expectedMinBoardNumber = 1;

      for (const depth of SPACE_EXCAVATOR_DEPTH_LEVELS) {
        assertEqual(
          depth.minBoardNumber,
          expectedMinBoardNumber,
          `${depth.name} should start at board ${expectedMinBoardNumber}`,
        );
        expectedMinBoardNumber = depth.maxBoardNumber + 1;
      }

      assertEqual(expectedMinBoardNumber, 11, 'depth metadata should cover through board 10');
    },
  },
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
  {
    name: 'resolveSpaceExcavatorDepthForBoard normalizes edge board numbers',
    run: () => {
      const expectedDepthByBoard: Array<[number, string]> = [
        [0, 'Surface Ruins'],
        [-3, 'Surface Ruins'],
        [3.7, 'Moon Chamber'],
        [11, 'Ancient Core'],
        [100, 'Ancient Core'],
        [Number.NaN, 'Surface Ruins'],
      ];

      for (const [boardNumber, expectedName] of expectedDepthByBoard) {
        assertEqual(
          resolveSpaceExcavatorDepthForBoard(boardNumber).name,
          expectedName,
          `board ${String(boardNumber)} should resolve to ${expectedName}`,
        );
      }
    },
  },
];
