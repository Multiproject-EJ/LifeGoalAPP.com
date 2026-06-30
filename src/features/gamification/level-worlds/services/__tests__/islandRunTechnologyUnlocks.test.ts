import { buildFreshIslandRunRecord } from '../islandRunProgressReset';
import { readIslandRunGameStateRecord, writeIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, refreshIslandRunStateFromLocal } from '../islandRunStateStore';
import { applyTechCollectionState, applyIslandRunTechnologyBuild } from '../islandRunStateActions';
import { getIslandTechnologyAccess, resolveIslandTechnologyBuildEligibility } from '../islandRunTechnologyUnlocks';
import { assert, assertDeepEqual, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'technology-unlocks-user';
const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function makeSession() {
  return { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: { id: USER_ID, user_metadata: {} } } as unknown as import('@supabase/supabase-js').Session;
}

function resetAll(): void {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
}

export const islandRunTechnologyUnlockTests: TestCase[] = [
  {
    name: 'eligibility requires distinct Island 1 slots 0-8 and reports missing slots',
    run: () => {
      const base = readIslandRunGameStateRecord(makeSession());
      assertDeepEqual(resolveIslandTechnologyBuildEligibility({ ...base, techCollectionByIsland: { '1': [0, 1, 1, 2, 99] } }, 'the-concord').missingSlots, [3, 4, 5, 6, 7, 8], 'duplicates and malformed values do not fake completion');
      assertEqual(resolveIslandTechnologyBuildEligibility({ ...base, techCollectionByIsland: { '1': ALL } }, 'the-concord').eligible, true, 'all slots eligible');
    },
  },
  {
    name: 'access helper is false before build and true after build',
    run: () => {
      const base = readIslandRunGameStateRecord(makeSession());
      assertDeepEqual(getIslandTechnologyAccess(base, 'the-concord'), { built: false, active: false, builtAtMs: null }, 'missing state safe');
      assertDeepEqual(getIslandTechnologyAccess({ ...base, technologyUnlocksById: { 'the-concord': { builtAtMs: 123, active: true } } }, 'the-concord'), { built: true, active: true, builtAtMs: 123 }, 'built access true');
    },
  },
  {
    name: 'canonical build action builds exactly once without touching rewards or slots',
    run: () => {
      resetAll();
      const session = makeSession();
      const base = readIslandRunGameStateRecord(session);
      void writeIslandRunGameStateRecord({ session, client: null, record: { ...base, dicePool: 7 } });
      refreshIslandRunStateFromLocal(session);
      applyTechCollectionState({ session, client: null, islandNumber: 1, collectedSlots: ALL, rewardedLines: [0, 1, 2] });
      const built = applyIslandRunTechnologyBuild({ session, client: null, technologyId: 'the-concord', source: 'island-1-tech-grid-completed', nowMs: 777 });
      assertEqual(built.reason, 'built', 'first call builds');
      assertEqual(built.changed, true, 'first call changes');
      assertEqual(built.record.technologyUnlocksById['the-concord']?.builtAtMs, 777, 'timestamp persisted');
      assertEqual(built.record.dicePool, 7, 'does not grant dice');
      assertDeepEqual(built.record.techCollectionByIsland['1'], ALL, 'does not alter collected slots');
      assertDeepEqual(built.record.techCollectionRewardedLinesByIsland['1'], [0, 1, 2], 'does not alter rewarded lines');
      const again = applyIslandRunTechnologyBuild({ session, client: null, technologyId: 'the-concord', source: 'island-1-tech-grid-completed', nowMs: 888 });
      assertEqual(again.reason, 'already-built', 'repeat is idempotent');
      assertEqual(again.changed, false, 'repeat does not change');
    },
  },
  {
    name: 'canonical build rejects incomplete grid and reset clears unlock',
    run: () => {
      resetAll();
      const session = makeSession();
      const rejected = applyIslandRunTechnologyBuild({ session, client: null, technologyId: 'the-concord', source: 'island-1-tech-grid-completed', nowMs: 1 });
      assertEqual(rejected.reason, 'requirements-not-met', 'incomplete grid rejected');
      const fresh = buildFreshIslandRunRecord(readIslandRunGameStateRecord(session));
      assertDeepEqual(fresh.technologyUnlocksById, {}, 'fresh reset removes unlock');
    },
  },
  {
    name: 'compatibility hydrates existing full-grid and later-island users without rewards',
    run: () => {
      resetAll();
      const session = makeSession();
      const base = readIslandRunGameStateRecord(session);
      void writeIslandRunGameStateRecord({ session, client: null, record: { ...base, dicePool: 5, techCollectionByIsland: { '1': ALL } } });
      const fullGrid = readIslandRunGameStateRecord(session);
      assertEqual(fullGrid.technologyUnlocksById['the-concord']?.active, true, 'full-grid user receives built access');
      assertEqual(fullGrid.dicePool, 5, 'compatibility does not replay dice');
      void writeIslandRunGameStateRecord({ session, client: null, record: { ...base, currentIslandNumber: 2, techCollectionByIsland: {} } });
      const later = readIslandRunGameStateRecord(session);
      assertEqual(later.technologyUnlocksById['the-concord']?.active, true, 'later-island established user receives compatibility access');
      const incomplete = readIslandRunGameStateRecord({ ...session, user: { ...session.user, id: `${USER_ID}-incomplete` } });
      assertEqual(Boolean(incomplete.technologyUnlocksById['the-concord']), false, 'incomplete Island 1 user remains unbuilt');
    },
  },
];
