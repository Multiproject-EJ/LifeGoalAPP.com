import {
  CACTUS_CANYON_SPIRAL_MAX_SEGMENTS,
  FROSTWELL_DEPTH_METERS,
  FROSTWELL_DRILL_TILE_INDICES,
  ROOTHEART_POWER_COMPONENTS,
  SUNKEN_SANDS_FIRST_TREASURE_DICE,
  SUNKEN_SANDS_FIRST_TREASURE_ID,
  SUNKEN_SANDS_TREASURE_ROLL_TARGET,
  advanceSunkenSandsTreasureForRoll,
  collectCactusCanyonDynamiteForLanding,
  collectRootheartPowerComponentForLanding,
  getCactusCanyonAvailableDynamite,
  getCactusCanyonDynamiteQuantityForTile,
  getFrostwellAvailableSpins,
  getFrostwellIceworksTechCost,
  getIslandRunSignatureMissionKey,
  grantFrostwellDrillSpinForLanding,
  mergeIslandRunSignatureMissionProgress,
  resolveFrostwellIceworksProgress,
  resolveCactusCanyonSpiralProgress,
  resolveFrostwellSpinMeters,
  resolveRootheartPowerworksProgress,
  resolveSunkenSandsTreasureProgress,
  sanitizeIslandRunSignatureMissionProgress,
} from '../islandRunSignatureMissions';
import {
  claimSunkenSandsFirstTreasure,
  fundFrostwellIceworks,
  fundRootheartPowerworksStage,
  blastCactusCanyonSpiralSection,
  spinFrostwellDrillWheel,
} from '../islandRunSignatureMissionAction';
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

async function seedRootheart(options: {
  essence?: number;
  collectedCount?: number;
  buildStage?: 0 | 1 | 2 | 3;
} = {}): Promise<void> {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const key = getIslandRunSignatureMissionKey(0, 10);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 10,
      cycleIndex: 0,
      essence: options.essence ?? 4_000,
      essenceLifetimeSpent: 20,
      signatureMissionProgressByIsland: {
        [key]: {
          missionId: 'rootheart-powerworks',
          version: 1,
          collectedComponentIds: ROOTHEART_POWER_COMPONENTS
            .slice(0, options.collectedCount ?? ROOTHEART_POWER_COMPONENTS.length)
            .map((component) => component.id),
          buildStage: options.buildStage ?? 0,
          essenceSpent: 0,
          activatedAtMs: null,
          updatedAtMs: 1,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
}

async function seedSunkenSandsTreasure(rollsCompleted: number): Promise<void> {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const key = getIslandRunSignatureMissionKey(0, 12);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 12,
      cycleIndex: 0,
      dicePool: 10,
      essence: 50,
      essenceLifetimeEarned: 70,
      signatureMissionProgressByIsland: {
        [key]: {
          missionId: 'sunken-sands-first-treasure',
          version: 1,
          treasureId: SUNKEN_SANDS_FIRST_TREASURE_ID,
          rollsCompleted,
          revealedAtMs: rollsCompleted >= SUNKEN_SANDS_TREASURE_ROLL_TARGET ? 100 : null,
          claimedAtMs: null,
          updatedAtMs: 100,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
}

async function seedCactusCanyon(options: {
  segments?: number;
  dynamiteEarned?: number;
  dynamiteSpent?: number;
  completedAtMs?: number | null;
} = {}): Promise<void> {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  const key = getIslandRunSignatureMissionKey(0, 13);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: 13,
      cycleIndex: 0,
      signatureMissionProgressByIsland: {
        [key]: {
          missionId: 'cactus-canyon-spiral-rail',
          version: 2,
          segmentsExcavated: options.segments ?? 0,
          dynamiteEarned: options.dynamiteEarned ?? 0,
          dynamiteSpent: options.dynamiteSpent ?? 0,
          lastBlastSegments: null,
          startedAtMs: 1,
          completedAtMs: options.completedAtMs ?? null,
          updatedAtMs: 1,
        },
      },
    },
  });
  refreshIslandRunStateFromLocal(session);
}

export const islandRunSignatureMissionTests: TestCase[] = [
  {
    name: 'Cactus Canyon distributes mostly single dynamite caches with rare triple bundles after mission start',
    run: () => {
      const map = applyLandmarkDoorTiles(
        generateTileMap(13, getIslandRarity(13), 'cactus-canyon', 2),
        { expandedActiveStopId: 'hatchery' },
      );
      const caches = map.filter((entry) => entry.signatureMissionKind === 'cactus_canyon_dynamite');
      assertEqual(caches.length, 8, 'eight authored dynamite caches are distributed around the route');
      assertEqual(caches.filter((entry) => entry.signatureMissionAmount === 1).length, 6, 'most caches carry one stick');
      assertEqual(caches.filter((entry) => entry.signatureMissionAmount === 3).length, 2, 'two rare caches carry three sticks');
      assert(caches.every((entry) => entry.tileType !== 'landmark_door'), 'dynamite caches remain clear of landmark doors');
      const locked = collectCactusCanyonDynamiteForLanding({
        ledger: {}, islandNumber: 13, cycleIndex: 0, tileIndex: 19, tileCount: 36, nowMs: 9,
      });
      assertEqual(locked.dynamiteCollected, 0, 'collection remains locked before the briefing starts the mission');
      const startedKey = getIslandRunSignatureMissionKey(0, 13);
      const first = collectCactusCanyonDynamiteForLanding({
        ledger: { [startedKey]: { ...resolveCactusCanyonSpiralProgress({ ledger: {}, islandNumber: 13, cycleIndex: 0 }), startedAtMs: 10 } },
        islandNumber: 13, cycleIndex: 0, tileIndex: 19, tileCount: 36, nowMs: 11,
      });
      const progress = resolveCactusCanyonSpiralProgress({ ledger: first.ledger, islandNumber: 13, cycleIndex: 0 });
      assertEqual(first.dynamiteCollected, 1, 'single cache grants one stick');
      assertEqual(getCactusCanyonAvailableDynamite(progress), 1, 'dynamite is durably queued');
      assertEqual(getCactusCanyonDynamiteQuantityForTile(13, 10, 36), 3, 'rare cache resolves three sticks');
      assertEqual(getCactusCanyonDynamiteQuantityForTile(12, 19, 36), 0, 'other islands do not grant');
      assertEqual(resolveCactusCanyonSpiralProgress({ ledger: first.ledger, islandNumber: 13, cycleIndex: 1 }).segmentsExcavated, 0, 'next cycle starts independently');
    },
  },
  {
    name: 'Cactus Canyon blast consumes one dynamite, builds one section, caps the helix, and completes exactly once',
    run: async () => {
      await seedCactusCanyon({ segments: 15, dynamiteEarned: 2 });
      const first = await blastCactusCanyonSpiralSection({ session: makeSession(), client: null });
      const after = readIslandRunGameStateRecord(makeSession());
      const progress = resolveCactusCanyonSpiralProgress({ ledger: after.signatureMissionProgressByIsland, islandNumber: 13, cycleIndex: 0 });
      assertEqual(first.status, 'ok', 'earned dynamite blast resolves');
      if (first.status !== 'ok') return;
      assertEqual(first.segments, 1, 'one stick opens exactly one authored rail section');
      assertEqual(progress.segmentsExcavated, CACTUS_CANYON_SPIRAL_MAX_SEGMENTS, 'helix caps at sixteen sections');
      assertEqual(progress.dynamiteSpent, 1, 'exactly one dynamite is consumed');
      assert(progress.completedAtMs !== null, 'completion timestamp persists');
      assertEqual((await blastCactusCanyonSpiralSection({ session: makeSession(), client: null })).status, 'already_complete', 'completed railway is idempotent');
    },
  },
  {
    name: 'Cactus Canyon sanitizer and conflict merge preserve furthest excavation and first completion',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 13);
      const remote = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'cactus-canyon-spiral-rail', segments_excavated: 7, spins_earned: 4, updated_at_ms: 12 },
      });
      const local = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'cactus-canyon-spiral-rail', segments_excavated: 16, spins_earned: 7, spins_used: 6, completed_at_ms: 30, updated_at_ms: 40 },
      });
      const progress = resolveCactusCanyonSpiralProgress({
        ledger: mergeIslandRunSignatureMissionProgress(remote, local), islandNumber: 13, cycleIndex: 0,
      });
      assertEqual(progress.segmentsExcavated, 16, 'furthest excavation wins');
      assertEqual(progress.dynamiteEarned, 7, 'legacy earned-spin counter migrates to dynamite without value loss');
      assertEqual(progress.completedAtMs, 30, 'first completion survives merge');
    },
  },
  {
    name: 'Sunken Sands advances one chamber turn per canonical roll and caps at twenty',
    run: () => {
      const first = advanceSunkenSandsTreasureForRoll({
        ledger: {}, islandNumber: 12, cycleIndex: 0, nowMs: 10,
      });
      assertEqual(first.rollsCompleted, 1, 'first successful Island 012 roll opens one turn');
      assertEqual(first.becameReady, false, 'first turn is not claimable');
      const key = getIslandRunSignatureMissionKey(0, 12);
      const almostReady = {
        [key]: {
          ...resolveSunkenSandsTreasureProgress({ ledger: first.ledger, cycleIndex: 0, islandNumber: 12 }),
          rollsCompleted: 19,
        },
      };
      const ready = advanceSunkenSandsTreasureForRoll({
        ledger: almostReady, islandNumber: 12, cycleIndex: 0, nowMs: 20,
      });
      assertEqual(ready.rollsCompleted, 20, 'twentieth turn opens the chamber fully');
      assertEqual(ready.becameReady, true, 'twentieth turn exposes one ready edge');
      const capped = advanceSunkenSandsTreasureForRoll({
        ledger: ready.ledger, islandNumber: 12, cycleIndex: 0, nowMs: 30,
      });
      assertEqual(capped.rollsCompleted, 20, 'later rolls cannot overfill the chamber');
      assertEqual(capped.becameReady, false, 'ready edge cannot repeat');
      assertEqual(
        advanceSunkenSandsTreasureForRoll({ ledger: {}, islandNumber: 11, cycleIndex: 0, nowMs: 40 }).rollsCompleted,
        0,
        'other islands never advance this treasure',
      );
    },
  },
  {
    name: 'Sunken Sands first treasure claim is gated, rewarding, persisted, and idempotent',
    run: async () => {
      await seedSunkenSandsTreasure(19);
      const blocked = await claimSunkenSandsFirstTreasure({ session: makeSession(), client: null });
      assertEqual(blocked.status, 'not_ready', 'nineteen rolls cannot claim');
      assertEqual(readIslandRunGameStateRecord(makeSession()).dicePool, 10, 'blocked claim leaves dice untouched');

      await seedSunkenSandsTreasure(20);
      const first = await claimSunkenSandsFirstTreasure({ session: makeSession(), client: null });
      const afterFirst = readIslandRunGameStateRecord(makeSession());
      const repeated = await claimSunkenSandsFirstTreasure({ session: makeSession(), client: null });
      assertEqual(first.status, 'ok', 'ready chamber claims');
      if (first.status !== 'ok') return;
      assertEqual(first.treasureId, SUNKEN_SANDS_FIRST_TREASURE_ID, 'the first treasure keeps a durable identity');
      assertEqual(afterFirst.dicePool, 10 + SUNKEN_SANDS_FIRST_TREASURE_DICE, 'claim pays the configured dice once');
      assert(afterFirst.essence > 50, 'claim pays scaled Essence');
      assert(
        resolveSunkenSandsTreasureProgress({ ledger: afterFirst.signatureMissionProgressByIsland, cycleIndex: 0, islandNumber: 12 }).claimedAtMs !== null,
        'claim timestamp persists in the cycle-scoped ledger',
      );
      assertEqual(repeated.status, 'already_claimed', 'repeat claim is rejected');
      assertEqual(readIslandRunGameStateRecord(makeSession()).dicePool, afterFirst.dicePool, 'repeat claim cannot double-pay');
    },
  },
  {
    name: 'Sunken Sands sanitizer and conflict merge preserve furthest reveal and first claim',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 12);
      const remote = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'sunken-sands-first-treasure', rolls_completed: 12, updated_at_ms: 12 },
      });
      const local = sanitizeIslandRunSignatureMissionProgress({
        [key]: { mission_id: 'sunken-sands-first-treasure', rolls_completed: 20, revealed_at_ms: 20, claimed_at_ms: 30, updated_at_ms: 30 },
      });
      const merged = mergeIslandRunSignatureMissionProgress(remote, local);
      const progress = resolveSunkenSandsTreasureProgress({ ledger: merged, cycleIndex: 0, islandNumber: 12 });
      assertEqual(progress.rollsCompleted, 20, 'furthest chamber turn wins');
      assertEqual(progress.revealedAtMs, 20, 'reveal timestamp survives');
      assertEqual(progress.claimedAtMs, 30, 'claim survives cross-device merge');
    },
  },
  {
    name: 'Rootheart exposes eight stable Powerworks caches clear of doors and special economy stations',
    run: () => {
      const map = applyLandmarkDoorTiles(
        generateTileMap(10, getIslandRarity(10), 'rootheart', 2),
        { expandedActiveStopId: 'hatchery' },
      );
      assertEqual(ROOTHEART_POWER_COMPONENTS.length, 8, 'eight named engine parts ship');
      ROOTHEART_POWER_COMPONENTS.forEach((component) => {
        const tile = map[component.tileIndex];
        assertEqual(tile?.signatureMissionKind, 'rootheart_power_component', `${component.label} is marked`);
        assert(tile?.tileType !== 'landmark_door', `${component.label} remains clear of door clusters`);
        assert(!['traffic_light', 'build_discount', 'free_ticket', 'card', 'encounter'].includes(tile?.tileType ?? ''), `${component.label} remains on an ordinary economy tile`);
      });
    },
  },
  {
    name: 'Rootheart landing collects each named component once and remains cycle scoped',
    run: () => {
      const component = ROOTHEART_POWER_COMPONENTS[0];
      const first = collectRootheartPowerComponentForLanding({
        ledger: {}, islandNumber: 10, cycleIndex: 0, tileIndex: component.tileIndex, nowMs: 10,
      });
      const duplicate = collectRootheartPowerComponentForLanding({
        ledger: first.ledger, islandNumber: 10, cycleIndex: 0, tileIndex: component.tileIndex, nowMs: 11,
      });
      const nextCycle = collectRootheartPowerComponentForLanding({
        ledger: first.ledger, islandNumber: 10, cycleIndex: 1, tileIndex: component.tileIndex, nowMs: 12,
      });
      assertEqual(first.collectedComponentId, component.id, 'first landing collects exact part');
      assertEqual(duplicate.collectedComponentId, null, 'repeat landing cannot duplicate a part');
      assertEqual(nextCycle.collectedComponentId, component.id, 'new cycle receives its own mission');
      assertEqual(resolveRootheartPowerworksProgress({ ledger: first.ledger, islandNumber: 10, cycleIndex: 1 }).collectedComponentIds.length, 0, 'cycles do not leak progress');
    },
  },
  {
    name: 'Rootheart merge preserves the union of components and highest funded stage',
    run: () => {
      const key = getIslandRunSignatureMissionKey(0, 10);
      const base = {
        missionId: 'rootheart-powerworks' as const,
        version: 1 as const,
        essenceSpent: 600,
        activatedAtMs: null,
        updatedAtMs: 10,
      };
      const merged = mergeIslandRunSignatureMissionProgress(
        { [key]: { ...base, collectedComponentIds: [ROOTHEART_POWER_COMPONENTS[0].id], buildStage: 1 } },
        { [key]: { ...base, collectedComponentIds: [ROOTHEART_POWER_COMPONENTS[1].id], buildStage: 2, essenceSpent: 1_500, updatedAtMs: 20 } },
      );
      const progress = resolveRootheartPowerworksProgress({ ledger: merged, islandNumber: 10, cycleIndex: 0 });
      assertEqual(progress.collectedComponentIds.length, 2, 'component union survives conflict merge');
      assertEqual(progress.buildStage, 2, 'highest construction stage wins');
      assertEqual(progress.essenceSpent, 1_500, 'highest monotonic mission spend wins');
    },
  },
  {
    name: 'Rootheart staged funding deducts 600, 900, and 1500 exactly once then activates',
    run: async () => {
      await seedRootheart();
      const stage1 = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      const stage2 = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      const stage3 = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      const repeat = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      const state = readIslandRunGameStateRecord(makeSession());
      const progress = resolveRootheartPowerworksProgress({ ledger: state.signatureMissionProgressByIsland, islandNumber: 10, cycleIndex: 0 });
      assertEqual(stage1.status, 'ok', 'waterworks stage funds');
      assertEqual(stage2.status, 'ok', 'dynamo stage funds');
      assertEqual(stage3.status, 'ok', 'heartlight stage funds');
      assertEqual(repeat.status, 'already_complete', 'completed plant is idempotent');
      assertEqual(state.essence, 1_000, 'exact total 3000 Essence is deducted');
      assertEqual(state.essenceLifetimeSpent, 3_020, 'lifetime spend increments atomically');
      assertEqual(progress.buildStage, 3, 'final stage persists');
      assert(progress.activatedAtMs !== null, 'activation timestamp persists');
    },
  },
  {
    name: 'Rootheart funding rejects incomplete collection and insufficient Essence without mutation',
    run: async () => {
      await seedRootheart({ collectedCount: 7 });
      const incomplete = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      assertEqual(incomplete.status, 'components_incomplete', 'all eight parts are required');
      assertEqual(readIslandRunGameStateRecord(makeSession()).essence, 4_000, 'incomplete funding does not mutate wallet');
      await seedRootheart({ essence: 599 });
      const poor = await fundRootheartPowerworksStage({ session: makeSession(), client: null });
      assertEqual(poor.status, 'insufficient_essence', 'wallet guard blocks staged funding');
      assertEqual(readIslandRunGameStateRecord(makeSession()).essence, 599, 'blocked stage leaves wallet untouched');
    },
  },
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
      const firstProgress = resolveFrostwellIceworksProgress({ ledger: merged, islandNumber: 3, cycleIndex: 0 });
      const secondProgress = resolveFrostwellIceworksProgress({ ledger: merged, islandNumber: 3, cycleIndex: 1 });
      assertEqual(firstProgress.metersDrilled, 320, 'highest depth wins');
      assertEqual(firstProgress.builtAtMs, 50, 'built state is preserved');
      assertEqual(secondProgress.metersDrilled, 15, 'next cycle remains separate');
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
      const progress = resolveFrostwellIceworksProgress({ ledger: sanitized, islandNumber: 3, cycleIndex: 0 });
      assertEqual(progress.metersDrilled, 50, 'legacy draft preserves actual drilled metres');
      assertEqual(progress.builtAtMs, 0, 'timestamps are normalized');
      assertEqual(resolveFrostwellSpinMeters(0.999), 75, 'wheel edge maps to final segment');
      assertEqual(getFrostwellIceworksTechCost(0), 1_000, 'Island 003 first-cycle tech cost matches brief');
    },
  },
];
