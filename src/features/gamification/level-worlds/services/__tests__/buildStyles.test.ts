import {
  brickLayerState,
  BRICKS_PER_LAYER,
  judgeRhythmTap,
  resolveIslandBuildStyle,
  RHYTHM_BEAT_MS,
  stackReleaseLocks,
} from '../buildStyles';
import { assert, assertEqual, type TestCase } from './testHarness';

export const buildStylesTests: TestCase[] = [
  {
    name: 'build styles alternate per island: Hold while learning, Skill only on 019, Bricks/Stack/Rhythm rotate',
    run: async () => {
      for (const n of [1, 2, 3]) assertEqual(resolveIslandBuildStyle(n), 'hold', `Island ${n} keeps Hold while learning`);
      assertEqual(resolveIslandBuildStyle(19), 'skill', 'Skill belongs to the roller coaster');
      const later = [4, 5, 6, 7, 8, 9, 10, 11].map(resolveIslandBuildStyle);
      assertEqual(later.join(','), 'hold,bricks,stack,rhythm,hold,bricks,stack,rhythm', 'rotation from Island 004');
      for (let n = 4; n < 40; n += 1) assert(n === 19 || resolveIslandBuildStyle(n) !== 'skill', 'Skill never leaks to other islands');
      for (let n = 4; n < 40; n += 1) assert(n === 18 || n === 19 || n === 20 || resolveIslandBuildStyle(n) !== resolveIslandBuildStyle(n + 1) || n + 1 === 19, 'no two neighbouring islands build the same way');
      // @ts-ignore Node-only source contract check.
      const fs = await import('fs');
      const board = fs.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('buildStyle={resolveIslandBuildStyle(islandNumber)}') && board.includes('onStyledBuildStep={buildPrecisionStepFromPlayer}'), 'every style uses the canonical one-step build');
    },
  },
  {
    name: 'build style mechanics: brick layers pause, the beam locks past the line, rhythm is forgiving',
    run: () => {
      assertEqual(brickLayerState(3).inLayer, 3, 'bricks within a layer');
      assert(brickLayerState(BRICKS_PER_LAYER).layerJustCompleted, 'a full layer gets its beat');
      assertEqual(brickLayerState(BRICKS_PER_LAYER + 1).layer, 1, 'then a new layer');
      assert(stackReleaseLocks(0.8) && !stackReleaseLocks(0.5), 'lift past the line to lock');
      assertEqual(judgeRhythmTap(RHYTHM_BEAT_MS * 3 + 40), 'beat', 'just after the beat counts');
      assertEqual(judgeRhythmTap(RHYTHM_BEAT_MS * 3 - 120), 'beat', 'just before counts too');
      assertEqual(judgeRhythmTap(RHYTHM_BEAT_MS * 3 + 500), 'off', 'half a beat off is free, not a build');
    },
  },
];
