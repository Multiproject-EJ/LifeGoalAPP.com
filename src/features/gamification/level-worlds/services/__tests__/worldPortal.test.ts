import type { Session } from '@supabase/supabase-js';
import { acceptWorldPortal } from '../worldPortalActions';
import { canAttendWorldPortalCouncil, resolveWorldPortalProgress, sanitizeWorldPortalProgress, WORLD_PORTAL_KEY } from '../worldPortalProgress';
import { mergeIslandRunSignatureMissionProgress, sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { hasSavedIslandRunRecord, readIslandRunGameStateRecord, writeIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, mergeRecordForConflict } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, resetIslandRunStateSnapshot } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import { assert, assertEqual, assertDeepEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';
const session = { user: { id: 'portal-test-owner', user_metadata: {} } } as Session;
const receipt = (at = 100) => ({ missionId: 'world-portal' as const, version: 1 as const, acceptedAtMs: at, updatedAtMs: at });
async function seed(island = 40, cycle = 0) {
  __resetIslandRunStateStoreForTests(); __resetIslandRunActionMutexesForTests(); resetIslandRunRuntimeCommitCoordinatorForTests();
  const storage = createMemoryStorage(); installWindowWithStorage(storage);
  const state = { ...readIslandRunGameStateRecord(session), currentIslandNumber: island, cycleIndex: cycle };
  await writeIslandRunGameStateRecord({ session, client: null, record: state });
  resetIslandRunStateSnapshot(session, state);
  return { state, storage };
}
const accept = (expectedIsland = 40, expectedCycle = 0) => acceptWorldPortal({ session, client: null, expectedIsland, expectedCycle });
export const worldPortalTests: TestCase[] = [
  { name: 'offline entry requires a usable owner-scoped local save, not a default or corrupt record', async run() {
    installWindowWithStorage(createMemoryStorage());
    assertEqual(hasSavedIslandRunRecord(session), false, 'missing save is not playable proof');
    const { storage } = await seed();
    assertEqual(hasSavedIslandRunRecord(session), true, 'real saved run is available');
    for (let i = 0; i < storage.length; i++) storage.setItem(storage.key(i)!, '{broken');
    assertEqual(hasSavedIslandRunRecord(session), false, 'corrupt save fails closed');
    storage.getItem = () => { throw Error('Storage unavailable'); };
    assertEqual(hasSavedIslandRunRecord(session), false, 'unavailable storage fails closed');
  }},
  { name: 'portal arrival boundary and later-cycle catch-up use island progress, not rank', run() {
    for (let island = 1; island <= 120; island++) assertEqual(canAttendWorldPortalCouncil({ currentIslandNumber: island, cycleIndex: 0 }), island >= 40, 'island threshold');
    assert(canAttendWorldPortalCouncil({ currentIslandNumber: 1, cycleIndex: 1 }), 'later-cycle catch-up');
    assert(!canAttendWorldPortalCouncil({ currentIslandNumber: NaN, cycleIndex: NaN }), 'invalid progress');
  }},
  { name: 'portal sanitizer accepts only the versioned receipt under its global key', run() {
    for (const value of [null, {}, [], { ...receipt(), version: 2 }, { ...receipt(), acceptedAtMs: NaN }, { ...receipt(), acceptedAtMs: 0 }, { ...receipt(), acceptedAtMs: 1.5 }])
      assertEqual(sanitizeWorldPortalProgress(value), null, 'malformed receipt rejected');
    assertDeepEqual(sanitizeIslandRunSignatureMissionProgress({ wrong: receipt() }), {}, 'wrong key');
    assertDeepEqual(sanitizeIslandRunSignatureMissionProgress({ [WORLD_PORTAL_KEY]: { ...receipt(), answers: 'not retained' } }), { [WORLD_PORTAL_KEY]: receipt() }, 'bounded data only');
  }},
  { name: 'portal survives omission, stale timestamps, serialization and both conflict directions', run() {
    const first = { [WORLD_PORTAL_KEY]: receipt(100) }, later = { [WORLD_PORTAL_KEY]: receipt(200) };
    for (const [a,b] of [[first, {}], [{}, first], [first,later], [later,first]]) {
      assertDeepEqual(sanitizeIslandRunSignatureMissionProgress(JSON.parse(JSON.stringify(mergeIslandRunSignatureMissionProgress(a,b)))), first, 'first handover retained');
    }
  }},
  { name: 'concurrent acceptance saves once, reloads and changes no gameplay rewards', async run() {
    const { state: before } = await seed();
    const results = await Promise.all([accept(), accept(), accept()]);
    assert(results.every(r => r.status === 'saved-on-device'), 'idempotent responses');
    const after = getIslandRunStateSnapshot(session);
    assertEqual(after.runtimeVersion, before.runtimeVersion + 1, 'one commit');
    assertDeepEqual({ ...after, runtimeVersion: before.runtimeVersion, signatureMissionProgressByIsland: before.signatureMissionProgressByIsland }, before, 'all unrelated gameplay identical');
    __resetIslandRunStateStoreForTests();
    assert(resolveWorldPortalProgress(getIslandRunStateSnapshot(session).signatureMissionProgressByIsland), 'reload preserves receipt');
    const version = getIslandRunStateSnapshot(session).runtimeVersion;
    await accept();
    assertEqual(getIslandRunStateSnapshot(session).runtimeVersion, version, 'replay does not commit');
  }},
  { name: 'pre-040 players and stale island/cycle callbacks cannot claim', async run() {
    await seed(39);
    assertEqual((await accept(39)).status, 'not-eligible', 'no premature grant');
    assertEqual((await accept()).status, 'journey-changed', 'stale preview cannot grant');
    await seed(40, 1);
    assertEqual((await accept(40, 0)).status, 'journey-changed', 'cycle context checked');
    assertEqual(resolveWorldPortalProgress(getIslandRunStateSnapshot(session).signatureMissionProgressByIsland), null, 'no receipt');
  }},
  { name: 'later players recover the council and ownership survives cycle/conflict merge', async run() {
    await seed(1, 1); await accept(1, 1);
    const earned = getIslandRunStateSnapshot(session);
    const old = { ...earned, currentIslandNumber: 1, cycleIndex: 2, signatureMissionProgressByIsland: {} };
    for (const [remote,local] of [[earned,old],[old,earned]])
      assert(resolveWorldPortalProgress(mergeRecordForConflict({ remote,local }).signatureMissionProgressByIsland), 'receipt survives full-record merge');
  }},
  { name: 'portal receipt is isolated by save owner', async run() {
    await seed(); await accept();
    const other = { user: { id: 'different-portal-owner', user_metadata: {} } } as Session;
    assertEqual(resolveWorldPortalProgress(getIslandRunStateSnapshot(other).signatureMissionProgressByIsland), null, 'other owner has no portal');
    assertEqual((await acceptWorldPortal({ session: other, client: null, expectedIsland: 1, expectedCycle: 0 })).status, 'not-eligible', 'other owner cannot inherit');
  }},
  { name: 'storage failure is not called saved and retry persists the same receipt', async run() {
    const { storage } = await seed();
    const setItem = storage.setItem;
    storage.setItem = () => { throw new Error('Storage full'); };
    assertEqual((await accept()).status, 'storage-unavailable', 'honest failure');
    const pending = resolveWorldPortalProgress(getIslandRunStateSnapshot(session).signatureMissionProgressByIsland);
    storage.setItem = setItem;
    assertEqual((await accept()).status, 'saved-on-device', 'retry succeeds');
    assertDeepEqual(resolveWorldPortalProgress(readIslandRunGameStateRecord(session).signatureMissionProgressByIsland), pending, 'same receipt, no second handover');
  }},
];
