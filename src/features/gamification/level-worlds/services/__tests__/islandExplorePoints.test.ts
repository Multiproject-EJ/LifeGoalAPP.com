import { getIslandExplorePoints } from '../islandExplorePoints';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandExplorePointsTests: TestCase[] = [
  {
    name: 'Island 001 explore points: waterfall always, Assembly interior only once it is built',
    run: () => {
      const before = getIslandExplorePoints(1, { assemblyComplete: false });
      assertEqual(before.map((p) => p.id).join(','), 'island1-waterfall', 'only the waterfall before the Assembly is built');
      const after = getIslandExplorePoints(1, { assemblyComplete: true });
      assertEqual(after.map((p) => p.id).join(','), 'island1-waterfall,island1-assembly-hall', 'the Assembly hall opens once built');
      assert(after[1].assemblyCutaway === true, 'the hall view uses the finished-Assembly cutaway');
      assert(after[1].camera.position[1] < 0, 'the hall camera sits below ground, inside the room');
      assertEqual(getIslandExplorePoints(2, { assemblyComplete: true }).length, 0, 'other islands have none yet');
    },
  },
  {
    name: 'explore dots are presentation only and hand the controller back',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const pilot = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(pilot.includes('className="island-explore-dot"'), 'dots render in the 3D layer');
      assert(pilot.includes("applyPreset('overview', 0.8);"), 'Back returns to the island overview');
      assert(board.includes('onExplorePointChange={(id) => setExploreViewActive(id !== null)}'), 'the board knows when an explore view is open');
      assert(board.includes('islandDeparture !== null || exploreViewActive'), 'the controller steps aside while exploring');
    },
  },
];
