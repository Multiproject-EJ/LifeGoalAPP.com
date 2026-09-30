import type { Session } from '@supabase/supabase-js';
import { readIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, writeIslandRunGameStateRecord } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, resetIslandRunStateSnapshot } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import {
  WISDOM_DEFERRAL_ROLLS,
  WISDOM_DEFERRAL_KEY_PATTERN,
  WISDOM_PROMPT_POOL_SIZE,
  applyWisdomDeferral,
  applyWisdomDeferralRoll,
  createWisdomDeferral,
  getWisdomDeferralKey,
  mergeWisdomDeferral,
  resolveWisdomDeferral,
  resolveWisdomPromptActivityId,
  resolveWisdomPromptPool,
} from '../wisdomDeferral';
import { deferWisdomStop } from '../wisdomDeferralActions';
import { getActivityForIsland } from '../../../../compass-book/content/compassBookCurriculum';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const session = { user: { id: 'wisdom-deferral-test', user_metadata: {} } } as Session;

export const wisdomDeferralTests: TestCase[] = [
  {
    name: 'wisdom deferral: every island has 5 distinct prompts, own prompt first; Island 001 First Signal never rotates',
    run: () => {
      for (const island of [2, 3, 10, 40, 60]) {
        const pool = resolveWisdomPromptPool(island);
        assertEqual(pool.length, WISDOM_PROMPT_POOL_SIZE, `island ${island}: 5 prompts`);
        assertEqual(new Set(pool).size, pool.length, `island ${island}: distinct`);
        assertEqual(pool[0], getActivityForIsland(island)!.id, `island ${island}: own prompt first`);
      }
      assertEqual(resolveWisdomPromptPool(1).length, 1, 'First Signal is fixed');
    },
  },
  {
    name: 'wisdom deferral: each "come back later" asks something different, skipping answered prompts',
    run: () => {
      const pool = resolveWisdomPromptPool(5);
      assertEqual(resolveWisdomPromptActivityId({ islandNumber: 5, deferrals: 0 }), pool[0], 'first visit: own prompt');
      assertEqual(resolveWisdomPromptActivityId({ islandNumber: 5, deferrals: 1 }), pool[1], 'after one skip: the next prompt');
      assertEqual(resolveWisdomPromptActivityId({ islandNumber: 5, deferrals: 2, isAnswered: (id) => id === pool[2] }), pool[3], 'answered prompts are skipped');
      assertEqual(resolveWisdomPromptActivityId({ islandNumber: 5, deferrals: 1, isAnswered: () => true }), pool[1], 'all answered: keep rotating');
    },
  },
  {
    name: 'wisdom deferral: away for 3 rolls, counted down by rolls; sanitize and merge are safe',
    run: () => {
      const deferred = applyWisdomDeferral(createWisdomDeferral(), 10);
      assertEqual(deferred.rollsRemaining, WISDOM_DEFERRAL_ROLLS, 'three rolls away');
      assertEqual(deferred.deferrals, 1, 'counted');
      let ledger: Record<string, unknown> = { [getWisdomDeferralKey(0, 4)]: deferred };
      for (let roll = 1; roll <= 4; roll += 1) ledger = applyWisdomDeferralRoll(ledger, 0, 4, 10 + roll);
      assertEqual(resolveWisdomDeferral(ledger, 0, 4).rollsRemaining, 0, 'never below zero');
      const untouched = { other: 1 };
      assertEqual(applyWisdomDeferralRoll(untouched, 0, 4, 1), untouched, 'no entry, no change');
      assert(WISDOM_DEFERRAL_KEY_PATTERN.test(getWisdomDeferralKey(2, 17)) && !WISDOM_DEFERRAL_KEY_PATTERN.test('0:4'), 'own key');
      const clean = sanitizeIslandRunSignatureMissionProgress({ [getWisdomDeferralKey(0, 4)]: { ...deferred, rollsRemaining: 99 } });
      assertEqual(resolveWisdomDeferral(clean, 0, 4).rollsRemaining, WISDOM_DEFERRAL_ROLLS, 'forged countdown clamps');
      const newer = applyWisdomDeferral(deferred, 20);
      assertEqual(mergeWisdomDeferral(deferred, newer).deferrals, 2, 'newest deferral wins');
      assertEqual(mergeWisdomDeferral({ ...deferred, rollsRemaining: 1 }, deferred).rollsRemaining, 1, 'lower countdown wins');
    },
  },
  {
    name: 'wisdom deferral: canonical action records the cooldown; the board gates the stop and rotates the prompt',
    run: async () => {
      resetIslandRunRuntimeCommitCoordinatorForTests(); __resetIslandRunStateStoreForTests(); __resetIslandRunActionMutexesForTests();
      installWindowWithStorage(createMemoryStorage());
      const state = { ...readIslandRunGameStateRecord(session), currentIslandNumber: 4, cycleIndex: 0 };
      await writeIslandRunGameStateRecord({ session, client: null, record: state });
      resetIslandRunStateSnapshot(session, state);
      await deferWisdomStop({ session, client: null, nowMs: 50 });
      const after = resolveWisdomDeferral(getIslandRunStateSnapshot(session).signatureMissionProgressByIsland, 0, 4);
      assert(after.deferrals === 1 && after.rollsRemaining === WISDOM_DEFERRAL_ROLLS, 'committed');
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes("if (activeStopId === 'wisdom') {") && board.includes('void deferWisdomStop({ session, client })'), 'Come back later works on Wisdom');
      assert(board.includes("if (stopId === 'wisdom' && wisdomCooldownText) {"), 'taps wait for the cooldown');
      assert(board.includes("if (doorStopId === 'wisdom' && wisdomCooldownText) {"), 'door landings wait for the cooldown');
      assert(board.includes('wisdomDeferrals={wisdomDeferral.deferrals}'), 'the encounter rotates its prompt');
      const roll = fsMod.readFileSync('src/features/gamification/level-worlds/services/islandRunRollAction.ts', 'utf8');
      assert(roll.includes('applyWisdomDeferralRoll('), 'rolls count the cooldown down');
    },
  },
  {
    name: 'event arena: a round-owed Arena always offers "Leave for now" and stops auto-reopening until the next roll',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const modal = fsMod.readFileSync('src/features/gamification/level-worlds/components/EventArenaLandmarkModal.tsx', 'utf8');
      assert(modal.includes('Leave for now') && modal.includes('onClick={onLeaveForNow}'), 'an exit button while the round is owed');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes('!arenaResumeSuppressed') && board.includes('setArenaResumeSuppressed(true);'), 'leaving pauses the auto-reopen loop');
      assert(board.includes("} else if (rollResult.status === 'arena_activity_required') {\n        setActiveStopId('mystery');"), 'a roll attempt still brings the Arena back');
    },
  },
];
