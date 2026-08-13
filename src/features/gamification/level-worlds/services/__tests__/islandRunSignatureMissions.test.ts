import {
  FROSTWELL_DEPTH_METERS,
  FROSTWELL_DRILL_TILE_INDICES,
  getFrostwellAvailableSpins,
  getFrostwellIceworksTechCost,
  getIslandRunSignatureMissionKey,
  grantFrostwellDrillSpinForLanding,
  mergeIslandRunSignatureMissionProgress,
  resolveFrostwellIceworksProgress,
  resolveFrostwellSpinMeters,
  sanitizeIslandRunSignatureMissionProgress,
} from '../islandRunSignatureMissions';
import { fundFrostwellIceworks, spinFrostwellDrillWheel } from '../islandRunSignatureMissionAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import {
  __resetIslandRunStateStoreForTests,
  refreshIslandRunStateFromLocal,
} from '../islandRunStateStore';
import { applyLandmarkDoorTiles, generateTileMap, getIslandRarity } from '../islandBoardTileMap';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'signature-mission-test-user';
const makeSession = () => ({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: { id: USER_ID, user_metadata: {} } }) as unknown as import('@supabase/supabase-js').Session;

async function seedFrostwell(options: { essence?: number; meters?: number; spinsEarned?: number; spinsUsed?: number } = {}): Promise<void> {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const key = getIslandRunSignatureMissionKey(0, 3);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 3,
      cycleIndex: 0,
      essence: options.essence ?? 1_500,
      essenceLifetimeSpent: 20,
      signatureMissionProgressByIsland: {
        [key]: {
          missionId: 'frostwell-iceworks', version: 2,
          metersDrilled: options.meters ?? FROSTWELL_DEPTH_METERS,
          spinsEarned: options.spinsEarned ?? 0,
          spinsUsed: options.spinsUsed ?? 0,
          lastSpinMeters: null, builtAtMs: null, updatedAtMs: 1,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
}

export const islandRunSignatureMissionTests: TestCase[] = [
  {
    name: 'Frostwell exposes exactly three stable drill tiles clear of landmark doors',
    run: () => {
      assertEqual(FROSTWELL_DRILL_TILE_INDICES.length, 3, 'exactly three mission tiles ship');
      const map = applyLandmarkDoorTiles(generateTileMap(3, getIslandRarity(3), 'frostmoon', 2), { expandedActiveStopId: 'hatchery' });
      FROSTWELL_DRILL_TILE_INDICES.forEach((index) => {
        assertEqual(map[index]?.signatureMissionKind, 'frostwell_drill', `tile ${index} carries drill marker`);
        assert(map[index]?.tileType !== 'landmark_door', `tile ${index} remains clear of a door cluster`);
      });
    },
  },
  {
    name: 'Frostwell grants one queued spin only for an Island 003 drill-tile landing',
    run: () => {
      const first = grantFrostwellDrillSpinForLanding({ ledger: {}, islandNumber: 3, cycleIndex: 0, tileIndex: FROSTWELL_DRILL_TILE_INDICES[0], nowMs: 10 });
      const progress = resolveFrostwellIceworksProgress({ ledger: first.ledger, islandNumber: 3, cycleIndex: 0 });
      assertEqual(first.granted, true, 'mission tile grants a spin');
      assertEqual(getFrostwellAvailableSpins(progress), 1, 'spin is queued');
      assertEqual(grantFrostwellDrillSpinForLanding({ ledger: first.ledger, islandNumber: 3, cycleIndex: 0, tileIndex: 2, nowMs: 11 }).granted, false, 'ordinary tile does not grant');
      assertEqual(grantFrostwellDrillSpinForLanding({ ledger: {}, islandNumber: 2, cycleIndex: 0, tileIndex: FROSTWELL_DRILL_TILE_INDICES[0], nowMs: 12 }).granted, false, 'other islands do not grant');
    },
  },
  {
    name: 'Frostwell wheel resolves canonical metres, consumes one spin, and caps at 500m',
    run: async () => {
      await seedFrostwell({ meters: 470, spinsEarned: 2 });
      const result = await spinFrostwellDrillWheel({ session: makeSession(), client: null, random: () => 0.999 });
      const after = readIslandRunGameStateRecord(makeSession());
      const progress = resolveFrostwellIceworksProgress({ ledger: after.signatureMissionProgressByIsland, islandNumber: 3, cycleIndex: 0 });
      assertEqual(result.status, 'ok', 'queued spin resolves');
      if (result.status !== 'ok') return;
      assertEqual(result.wheelMeters, 75, 'authoritative wheel segment is selected in action');
      assertEqual(result.meters, 30, 'award is clipped to remaining depth');
      assertEqual(progress.metersDrilled, 500, 'depth caps at target');
      assertEqual(progress.spinsUsed, 1, 'exactly one credit is consumed');
    },
  },
  {
    name: 'Frostwell wheel rejects play without a queued drill-tile spin',
    run: async () => {
      await seedFrostwell({ meters: 200, spinsEarned: 0 });
      const result = await spinFrostwellDrillWheel({ session: makeSession(), client: null, random: () => 0 });
      assertEqual(result.status, 'no_spins', 'wheel is gameplay gated');
      assertEqual(resolveFrostwellIceworksProgress({ ledger: readIslandRunGameStateRecord(makeSession()).signatureMissionProgressByIsland, islandNumber: 3, cycleIndex: 0 }).metersDrilled, 200, 'blocked spin does not mutate depth');
    },
  },
  {
    name: 'Frostwell progress is cycle-scoped and conflict merge is monotonic',
    run: () => {
      const firstKey = getIslandRunSignatureMissionKey(0, 3);
      const secondKey = getIslandRunSignatureMissionKey(1, 3);
      const record = (meters: number, spins: number, updatedAtMs: number, builtAtMs: number | null = null) => ({ missionId: 'frostwell-iceworks' as const, version: 2 as const, metersDrilled: meters, spinsEarned: spins, spinsUsed: 0, lastSpinMeters: 20, builtAtMs, updatedAtMs });
      const merged = mergeIslandRunSignatureMissionProgress(
        { [firstKey]: record(200, 3, 8) },
        { [firstKey]: record(320, 5, 50, 50), [secondKey]: record(15, 1, 60) },
      );
      assertEqual(merged[firstKey]?.metersDrilled, 320, 'highest depth wins');
      assertEqual(merged[firstKey]?.builtAtMs, 50, 'built state is preserved');
      assertEqual(merged[secondKey]?.metersDrilled, 15, 'next cycle remains separate');
    },
  },
  {
    name: 'Frostwell funding action deducts exactly once and persists the built timestamp',
    run: async () => {
      await seedFrostwell();
      const first = await fundFrostwellIceworks({ session: makeSession(), client: null });
      const afterFirst = readIslandRunGameStateRecord(makeSession());
      const second = await fundFrostwellIceworks({ session: makeSession(), client: null });
      assertEqual(first.status, 'ok', 'ready mission can be funded');
      assertEqual(afterFirst.essence, 500, 'funding deducts the 1000 Essence cost');
      assertEqual(afterFirst.essenceLifetimeSpent, 1_020, 'lifetime spend increments atomically');
      assertEqual(second.status, 'already_built', 'funding is idempotent');
      assertEqual(readIslandRunGameStateRecord(makeSession()).essence, 500, 'repeat funding cannot double-spend');
    },
  },
  {
    name: 'Frostwell funding action rejects an insufficient wallet without mutation',
    run: async () => {
      await seedFrostwell({ essence: 999 });
      const result = await fundFrostwellIceworks({ session: makeSession(), client: null });
      assertEqual(result.status, 'insufficient_essence', 'wallet guard blocks purchase');
      assertEqual(readIslandRunGameStateRecord(makeSession()).essence, 999, 'blocked funding leaves wallet untouched');
    },
  },
  {
    name: 'Frostwell sanitizer migrates the 50m local draft and normalizes v2 fields',
    run: () => {
      const sanitized = sanitizeIslandRunSignatureMissionProgress({
        '0:3': { rolls_completed: 20, built_at_ms: -4, updated_at_ms: 9 },
        bad: 'nope',
      });
      assertEqual(sanitized['0:3']?.metersDrilled, 50, 'legacy draft preserves actual drilled metres');
      assertEqual(sanitized['0:3']?.builtAtMs, 0, 'timestamps are normalized');
      assertEqual(resolveFrostwellSpinMeters(0.999), 75, 'wheel edge maps to final segment');
      assertEqual(getFrostwellIceworksTechCost(0), 1_000, 'Island 003 first-cycle tech cost matches brief');
    },
  },
];
