import { assert, assertEqual, type TestCase } from './testHarness';
import { resolveLandmarkDoorFlag, resolveLandmarkDoorLandingPresentation } from '../landmarkDoorLanding';

export const landmarkDoorLandingTests: TestCase[] = [
  {
    name: 'landmark door landing: red zooms and opens, green cheers, not-started never zooms',
    run: () => {
      assertEqual(resolveLandmarkDoorFlag({ buildLevel: 0, spentTowardLevel: 0 }), 'none', 'not started');
      assertEqual(resolveLandmarkDoorFlag({ buildLevel: 0, spentTowardLevel: 40 }), 'red', 'funding started');
      assertEqual(resolveLandmarkDoorFlag({ buildLevel: 2, spentTowardLevel: 0 }), 'red', 'in progress');
      assertEqual(resolveLandmarkDoorFlag({ buildLevel: 3, spentTowardLevel: 0 }), 'green', 'Level 3 is done');
      assertEqual(resolveLandmarkDoorLandingPresentation('red'), 'focus', 'red flag: zoom + modal');
      assertEqual(resolveLandmarkDoorLandingPresentation('green'), 'celebrate', 'green flag: Great job!!');
      assertEqual(resolveLandmarkDoorLandingPresentation('none'), 'no_zoom', 'no flag: no zoom');
    },
  },
  {
    name: 'landmark door landing: the board only zooms for red and cheers with the player piece on green',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const handler = board.slice(board.indexOf('const handleLandmarkDoorLanding'), board.indexOf("if (tapOutcome === 'open' && (stopStatus === 'active'"));
      assert(handler.includes("if (doorPresentation === 'focus') {\n      setFocusedStopId(doorStopId);\n      setCameraMode('stop_focus');"), 'zoom only for red flags');
      assert(handler.includes("requestActiveStopTransition(null, 'finished_landmark_door_cheer')"), 'green opens no modal');
      assert(handler.includes('setPlayerPieceCheer('), 'green cheers from the player piece');
      assert(board.includes('playerPieceCheer={'), 'the 3D piece receives the cheer');
    },
  },
];
