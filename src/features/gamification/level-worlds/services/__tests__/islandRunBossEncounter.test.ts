import {
  BOSS_ARENA_NOT_BUILT_REASON,
  BOSS_ALREADY_DEFEATED_REASON,
  canChallengeBoss,
  getBossChallengeLockReason,
  isBossArenaFullyBuilt,
  resolveBossCreatureArtState,
} from '../islandRunBossEncounter';
import { MAX_BUILD_LEVEL, type IslandRunContractV2BuildState } from '../islandRunContractV2EssenceBuild';
import { assertEqual, type TestCase } from './testHarness';

function buildState(buildLevel: number): IslandRunContractV2BuildState {
  return {
    requiredEssence: 20,
    spentEssence: 0,
    buildLevel,
  };
}

function buildStates(bossBuildLevel: number): IslandRunContractV2BuildState[] {
  return [0, 1, 2, 3, bossBuildLevel].map(buildState);
}

export const islandRunBossEncounterTests: TestCase[] = [
  {
    name: 'boss arena is not fully built before boss stop reaches max build level',
    run: () => {
      const stopBuildStateByIndex = buildStates(MAX_BUILD_LEVEL - 1);
      assertEqual(
        isBossArenaFullyBuilt({ stopBuildStateByIndex }),
        false,
        'Boss arena should remain unbuilt until the boss stop reaches max level',
      );
      assertEqual(
        resolveBossCreatureArtState({ stopBuildStateByIndex, isBossDefeated: false }),
        'hidden',
        'Boss creature should stay hidden while the arena is unfinished',
      );
      assertEqual(
        canChallengeBoss({ stopBuildStateByIndex, isBossDefeated: false }),
        false,
        'Boss challenge should be blocked while the arena is unfinished',
      );
      assertEqual(
        getBossChallengeLockReason({ stopBuildStateByIndex, isBossDefeated: false }),
        BOSS_ARENA_NOT_BUILT_REASON,
        'Unbuilt arena should explain the boss-awaken requirement',
      );
    },
  },
  {
    name: 'boss creature appears alive and challenge unlocks when arena is fully built',
    run: () => {
      const stopBuildStateByIndex = buildStates(MAX_BUILD_LEVEL);
      assertEqual(
        isBossArenaFullyBuilt({ stopBuildStateByIndex }),
        true,
        'Boss arena should be built once the boss stop reaches max level',
      );
      assertEqual(
        resolveBossCreatureArtState({ stopBuildStateByIndex, isBossDefeated: false }),
        'alive',
        'Boss creature should appear alive after the arena is fully built',
      );
      assertEqual(
        canChallengeBoss({ stopBuildStateByIndex, isBossDefeated: false }),
        true,
        'Boss challenge should unlock after the arena is fully built',
      );
      assertEqual(
        getBossChallengeLockReason({ stopBuildStateByIndex, isBossDefeated: false }),
        null,
        'Built undefeated boss should have no challenge lock reason',
      );
    },
  },
  {
    name: 'defeated boss uses defeated art state and blocks repeat challenges',
    run: () => {
      const stopBuildStateByIndex = buildStates(MAX_BUILD_LEVEL);
      assertEqual(
        resolveBossCreatureArtState({ stopBuildStateByIndex, isBossDefeated: true }),
        'defeated',
        'Defeated boss should use defeated art state after arena is built',
      );
      assertEqual(
        canChallengeBoss({ stopBuildStateByIndex, isBossDefeated: true }),
        false,
        'Defeated boss should not be challengeable again',
      );
      assertEqual(
        getBossChallengeLockReason({ stopBuildStateByIndex, isBossDefeated: true }),
        BOSS_ALREADY_DEFEATED_REASON,
        'Defeated boss should explain repeat challenge lock',
      );
    },
  },
];
