import { assert, assertEqual, type TestCase } from './testHarness';
import { shouldDeliverMissionMessage } from '../islandRunMissionMessage';

export const missionMessageDeliveryTests: TestCase[] = [
  {
    name: 'mission message: waits for the controller to land on this island and a free screen',
    run: () => {
      const base = { islandNumber: 2, controllerLandedIslandNumber: 2, controllerHidden: false, screenBusy: false };
      assertEqual(shouldDeliverMissionMessage(base), true, 'landed, visible, free: deliver');
      assertEqual(shouldDeliverMissionMessage({ ...base, controllerLandedIslandNumber: null }), false, 'controller still flying in');
      assertEqual(shouldDeliverMissionMessage({ ...base, controllerLandedIslandNumber: 1 }), false, 'a landing on the previous island does not count');
      assertEqual(shouldDeliverMissionMessage({ ...base, controllerHidden: true }), false, 'controller hidden by a presentation');
      assertEqual(shouldDeliverMissionMessage({ ...base, screenBusy: true }), false, 'a modal or roll owns the screen');
    },
  },
  {
    name: 'mission message: the banner stays until tapped (no auto-hide timer)',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(!board.includes('MISSION_MESSAGE_BANNER_MS'), 'no banner auto-hide timeout');
      assert(board.includes("setControllerLandedIslandNumber(islandNumber); }}"), 'controller landing is recorded from the renderer impact');
    },
  },
];
