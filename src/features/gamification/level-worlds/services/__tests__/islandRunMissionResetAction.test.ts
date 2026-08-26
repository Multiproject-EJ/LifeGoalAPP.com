import type { Session } from '@supabase/supabase-js';
import { getIslandMissionBriefingBeatId } from '../islandRunMissionBriefing';
import {
  buildCurrentIslandMissionResetRecord,
  resetCurrentIslandMissionForDev,
} from '../islandRunMissionResetAction';
import {
  SUNKEN_SANDS_FIRST_TREASURE_ID,
  getIslandRunSignatureMissionKey,
} from '../islandRunSignatureMissions';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  assert,
  assertDeepEqual,
  assertEqual,
  createMemoryStorage,
  installWindowWithStorage,
  type TestCase,
} from './testHarness';

const USER_ID = 'mission-reset-action-test-user';
const makeSession = () => ({
  user: { id: USER_ID, user_metadata: {} },
} as unknown as Session);

function resetHarness(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

async function seedCompletedIslandTwoMission(): Promise<Session> {
  resetHarness();
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const currentMissionKey = getIslandRunSignatureMissionKey(0, 2);
  const otherMissionKey = getIslandRunSignatureMissionKey(0, 12);
  const briefingBeatId = getIslandMissionBriefingBeatId(0, 2);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      runtimeVersion: 7,
      currentIslandNumber: 2,
      cycleIndex: 0,
      dicePool: 37,
      essence: 222,
      activeStopIndex: 4,
      activeStopType: 'boss',
      bossTrialResolvedIslandNumber: 2,
      bossState: { unlocked: true, objectiveComplete: true, buildComplete: true, completedAtMs: 99 },
      stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: true, buildComplete: true })),
      stopBuildStateByIndex: Array.from({ length: 5 }, () => ({ requiredEssence: 100, spentEssence: 300, buildLevel: 3 })),
      completedStopsByIsland: { ...base.completedStopsByIsland, '2': ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'], '9': ['habit'] },
      stopTicketsPaidByIsland: { ...base.stopTicketsPaidByIsland, '2': [1, 2, 3, 4], '9': [1] },
      techCollectionByIsland: { ...base.techCollectionByIsland, '2': [0, 1, 2] },
      narrativeSeenState: {
        episodes: { keeper: 50 },
        beats: { [briefingBeatId]: 60, unrelated: 70 },
      },
      signatureMissionProgressByIsland: {
        [currentMissionKey]: {
          missionId: 'celestial-great-redocking',
          version: 1,
          rollsCompleted: 20,
          completedAtMs: 80,
          updatedAtMs: 80,
        },
        [otherMissionKey]: {
          missionId: 'sunken-sands-first-treasure',
          version: 1,
          treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
          rollsCompleted: 3,
          revealedAtMs: null,
          claimedAtMs: null,
          updatedAtMs: 40,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
  return session;
}

export const islandRunMissionResetActionTests: TestCase[] = [
  {
    name: 'builder clears only the loaded island mission while preserving player resources and collections',
    run: async () => {
      const session = await seedCompletedIslandTwoMission();
      const before = readIslandRunGameStateRecord(session);
      const after = buildCurrentIslandMissionResetRecord(before);
      const currentMissionKey = getIslandRunSignatureMissionKey(0, 2);
      const otherMissionKey = getIslandRunSignatureMissionKey(0, 12);
      const briefingBeatId = getIslandMissionBriefingBeatId(0, 2);

      assertEqual(after.runtimeVersion, before.runtimeVersion + 1, 'reset should bump runtime version once');
      assertEqual(after.dicePool, before.dicePool, 'dice should be preserved');
      assertEqual(after.essence, before.essence, 'essence should be preserved');
      assertDeepEqual(after.techCollectionByIsland, before.techCollectionByIsland, 'collections should be preserved');
      assertEqual(after.signatureMissionProgressByIsland[currentMissionKey], undefined, 'current signature mission should clear');
      assert(after.signatureMissionProgressByIsland[otherMissionKey] !== undefined, 'another island mission should remain');
      assertEqual(after.narrativeSeenState.beats[briefingBeatId], undefined, 'current briefing should become replayable');
      assertEqual(after.narrativeSeenState.beats.unrelated, 70, 'unrelated narrative memory should remain');
      assertDeepEqual(after.completedStopsByIsland['2'], [], 'current completion ledger should clear');
      assertDeepEqual(after.completedStopsByIsland['9'], ['habit'], 'other completion ledgers should remain');
      assert(after.stopStatesByIndex.every((stop) => !stop.objectiveComplete && !stop.buildComplete), 'all current stop states should reset');
      assert(after.stopBuildStateByIndex.every((stop) => stop.buildLevel === 0 && stop.spentEssence === 0), 'all current builds should reset');
      assertEqual(after.bossTrialResolvedIslandNumber, null, 'current boss compatibility marker should clear');
    },
  },
  {
    name: 'canonical action persists the reset through the shared store',
    run: async () => {
      const session = await seedCompletedIslandTwoMission();
      const result = await resetCurrentIslandMissionForDev({ session, client: null });
      const persisted = readIslandRunGameStateRecord(session);

      assertEqual(result.status, 'reset', 'action should report reset');
      assertEqual(result.islandNumber, 2, 'action should report the loaded island');
      assertEqual(persisted.runtimeVersion, result.record.runtimeVersion, 'persisted version should match action record');
      assertDeepEqual(persisted.completedStopsByIsland['2'], [], 'persisted current stops should be cleared');
      assertEqual(
        persisted.signatureMissionProgressByIsland[getIslandRunSignatureMissionKey(0, 2)],
        undefined,
        'persisted signature mission should be cleared',
      );
    },
  },
];
