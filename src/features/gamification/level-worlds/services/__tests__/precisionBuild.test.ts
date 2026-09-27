import { assert, assertEqual, type TestCase } from './testHarness';
import {
  advancePrecisionBuild,
  angularDistance,
  createPrecisionBuildState,
  judgePrecisionTap,
  precisionMarkerDeg,
  PRECISION_BUILD_MAX_SPEED,
  PRECISION_BUILD_MIN_ZONE_DEG,
  PRECISION_BUILD_START_ZONE_DEG,
} from '../precisionBuild';

export const precisionBuildTests: TestCase[] = [
  {
    name: 'precision build: hits inside the arc, perfect at its heart, misses outside, across 0°/360°',
    run: () => {
      const state = { targetDeg: 10, zoneDeg: 60 };
      assertEqual(judgePrecisionTap(10, state), 'perfect', 'dead centre');
      assertEqual(judgePrecisionTap(355, state), 'good', 'wraps past 12 o’clock');
      assertEqual(judgePrecisionTap(39, state), 'good', 'inside the edge');
      assertEqual(judgePrecisionTap(45, state), 'miss', 'outside the arc');
      assertEqual(angularDistance(350, 10), 20, 'shortest way round');
      assertEqual(precisionMarkerDeg(1_000, 200), 200, 'marker sweeps at its speed');
      assertEqual(precisionMarkerDeg(2_000, 200), 40, 'and wraps');
    },
  },
  {
    name: 'precision build: streaks narrow the arc and speed up; a miss eases it and keeps the best',
    run: () => {
      let state = createPrecisionBuildState(2);
      for (let i = 0; i < 40; i += 1) state = advancePrecisionBuild(state, i % 2 ? 'good' : 'perfect');
      assertEqual(state.streak, 40, 'streak counts hits');
      assertEqual(state.zoneDeg, PRECISION_BUILD_MIN_ZONE_DEG, 'arc narrows to its floor, never to nothing');
      assertEqual(state.speedDegPerSec, PRECISION_BUILD_MAX_SPEED, 'speed caps');
      assertEqual(state.bestStreak, 40, 'best streak tracks');
      const target = state.targetDeg;
      const missed = advancePrecisionBuild(state, 'miss');
      assertEqual(missed.streak, 0, 'miss resets the streak');
      assert(missed.zoneDeg > state.zoneDeg && missed.zoneDeg <= PRECISION_BUILD_START_ZONE_DEG, 'miss widens the arc again');
      assertEqual(missed.bestStreak, 40, 'best is kept');
      assertEqual(missed.targetDeg, target, 'a miss keeps the same target to try again');
    },
  },
  {
    name: 'precision build: a hit performs one ordinary build step; the style is optional and remembered',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('return await handleSpendEssenceOnBuild(stopIndex, 1);'), 'one canonical build step per hit');
      assert(board.includes('onPrecisionBuild={buildPrecisionStepFromPlayer}'), 'the modal is wired to it');
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/BuildModalV2.tsx', 'utf8');
      assert(modal.includes("chooseBuildStyle('hold')") && modal.includes('BUILD_STYLE_KEY'), 'hold build stays one tap away and the choice persists');
      const ring = fsMod.readFileSync('src/features/gamification/level-worlds/components/PrecisionBuildRing.tsx', 'utf8');
      assert(/if \(judgement === 'miss'\) \{[\s\S]*?return;\s*\}/.test(ring) && ring.indexOf("if (judgement === 'miss')") < ring.indexOf('await onHit()'), 'a miss never builds or spends');
    },
  },
];
