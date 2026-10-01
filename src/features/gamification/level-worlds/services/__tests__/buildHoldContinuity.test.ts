import { assert, assertEqual, type TestCase } from './testHarness';
import { shouldContinueBuildHoldThroughLevel } from '../islandRunBuildHoldContinuity';

export const buildHoldContinuityTests: TestCase[] = [
  {
    name: 'hold-to-build carries on from Level 1 to Level 3 and stops at Level 3',
    run: () => {
      const base = { holdActive: true, playerHolding: true, tutorialGuidance: false };
      assertEqual(shouldContinueBuildHoldThroughLevel({ ...base, nextBuildLevel: 1 }), true, 'L1 keeps going');
      assertEqual(shouldContinueBuildHoldThroughLevel({ ...base, nextBuildLevel: 2 }), true, 'L2 keeps going');
      assertEqual(shouldContinueBuildHoldThroughLevel({ ...base, nextBuildLevel: 3 }), false, 'L3 stops for its celebration');
      assertEqual(shouldContinueBuildHoldThroughLevel({ ...base, playerHolding: false, nextBuildLevel: 1 }), false, 'a released finger stops');
      assertEqual(shouldContinueBuildHoldThroughLevel({ ...base, tutorialGuidance: true, nextBuildLevel: 1 }), false, 'the Hatchery tutorial keeps its beat');
      assertEqual(shouldContinueBuildHoldThroughLevel({ ...base, holdActive: false, nextBuildLevel: 1 }), false, 'single precision steps still review');
    },
  },
  {
    name: 'hold-to-build: money flies into the landmark while holding',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/BuildModalV2.tsx', 'utf8');
      assert(modal.includes('{!fastBuildMode && isBuildHoldActive && !levelReview && <BuildMoneyFlight />}'), 'money flight while holding');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('if (completionPresentation && continueThroughLevel) {'), 'L1/L2 level-ups do not stop the hold');
    },
  },
];
