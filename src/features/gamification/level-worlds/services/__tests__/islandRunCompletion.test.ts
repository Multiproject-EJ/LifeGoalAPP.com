import type { Session } from '@supabase/supabase-js';
import { resolveIslandRunCompletion, shouldAutoPresentIslandCompletion } from '../islandRunCompletion';
import { resolveIslandMissionTrackerPresentation } from '../islandRunMissionTracker';
import { readIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, writeIslandRunGameStateRecord } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, refreshIslandRunStateFromLocal } from '../islandRunStateStore';
import { applyStopBuildSpendBatch, travelToNextIsland } from '../islandRunStateActions';
import { detonateFirstLightAssemblyCharge, signFirstLightAssemblyMandate } from '../islandRunSignatureMissionAction';
import { FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES, getIslandRunSignatureMissionKey } from '../islandRunSignatureMissions';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const session = { user: { id: 'completion-repair-test' } } as Session;
function reset() {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}
function completeState(islandNumber = 2) {
  const state = readIslandRunGameStateRecord(session);
  return { ...state, currentIslandNumber: islandNumber, cycleIndex: 0,
    firstSessionTutorialState: 'complete' as const,
    bossTrialResolvedIslandNumber: islandNumber,
    completedStopsByIsland: {},
    stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: true, buildComplete: true })),
    stopBuildStateByIndex: Array.from({ length: 5 }, () => ({ requiredEssence: 100, spentEssence: 100, buildLevel: 3 })),
    perIslandEggs: { [islandNumber]: { tier: 'common' as const, setAtMs: 1, hatchAtMs: 2, status: 'collected' as const } },
  };
}
export const islandRunCompletionTests: TestCase[] = [
  {
    name: 'last ordinary landmark spend produces 100%, then cycle wrap cannot inherit the completed visit',
    run: async () => {
      reset();
      const state = completeState(120);
      state.essence = 500;
      state.stopBuildStateByIndex[4] = { buildLevel: 2, requiredEssence: 100, spentEssence: 90 };
      state.stopStatesByIndex[4].buildComplete = false;
      await writeIslandRunGameStateRecord({ session, client: null, record: state });
      refreshIslandRunStateFromLocal(session);
      assert(!resolveIslandRunCompletion(getIslandRunStateSnapshot(session)).complete, 'Last part is genuinely required');
      const built = await applyStopBuildSpendBatch({ session, client: null, stopIndex: 4, effectiveIslandNumber: 120, maxSteps: 1, spendAmount: 10 });
      assertEqual(built.record.stopStatesByIndex[4].buildComplete, true, 'Final build flag is committed');
      const completion = resolveIslandRunCompletion(built.record);
      assertEqual(completion.percent, 100, 'Last spend updates completion immediately');
      assert(shouldAutoPresentIslandCompletion({ complete: completion.complete, visitKey: completion.visitKey, shownVisitKey: null, busy: false, isPreview: false }), 'Last build opens completion sequence');
      const traveled = await travelToNextIsland({ session, client: null, nextIsland: 121, completedVisitKey: '0:120', startTimer: true, nowMs: 12345, getIslandDurationMs: () => 0, islandRunContractV2Enabled: true });
      assertEqual(traveled.resolvedIsland, 1, 'Capstone wraps to Island 001');
      assertEqual(traveled.nextCycleIndex, 1, 'Wrap advances the cycle');
      assert(!resolveIslandRunCompletion(traveled.record).complete, 'New cycle is not auto-completed from the previous visit');
    },
  },
  {
    name: 'legacy Concord completion and Island 020 extraction retain their explicit gates',
    run: () => {
      reset();
      const legacy = { ...completeState(1), technologyUnlocksById: { 'the-concord': { active: true, builtAtMs: 1 } } };
      assert(resolveIslandRunCompletion(legacy).complete, 'Previously completed Concord-era Island 001 remains eligible');
      const lava = completeState(20);
      assert(resolveIslandRunCompletion(lava).baseComplete, 'Ordinary completion unlocks the extraction');
      assertEqual(resolveIslandRunCompletion(lava).nextRequirement?.id, 'extraction', 'Cannot leave before extraction');
      const extracted = { ...lava, signatureMissionProgressByIsland: { [getIslandRunSignatureMissionKey(0, 20)]: {
        missionId: 'escape-lava-labyrinth' as const, version: 1 as const,
        claimedPickupTileIndices: [], chargesEarned: 15, chargesSpent: 15, activatedStages: 5,
        lastActivatedStage: 4, startedAtMs: 1, completedAtMs: 2, finaleCompletedAtMs: 3, updatedAtMs: 3,
      } } };
      assert(resolveIslandRunCompletion(extracted).complete, 'Successful extraction enables departure');
    },
  },
  {
    name: 'all 120 islands use genuine completion with explicit Assembly and extraction exceptions',
    run: () => {
      reset();
      for (let island = 1; island <= 120; island++) {
        const result = resolveIslandRunCompletion(completeState(island));
        assertEqual(result.complete, island !== 1 && island !== 20, `Island ${island} completion gate`);
        assertEqual(result.percent === 100, result.complete, `Island ${island} has truthful 100%`);
      }
    },
  },
  {
    name: 'built landmarks register in every mission without awarding unfinished activities or eggs',
    run: () => {
      reset();
      for (let island = 1; island <= 120; island++) {
        const state = { ...completeState(island), perIslandEggs: {},
          stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: false })),
        };
        const tracker = resolveIslandMissionTrackerPresentation({ islandNumber: island, state });
        for (const item of tracker.objectives.filter(item => item.label === 'Build Landmarks')) {
          assertEqual(item.value, item.target, `Island ${island} counts funded L3 despite stale flags/incomplete activities`);
        }
        assertEqual(resolveIslandRunCompletion(state).complete, false, 'Construction alone cannot complete the island');
      }
    },
  },
  {
    name: 'completion preserves completed-stop ledger credit and rejects partial builds and ready eggs',
    run: () => {
      reset();
      const state = { ...completeState(), completedStopsByIsland: { '2': ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'] },
        stopStatesByIndex: Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: false })),
      };
      assert(resolveIslandRunCompletion(state).complete, 'Persisted objective evidence is not lost to stale mirrors');
      const incomplete = { ...state, stopBuildStateByIndex: state.stopBuildStateByIndex.map((entry, i) => i === 4 ? { ...entry, buildLevel: 2 } : entry) };
      assert(!resolveIslandRunCompletion(incomplete).complete, 'A nearly finished L2 is not L3');
      assert(!resolveIslandRunCompletion({ ...state, perIslandEggs: { '2': { ...state.perIslandEggs[2], status: 'ready' } } }).complete, 'Ready egg must still be resolved');
    },
  },
  {
    name: 'completion auto-presentation waits for attention and runs once per visit, including reload recovery',
    run: () => {
      const options = { complete: true, visitKey: '0:2', shownVisitKey: null, busy: false, isPreview: false };
      assert(shouldAutoPresentIslandCompletion(options), 'Recovered completed save opens celebration');
      assert(!shouldAutoPresentIslandCompletion({ ...options, busy: true }), 'Does not interrupt signing/build review/roll');
      assert(!shouldAutoPresentIslandCompletion({ ...options, isPreview: true }), 'Art preview cannot trigger gameplay departure');
      assert(!shouldAutoPresentIslandCompletion({ ...options, shownVisitKey: '0:2' }), 'Keep playing suppresses repeated auto-opening');
      assert(shouldAutoPresentIslandCompletion({ ...options, shownVisitKey: '0:1' }), 'Next visit can celebrate');
      assert(!shouldAutoPresentIslandCompletion({ ...options, complete: false }), 'Incomplete island never auto-clears');
    },
  },
  {
    name: 'Island 001 real charge, build, sign and guarded travel actions reach Island 002 exactly once',
    run: async () => {
      reset();
      const key = getIslandRunSignatureMissionKey(0, 1);
      const state = { ...completeState(1), essence: 100_000,
        stopStatesByIndex: Array.from({ length: 5 }, (_, i) => ({ objectiveComplete: i < 4, buildComplete: false })),
        stopBuildStateByIndex: Array.from({ length: 5 }, () => ({ requiredEssence: 10, spentEssence: 0, buildLevel: 0 })),
        bossTrialResolvedIslandNumber: null,
        signatureMissionProgressByIsland: { [key]: { missionId: 'first-light-assembly-crater' as const, version: 2 as const,
          claimedDynamiteTileIndices: [...FIRST_LIGHT_ASSEMBLY_DYNAMITE_TILE_INDICES], chargesDetonated: 0,
          lastDetonatedSector: null, startedAtMs: 1, completedAtMs: null, updatedAtMs: 1,
        } },
      };
      await writeIslandRunGameStateRecord({ session, client: null, record: state });
      refreshIslandRunStateFromLocal(session);
      for (let i = 0; i < 3; i++) assertEqual((await detonateFirstLightAssemblyCharge({ session, client: null })).status, 'ok', 'Each authored batch commits');
      for (let stopIndex = 0; stopIndex < 4; stopIndex++) {
        for (let level = 0; level < 3; level++) {
          const result = await applyStopBuildSpendBatch({ session, client: null, stopIndex, effectiveIslandNumber: 1, maxSteps: 1000, spendAmount: 10000 });
          assertEqual(result.record.stopBuildStateByIndex[stopIndex].buildLevel, level + 1, 'Canonical spend completes exactly one level');
        }
      }
      const unsigned = getIslandRunStateSnapshot(session);
      assertEqual(resolveIslandRunCompletion(unsigned).nextRequirement?.id, 'mandate', 'Mandate is the visible final requirement');
      assertEqual((await signFirstLightAssemblyMandate({ session, client: null })).status, 'ok', 'Sign appointment once');
      assertEqual((await signFirstLightAssemblyMandate({ session, client: null })).status, 'already_signed', 'No repeated signing reward/write');
      const ready = getIslandRunStateSnapshot(session);
      assertEqual(resolveIslandRunCompletion(ready).percent, 100, 'Assembly + four L3 activities + egg + mandate is 100%');
      const args = { session, client: null, nextIsland: 2, completedVisitKey: '0:1', startTimer: true, nowMs: 12345, getIslandDurationMs: () => 0, islandRunContractV2Enabled: true };
      const traveled = await travelToNextIsland(args);
      assertEqual(traveled.resolvedIsland, 2, 'Normal departure reaches Island 002');
      assert(traveled.record.stopBuildStateByIndex.every(build => build.buildLevel === 0), 'New island starts with unfunded buildings');
      assertEqual(traveled.record.dicePool, ready.dicePool, 'Travel preserves dice');
      assertEqual(traveled.record.essence, ready.essence, 'Travel preserves essence');
      const version = traveled.record.runtimeVersion;
      let rejected = false;
      try { await travelToNextIsland(args); } catch { rejected = true; }
      assert(rejected, 'Stale duplicate departure is rejected');
      assertEqual(getIslandRunStateSnapshot(session).runtimeVersion, version, 'Rejected departure cannot reset progress or pay rewards');
    },
  },
];
