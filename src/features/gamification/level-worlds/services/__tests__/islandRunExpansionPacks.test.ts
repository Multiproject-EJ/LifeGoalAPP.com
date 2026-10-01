import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';
import {
  EXPANSION_PACKS,
  getExpansionIslandNumber,
  getExpansionPack,
  isExpansionIslandNumber,
  isExpansionPacksEnabled,
  resolveExpansionEconomyIslandNumber,
  resolveExpansionIsland,
  resolveExpansionPackAvailability,
  resolveNextExpansionIsland,
} from '../islandRunExpansionPacks';
import {
  createDefaultExpansionVoyageState,
  resolveMainPathRecord,
  sanitizeExpansionVoyageState,
} from '../islandRunExpansionVoyage';
import { resolveVoyageSwitchRecord, completeExpansionPackVoyage, devGrantExpansionPack, switchExpansionVoyage } from '../islandRunExpansionVoyageActions';
import { getEffectiveIslandNumber, getIslandEssenceMultiplier } from '../islandRunContractV2EssenceBuild';
import { getIslandRunBossReward } from '../islandRunBossReward';
import { resolveIslandRun3DWorldRoute } from '../islandRun3DWorldRouting';
import { getIslandDisplayName } from '../islandNames';
import { normalizeIslandArtIslandNumber } from '../islandArtManifest';
import { resolveIslandRunTravelState } from '../islandRunStateActions';
import { readIslandRunGameStateRecord, writeIslandRunGameStateRecord, resetIslandRunRuntimeCommitCoordinatorForTests, type IslandRunGameStateRecord } from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, getIslandRunStateSnapshot, resetIslandRunStateSnapshot } from '../islandRunStateStore';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';

const session = { user: { id: 'expansion-pack-fixture', user_metadata: {} } } as import('@supabase/supabase-js').Session;
const DURATION = () => 48 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 1, 12);

async function seed(overrides: Partial<IslandRunGameStateRecord> = {}): Promise<IslandRunGameStateRecord> {
  resetIslandRunRuntimeCommitCoordinatorForTests(); __resetIslandRunActionMutexesForTests(); __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const initial = readIslandRunGameStateRecord(session);
  const state: IslandRunGameStateRecord = {
    ...initial,
    currentIslandNumber: 7,
    cycleIndex: 0,
    tokenIndex: 9,
    dicePool: 321,
    essence: 4567,
    islandStartedAtMs: NOW - 1000,
    islandExpiresAtMs: NOW + 1000,
    activeStopIndex: 2,
    activeStopType: 'mystery',
    stopStatesByIndex: initial.stopStatesByIndex.map((entry, index) => ({ ...entry, objectiveComplete: index < 2, buildComplete: index < 1 })),
    activeEggTier: 'rare',
    activeEggSetAtMs: NOW - 5000,
    activeEggHatchDurationMs: 60_000,
    activeEggIsDormant: false,
    ...overrides,
  };
  await writeIslandRunGameStateRecord({ session, client: null, record: state });
  resetIslandRunStateSnapshot(session, state);
  return state;
}

async function readSource(path: string): Promise<string> {
  // @ts-ignore island-run test tsconfig omits node type libs
  const fsMod = await import('fs');
  return fsMod.readFileSync(path, 'utf8');
}

export const islandRunExpansionPacksTests: TestCase[] = [
  {
    name: 'expansion packs: reserved 1001+ ranges, names and borrowed worlds never touch the main campaign',
    run: () => {
      const seen = new Set<number>();
      for (const pack of EXPANSION_PACKS) {
        assertEqual(pack.islandNames.length, pack.islandCount, `${pack.id}: a name per island`);
        for (let index = 1; index <= pack.islandCount; index += 1) {
          const island = getExpansionIslandNumber(pack.id, index);
          assert(island > 1000 && !seen.has(island), `${pack.id} ${index}: unique runtime number above the main campaign`);
          seen.add(island);
          const ref = resolveExpansionIsland(island)!;
          assertEqual(ref.pack.id, pack.id, 'round trip pack');
          assertEqual(ref.localIndex, index, 'round trip index');
          assertEqual(getIslandDisplayName(island), pack.islandNames[index - 1], 'pack island name');
          const route = resolveIslandRun3DWorldRoute(island);
          assert(route !== null && route.presentationStatus === 'placeholder', `${pack.id} ${index}: borrows an authored 3D world`);
          assertEqual(resolveIslandRun3DWorldRoute(route!.worldSourceNumber)?.worldSourceNumber, route!.worldSourceNumber, 'borrowed world is a real main island world');
          assertEqual(normalizeIslandArtIslandNumber(island), route!.worldSourceNumber, 'art follows the borrowed world');
        }
        assertEqual(resolveNextExpansionIsland(getExpansionIslandNumber(pack.id, pack.islandCount)), null, `${pack.id}: last island ends the pack`);
      }
      for (const island of [1, 60, 120, 1000, 1021, 1099]) assert(!isExpansionIslandNumber(island), `${island} is not a pack island`);
    },
  },
  {
    name: 'expansion packs: pack island k costs and pays like main island k, never a 1001+ blow-up',
    run: () => {
      const beach3 = getExpansionIslandNumber('beach-party', 3);
      assertEqual(getEffectiveIslandNumber(beach3, 5), 3, 'economy number ignores cycle and range');
      assertEqual(resolveExpansionEconomyIslandNumber(beach3), 3, 'economy mapping');
      assert(getIslandEssenceMultiplier(getEffectiveIslandNumber(beach3, 0)) < 2, 'sane essence multiplier');
      assertEqual(JSON.stringify(getIslandRunBossReward(beach3)), JSON.stringify(getIslandRunBossReward(3)), 'boss reward like Island 3');
      assertEqual(getEffectiveIslandNumber(7, 1), 127, 'main campaign scaling unchanged');
    },
  },
  {
    name: 'expansion packs: travel inside a pack never wraps into the next main cycle',
    run: async () => {
      const state = await seed({ currentIslandNumber: getExpansionIslandNumber('beach-party', 1), cycleIndex: 0 });
      const travel = resolveIslandRunTravelState({
        current: state, nextIsland: getExpansionIslandNumber('beach-party', 2), startTimer: true, nowMs: NOW,
        getIslandDurationMs: DURATION, islandRunContractV2Enabled: true,
      });
      assertEqual(travel.resolvedIsland, 1002, 'next pack island');
      assertEqual(travel.nextCycleIndex, 0, 'no cycle bump');
      assertEqual(resolveIslandRunTravelState({
        current: { ...state, currentIslandNumber: 120 }, nextIsland: 121, startTimer: true, nowMs: NOW,
        getIslandDurationMs: DURATION, islandRunContractV2Enabled: true,
      }).resolvedIsland, 1, 'main campaign still wraps 120 → 1');
    },
  },
  {
    name: 'expansion packs: dev only, seasonal sale windows, feature offers and ownership',
    run: () => {
      assert(!isExpansionPacksEnabled({ isDevModeEnabled: false }), 'hidden for regular players');
      assert(isExpansionPacksEnabled({ isDevModeEnabled: true }), 'visible in dev');
      const beach = getExpansionPack('beach-party')!;
      const christmas = getExpansionPack('christmas-feels')!;
      const calm = getExpansionPack('meditation')!;
      const july = Date.UTC(2026, 6, 1);
      const december = Date.UTC(2026, 11, 20);
      const january = Date.UTC(2027, 0, 3);
      const base = { ownedPackIds: [] as const, unlockedFeatures: [] as string[] };
      assertEqual(resolveExpansionPackAvailability({ ...base, pack: beach, nowMs: july }), 'buy', 'themed packs always on sale');
      assertEqual(resolveExpansionPackAvailability({ ...base, pack: christmas, nowMs: july }), 'out_of_season', 'Christmas not in July');
      assertEqual(resolveExpansionPackAvailability({ ...base, pack: christmas, nowMs: december }), 'buy', 'Christmas in December');
      assertEqual(resolveExpansionPackAvailability({ ...base, pack: christmas, nowMs: january }), 'buy', 'window wraps the new year');
      assertEqual(resolveExpansionPackAvailability({ ...base, pack: calm, nowMs: july }), 'locked', 'feature pack needs the feature');
      assertEqual(resolveExpansionPackAvailability({ ...base, unlockedFeatures: ['meditation'], pack: calm, nowMs: july }), 'feature_offer', 'Meditation unlock offers it');
      assertEqual(resolveExpansionPackAvailability({ ...base, ownedPackIds: ['christmas-feels'], pack: christmas, nowMs: july }), 'owned', 'owned packs stay playable out of season');
    },
  },
  {
    name: 'expansion packs: voyage state sanitizes unknown packs, unowned voyages and misplaced stashes',
    run: () => {
      const clean = sanitizeExpansionVoyageState({
        activeVoyageId: 'christmas-feels',
        ownedPackIds: ['beach-party', 'nope', 'beach-party'],
        completedPackIds: ['beach-party', 'meditation'],
        stashedPathsByVoyage: {
          main: { currentIslandNumber: 1003, stopStatesByIndex: [], stopBuildStateByIndex: [], bossState: {} },
          'beach-party': { currentIslandNumber: 1004, stopStatesByIndex: [], stopBuildStateByIndex: [], bossState: {} },
        },
        updatedAtMs: 5,
      });
      assertEqual(clean.activeVoyageId, 'main', 'an unowned active voyage falls back to main');
      assertEqual(JSON.stringify(clean.ownedPackIds), JSON.stringify(['beach-party']), 'unknown and duplicate ids dropped');
      assertEqual(JSON.stringify(clean.completedPackIds), JSON.stringify(['beach-party']), 'only owned packs can be completed');
      assert(!clean.stashedPathsByVoyage.main, 'main can never be stashed on a pack island');
      assertEqual(clean.stashedPathsByVoyage['beach-party']?.currentIslandNumber, 1004, 'pack stash kept');
      assertEqual(JSON.stringify(sanitizeExpansionVoyageState(null)), JSON.stringify(createDefaultExpansionVoyageState()), 'default');
    },
  },
  {
    name: 'expansion packs: switching voyages keeps each position; wallet and collections stay shared',
    run: async () => {
      await seed();
      assertEqual((await devGrantExpansionPack({ session, client: null, packId: 'beach-party', nowMs: NOW })).status, 'ok', 'dev grant');
      assertEqual((await switchExpansionVoyage({ session, client: null, voyageId: 'christmas-feels', nowMs: NOW, getIslandDurationMs: DURATION, islandRunContractV2Enabled: true })).status, 'not_owned', 'unowned pack refused');
      const before = getIslandRunStateSnapshot(session);
      assertEqual((await switchExpansionVoyage({ session, client: null, voyageId: 'beach-party', nowMs: NOW, getIslandDurationMs: DURATION, islandRunContractV2Enabled: true })).status, 'ok', 'enter pack');
      const inPack = getIslandRunStateSnapshot(session);
      assertEqual(inPack.currentIslandNumber, 1001, 'pack starts at its first island');
      assertEqual(inPack.expansionVoyageState.activeVoyageId, 'beach-party', 'pack active');
      assertEqual(inPack.dicePool, before.dicePool, 'dice shared');
      assertEqual(inPack.essence, before.essence, 'money shared');
      assertEqual(inPack.activeEggTier, null, 'main island egg does not follow you');
      assertEqual(resolveMainPathRecord(inPack).currentIslandNumber, 7, 'main path still at Island 7');
      // Move inside the pack, then go home and come back.
      resetIslandRunStateSnapshot(session, { ...inPack, tokenIndex: 4 });
      assertEqual((await switchExpansionVoyage({ session, client: null, voyageId: 'main', nowMs: NOW + 10, getIslandDurationMs: DURATION, islandRunContractV2Enabled: true })).status, 'ok', 'back to main');
      const home = getIslandRunStateSnapshot(session);
      for (const key of ['currentIslandNumber', 'tokenIndex', 'activeStopIndex', 'activeStopType', 'activeEggTier', 'activeEggSetAtMs', 'islandExpiresAtMs'] as const) {
        assertEqual(JSON.stringify(home[key]), JSON.stringify(before[key]), `main ${key} restored`);
      }
      assertEqual(JSON.stringify(home.stopStatesByIndex), JSON.stringify(before.stopStatesByIndex), 'main stop progress restored');
      assertEqual(home.expansionVoyageState.stashedPathsByVoyage['beach-party']?.tokenIndex, 4, 'pack position stashed');
      assertEqual((await switchExpansionVoyage({ session, client: null, voyageId: 'beach-party', nowMs: NOW + 20, getIslandDurationMs: DURATION, islandRunContractV2Enabled: true })).status, 'ok', 'resume pack');
      assertEqual(getIslandRunStateSnapshot(session).tokenIndex, 4, 'pack resumes where you left it');
    },
  },
  {
    name: 'expansion packs: the last pack island completes the pack and returns to the main path',
    run: async () => {
      await seed();
      await devGrantExpansionPack({ session, client: null, packId: 'meditation', nowMs: NOW });
      await switchExpansionVoyage({ session, client: null, voyageId: 'meditation', nowMs: NOW, getIslandDurationMs: DURATION, islandRunContractV2Enabled: true });
      assertEqual((await completeExpansionPackVoyage({ session, client: null, nowMs: NOW, getIslandDurationMs: DURATION, islandRunContractV2Enabled: true })).status, 'not_last_island', 'only the last island finishes a pack');
      const atLast = getIslandRunStateSnapshot(session);
      const last = { ...atLast, currentIslandNumber: getExpansionIslandNumber('meditation', 5) };
      const record = resolveVoyageSwitchRecord({ current: last, voyageId: 'main', nowMs: NOW, getIslandDurationMs: DURATION, islandRunContractV2Enabled: true, completePackId: 'meditation' })!;
      assertEqual(record.currentIslandNumber, 7, 'back on the main path');
      assertEqual(JSON.stringify(record.expansionVoyageState.completedPackIds), JSON.stringify(['meditation']), 'pack completed');
      assert(!record.expansionVoyageState.stashedPathsByVoyage.meditation, 'a finished pack keeps no stash');
    },
  },
  {
    name: 'expansion packs: canonical column, migration and dev-only board gate',
    run: async () => {
      const migration = await readSource('supabase/migrations/20261001190000_add_expansion_voyage_state.sql');
      assert(/ADD COLUMN IF NOT EXISTS expansion_voyage_state jsonb NOT NULL/.test(migration), 'migration adds the column');
      const store = await readSource('src/features/gamification/level-worlds/services/islandRunGameStateStore.ts');
      assert(store.includes(',expansion_voyage_state\')') && store.includes('expansion_voyage_state: record.expansionVoyageState'), 'loaded and saved');
      const board = await readSource('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
      assert(board.includes('const expansionPacksEnabled = isExpansionPacksEnabled({ isDevModeEnabled });'), 'board gate');
      assert(board.includes('expansionVoyage={expansionPacksEnabled ? {'), 'dev panel section only in dev');
      assert(/if \(!expansionPacksEnabled\) return 'Expansion packs are dev only\.';/.test(board), 'handlers refuse outside dev');
      const app = await readSource('src/App.tsx');
      assert(app.includes('resolveMainPathRecord(journeyState)'), 'main journey ignores pack islands');
    },
  },
];
