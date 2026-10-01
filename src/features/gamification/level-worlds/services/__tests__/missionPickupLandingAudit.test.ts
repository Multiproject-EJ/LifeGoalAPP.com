import { __resetIslandRunRollActionMutexesForTests, executeIslandRunRollAction } from '../islandRunRollAction';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
  type IslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, resetIslandRunStateSnapshot } from '../islandRunStateStore';
import { generateTileMap, getIslandRarity, type IslandTileMapEntry } from '../islandBoardTileMap';
import { TRAFFIC_LIGHT_TILE_INDEX } from '../islandRunTrafficLightTile';
import { getIslandMissionBriefingBeatId } from '../islandRunMissionBriefing';
import { getIslandRunSignatureMissionKey, getStagedRestorationMissionDescriptor, sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { assert, createMemoryStorage, installWindowWithStorage, type TestCase } from './testHarness';

const TILE_COUNT = 36;
/** Pickups the player collects by landing (Coaster Director is a shop stop, Moonwell heat waits on L3). */
const COLLECTIBLE_KINDS = new Set([
  'first_light_dynamite', 'cactus_canyon_dynamite', 'great_honeyfall_nectar', 'fishermans_rod',
  'rootheart_power_component', 'frostwell_drill',
]);

function makeSession() {
  return {
    access_token: 't', refresh_token: 't', expires_in: 3600, token_type: 'bearer',
    user: { id: 'mission-pickup-audit-user', user_metadata: {} },
  } as unknown as import('@supabase/supabase-js').Session;
}

/** The state a player has once the island's mission is running (briefing read, Island 020's Skiff launched). */
function missionRunningState(island: number): Partial<IslandRunGameStateRecord> {
  const base = readIslandRunGameStateRecord(makeSession());
  const beats = { ...(base.narrativeSeenState?.beats ?? {}), [getIslandMissionBriefingBeatId(0, island)]: 1 };
  const descriptor = getStagedRestorationMissionDescriptor(island);
  const ledger = island === 20 && descriptor
    ? sanitizeIslandRunSignatureMissionProgress({ [getIslandRunSignatureMissionKey(0, 20)]: { missionId: descriptor.missionId, version: 1, startedAtMs: 1, updatedAtMs: 1 } })
    : {};
  return { narrativeSeenState: { ...base.narrativeSeenState, beats }, signatureMissionProgressByIsland: ledger } as Partial<IslandRunGameStateRecord>;
}

function seed(overrides: Partial<IslandRunGameStateRecord>) {
  resetIslandRunRuntimeCommitCoordinatorForTests();
  __resetIslandRunRollActionMutexesForTests();
  __resetIslandRunStateStoreForTests();
  installWindowWithStorage(createMemoryStorage());
  const session = makeSession();
  const next = { ...readIslandRunGameStateRecord(session), ...overrides };
  void writeIslandRunGameStateRecord({ session, client: null, record: next });
  resetIslandRunStateSnapshot(session, next);
}

/** Dice that move exactly `steps` (2..12). */
function diceFor(steps: number): number[] {
  const first = Math.min(6, steps - 1);
  const second = steps - first;
  return [(first - 1) / 6 + 0.01, (second - 1) / 6 + 0.01];
}

async function roll(values: number[]) {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => values[Math.min(index++, values.length - 1)] ?? 0;
  try {
    return await executeIslandRunRollAction({ session: makeSession(), client: null, diceMultiplier: 1 });
  } finally {
    Math.random = originalRandom;
  }
}

function collected(result: Awaited<ReturnType<typeof executeIslandRunRollAction>>): number {
  if (result.status !== 'ok') return -1;
  return (result.firstLightAssemblyDynamiteCollected ?? 0)
    + (result.cactusCanyonDynamiteCollected ?? 0)
    + (result.greatHoneyfallNectarCollected ?? 0)
    + (result.stagedRestorationPickup ? 1 : 0)
    + (result.fishermansVillageRodCollected ? 1 : 0)
    + (result.rootheartPowerComponentPickup ? 1 : 0)
    + (result.frostwellSpinGranted ? 1 : 0);
}

function missionTiles(island: number): IslandTileMapEntry[] {
  return generateTileMap(island, getIslandRarity(island), 'forest', 0, { signatureMissionProgressByIsland: {} })
    .filter((tile) => tile.signatureMissionKind && (COLLECTIBLE_KINDS.has(tile.signatureMissionKind) || !['coaster_director', 'moonwell_heat'].includes(tile.signatureMissionKind)));
}

export const missionPickupLandingAuditTests: TestCase[] = [
  {
    name: 'mission pickups on every island: never on a door or traffic light; landing collects, passing does not',
    run: async () => {
      const problems: string[] = [];
      let pickupTiles = 0;
      let landingsChecked = 0;
      let passesChecked = 0;
      for (let island = 1; island <= 120; island += 1) {
        const tiles = missionTiles(island);
        const pickupIndices = new Set(tiles.map((tile) => tile.index));
        for (const tile of tiles) {
          pickupTiles += 1;
          if (tile.index === TRAFFIC_LIGHT_TILE_INDEX) problems.push(`${island}:${tile.index} on the traffic light`);
          // Landing: start 2 tiles before and roll a 2.
          seed({ currentIslandNumber: island, cycleIndex: 0, tokenIndex: (tile.index - 2 + TILE_COUNT) % TILE_COUNT, dicePool: 50, firstSessionTutorialState: 'complete', ...missionRunningState(island) });
          const landed = await roll(diceFor(2));
          if (landed.status === 'ok' && landed.newTokenIndex === tile.index) landingsChecked += 1;
          else problems.push(`${island}:${tile.index} could not land exactly (status ${landed.status})`);
          if (landed.status === 'ok' && landed.newTokenIndex === tile.index && collected(landed) < 1) problems.push(`${island}:${tile.index} ${tile.signatureMissionKind} landing collected nothing`);
          // Passing: start 2 before, roll 3 (skip if the next tile is also a pickup).
          if (pickupIndices.has((tile.index + 1) % TILE_COUNT)) continue;
          seed({ currentIslandNumber: island, cycleIndex: 0, tokenIndex: (tile.index - 2 + TILE_COUNT) % TILE_COUNT, dicePool: 50, firstSessionTutorialState: 'complete', ...missionRunningState(island) });
          const passed = await roll(diceFor(3));
          if (passed.status === 'ok') passesChecked += 1;
          if (passed.status === 'ok' && collected(passed) > 0 && !pickupIndices.has(passed.newTokenIndex ?? -1)) problems.push(`${island}:${tile.index} ${tile.signatureMissionKind} collected by passing`);
        }
      }
      assert(pickupTiles >= 40, `the audit covers the mission pickups (found ${pickupTiles})`);
      assert(landingsChecked === pickupTiles, `every pickup tile was landed on (${landingsChecked}/${pickupTiles})`);
      assert(passesChecked > 0, 'pass-over rolls were exercised');
      assert(problems.length === 0, `mission pickup problems: ${problems.join('; ')}`);
    },
  },
];
