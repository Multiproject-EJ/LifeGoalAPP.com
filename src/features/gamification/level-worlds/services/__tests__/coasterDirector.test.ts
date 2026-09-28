import {
  COASTER_SECTION_COUNT,
  getCoasterDirectorTileIndices,
  getCoasterSectionPrice,
  getIslandRunSignatureMissionKey,
  getStagedRestorationPickupTileIndices,
  isCoasterDirectorTile,
  resolveCoasterOrderStatus,
  resolveStagedRestorationMissionProgress,
  WONDER_CIRCUIT_ISLAND_NUMBER,
} from '../islandRunSignatureMissions';
import {
  activateStagedRestorationMissionStage,
  orderCoasterSectionFromDirector,
} from '../islandRunSignatureMissionAction';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, refreshIslandRunStateFromLocal } from '../islandRunStateStore';
import { generateTileMap, getIslandRarity } from '../islandBoardTileMap';
import { findIslandRunReservedTileCollisions } from '../islandRunTileReservations';
import { getIslandMissionBriefingPresentation } from '../islandRunMissionBriefing';
import { resolveIslandRunTileRewardObjectKind } from '../../dev/IslandRunTileRewardThreeObjects';
import { assert, assertEqual, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const USER_ID = 'coaster-director-test-user';
const makeSession = () => ({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: { id: USER_ID, user_metadata: {} } }) as unknown as import('@supabase/supabase-js').Session;

async function seedIsland19(options: { essence: number; island?: number }) {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const base = readIslandRunGameStateRecord(session);
  await writeIslandRunGameStateRecord({
    session,
    client: null,
    record: {
      ...base,
      currentIslandNumber: options.island ?? WONDER_CIRCUIT_ISLAND_NUMBER,
      cycleIndex: 0,
      essence: options.essence,
      signatureMissionProgressByIsland: {},
    },
  });
  refreshIslandRunStateFromLocal(session);
  return session;
}

function readProgress(session: ReturnType<typeof makeSession>) {
  const state = readIslandRunGameStateRecord(session);
  return {
    state,
    progress: resolveStagedRestorationMissionProgress({
      ledger: state.signatureMissionProgressByIsland, islandNumber: WONDER_CIRCUIT_ISLAND_NUMBER, cycleIndex: 0,
    }),
  };
}

export const coasterDirectorTests: TestCase[] = [
  {
    name: 'Island 019 swaps ride-ticket pickups for two collision-free Director tiles',
    run: () => {
      assertEqual(getStagedRestorationPickupTileIndices(19, 36).length, 0, 'no Golden Ride Tickets are scattered any more');
      const directors = getCoasterDirectorTileIndices(36);
      assertEqual(directors.length, 2, 'two Director kiosks sit on the route');
      assertEqual(findIslandRunReservedTileCollisions({ tileCount: 36, tileIndices: directors }).length, 0, 'kiosks clear reserved slots');
      assert(directors.every((index) => isCoasterDirectorTile(19, index, 36)), 'kiosk helper agrees with indices');
      assert(!isCoasterDirectorTile(18, directors[0], 36), 'other islands have no Director');
      const map = generateTileMap(19, getIslandRarity(19), 'forest', 0);
      assertEqual(
        map.filter((entry) => entry.signatureMissionKind === 'coaster_director').map((entry) => entry.index).join(','),
        directors.join(','),
        'the canonical tile map marks exactly the Director tiles',
      );
      assert(!map.some((entry) => entry.signatureMissionKind === 'golden_ride_ticket'), 'no ticket tiles remain');
      assertEqual(
        resolveIslandRunTileRewardObjectKind({ tileType: 'micro', signatureMissionKind: 'coaster_director' }),
        'coaster_director',
        'the 3D board shows a distinct Director marker',
      );
    },
  },
  {
    name: 'coaster sections escalate in price and the briefing tells the Director story',
    run: () => {
      const prices = Array.from({ length: COASTER_SECTION_COUNT }, (_, index) => getCoasterSectionPrice(0, index));
      assert(prices[0] > 0 && prices[0] < prices[1] && prices[1] < prices[2], 'each section costs more than the last');
      const status = resolveCoasterOrderStatus(null, 0);
      assertEqual(status.sectionsOrdered, 0, 'nothing ordered yet');
      assertEqual(status.nextPrice, prices[0], 'first price quoted');
      const briefing = getIslandMissionBriefingPresentation(19);
      assert(/Director/.test(briefing.missionStatement), 'the briefing introduces the Theme Park Director');
      assert(!/cavern/i.test(briefing.missionStatement), 'the underworld stays a surprise');
    },
  },
  {
    name: 'ordering spends Money, delivers one section, and waits for install before the next order',
    run: async () => {
      const price1 = getCoasterSectionPrice(0, 0);
      const session = await seedIsland19({ essence: price1 + 5 });
      const first = await orderCoasterSectionFromDirector({ session, client: null });
      assertEqual(first.status, 'ok', 'affordable order succeeds');
      let { state, progress } = readProgress(session);
      assertEqual(state.essence, 5, 'the exact price is deducted');
      assertEqual(progress?.chargesEarned, 2, 'one section worth of charges is delivered');
      assert(resolveCoasterOrderStatus(progress, 0).sectionReady, 'section waits to be installed');

      const blocked = await orderCoasterSectionFromDirector({ session, client: null });
      assertEqual(blocked.status, 'awaiting_install', 'cannot stack orders before installing');

      const install = await activateStagedRestorationMissionStage({ session, client: null });
      assertEqual(install.status, 'ok', 'delivered section installs through the shared stage action');
      ({ progress } = readProgress(session));
      assertEqual(progress?.activatedStages, 1, 'one section installed');

      const broke = await orderCoasterSectionFromDirector({ session, client: null });
      assertEqual(broke.status, 'insufficient_money', 'second section needs more Money');
      if (broke.status === 'insufficient_money') assertEqual(broke.price, getCoasterSectionPrice(0, 1), 'quotes the next price');
      ({ state } = readProgress(session));
      assertEqual(state.essence, 5, 'a refused order spends nothing');
    },
  },
  {
    name: 'three orders and installs complete the coaster; a fourth order is refused',
    run: async () => {
      const total = [0, 1, 2].reduce((sum, index) => sum + getCoasterSectionPrice(0, index), 0);
      const session = await seedIsland19({ essence: total });
      for (let section = 0; section < COASTER_SECTION_COUNT; section += 1) {
        assertEqual((await orderCoasterSectionFromDirector({ session, client: null })).status, 'ok', `order ${section + 1}`);
        assertEqual((await activateStagedRestorationMissionStage({ session, client: null })).status, 'ok', `install ${section + 1}`);
      }
      const { state, progress } = readProgress(session);
      assertEqual(state.essence, 0, 'the whole coaster costs the sum of section prices');
      assertEqual(progress?.activatedStages, 3, 'all sections installed');
      assert(progress?.completedAtMs != null, 'mission completes on the third install');
      assertEqual((await orderCoasterSectionFromDirector({ session, client: null })).status, 'all_ordered', 'no overspend');
    },
  },
  {
    name: 'the Director only takes orders on Island 019',
    run: async () => {
      const session = await seedIsland19({ essence: 99_999, island: 18 });
      assertEqual((await orderCoasterSectionFromDirector({ session, client: null })).status, 'wrong_island', 'wrong island refused');
      assertEqual(readIslandRunGameStateRecord(session).essence, 99_999, 'nothing spent');
    },
  },
];
