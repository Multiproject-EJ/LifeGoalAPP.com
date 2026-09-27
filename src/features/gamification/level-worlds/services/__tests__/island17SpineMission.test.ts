import { assert, assertEqual, type TestCase } from './testHarness';
import { STAGED_RESTORATION_MISSIONS } from '../islandRunSignatureMissions';
import { getIslandMissionBriefingPresentation } from '../islandRunMissionBriefing';

export const island17SpineMissionTests: TestCase[] = [
  {
    name: 'island 017: the tile pickups are Titan bones, and the briefing says collecting them rebuilds the spine',
    run: () => {
      const spine = STAGED_RESTORATION_MISSIONS[17];
      assertEqual(spine.pickupLabel, 'Titan Bone', 'bone pieces on the tiles');
      assertEqual(spine.stageCount, 8, 'eight sections');
      assertEqual(spine.chargeCostPerStage, 1, 'one bone per section');
      const briefing = getIslandMissionBriefingPresentation(17);
      assert(/collect the eight/i.test(briefing.missionStatement) && !/soul-bolt/i.test(briefing.fieldProtocol), 'briefing explains bones, not the phone');
    },
  },
  {
    name: 'island 017: a collected bone restores its section automatically; the phone never launches spine progress',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('const titanSpineAutoRestore = islandNumber === 17'), 'auto restore on collected bones');
      assert(/titanSpineAutoRestore[\s\S]{0,400}isRolling \|\| pendingHopSequence !== null \|\| doesModalOwnAttention \|\| missionOwnsController/.test(board), 'waits for the landing and any running spectacle');
      assert(board.includes("Island 017's spine rebuilds from collected bones, never from the phone."), 'phone button removed for the spine phase');
    },
  },
  {
    name: 'island 017: every restored section gets the full spectacle, and it owns the camera while it plays',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const spine = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island17SpineRestoration.ts', 'utf8');
      for (const beat of ['orb', 'ghost', 'spin.setFromAxisAngle', 'rings.forEach', 'sparks', 'pillar', 'material.emissive']) {
        assert(spine.includes(beat), `spectacle beat present: ${beat}`);
      }
      assert(spine.includes('TITAN_SPINE_FINALE_SECONDS'), 'the eighth section has an extended finale');
      const world = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island17TitansRestThreeWorld.ts', 'utf8');
      assert(world.includes("|| ribBridge.userData.missionRepairActive === true"), 'controller steps aside during the spectacle');
    },
  },
];
