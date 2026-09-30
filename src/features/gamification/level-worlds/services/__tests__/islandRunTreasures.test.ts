import {
  ISLAND_TREASURES,
  ISLAND_TREASURES_KEY,
  collectIslandTreasureForLanding,
  getIslandTreasure,
  getPendingTileTreasure,
  hasIslandTreasure,
  mergeIslandTreasureCollections,
  resolveTreasureIslandWealth,
  sanitizeIslandTreasureCollection,
} from '../islandRunTreasures';
import { LANDMARK_DOOR_TILE_CONFIGS, generateTileMap, getIslandRarity, getIslandTreasureTileIndex } from '../islandBoardTileMap';
import { sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';
import { resolveIslandRunTileRewardObjectKind } from '../../dev/IslandRunTileRewardThreeObjects';
import { resolveIslandBoardTileInfo } from '../islandBoardTileInfo';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunTreasuresTests: TestCase[] = [
  {
    name: 'Island treasures: about every 5th island, pairs every 20, Sunken Sands hides its own; 30 in total',
    run: () => {
      assertEqual(ISLAND_TREASURES.length, 30, 'the collection holds 30 treasures across 120 islands');
      assert(!hasIslandTreasure(1) && !hasIslandTreasure(4), 'most islands have none');
      assert(hasIslandTreasure(5) && hasIslandTreasure(10), 'every 5th island has one');
      assert(hasIslandTreasure(20) && hasIslandTreasure(21), 'sometimes two in a row');
      assert(!hasIslandTreasure(121), 'nothing past the last island');
      assertEqual(getIslandTreasure(12)?.placement, 'mission', 'Sunken Sands keeps its treasure inside its mission');
      assertEqual(getIslandTreasure(5)?.placement, 'tile', 'others wait on a tile');
      assertEqual(new Set(ISLAND_TREASURES.map((t) => t.name)).size, 30, 'every treasure has a unique name');
      assert(ISLAND_TREASURES.every((t, i) => i === 0 || t.value > ISLAND_TREASURES[i - 1]!.value), 'later treasures are worth more');
    },
  },
  {
    name: 'Island treasures: the tile sits on an ordinary tile away from doors, and disappears once collected',
    run: () => {
      const map = generateTileMap(5, getIslandRarity(5), '', 0, { signatureMissionProgressByIsland: {} });
      const tiles = map.filter((entry) => entry.islandTreasureId);
      assertEqual(tiles.length, 1, 'exactly one treasure tile');
      const tile = tiles[0]!;
      assert(['currency', 'chest', 'micro'].includes(tile.tileType) && !tile.signatureMissionKind, 'an ordinary pool tile');
      assert(LANDMARK_DOOR_TILE_CONFIGS.every((door) => Math.abs(door.tileIndex - tile.index) > 1), 'never beside a landmark door');
      assertEqual(getIslandTreasureTileIndex(5, { signatureMissionProgressByIsland: {} }), tile.index, 'the roll action sees the same tile');
      assertEqual(resolveIslandRunTileRewardObjectKind(tile), 'treasure_chest', 'the board shows a treasure chest there');
      assert(resolveIslandBoardTileInfo({ entry: tile }).title.includes('Treasure'), 'tile info names the treasure');
      assertEqual(generateTileMap(4, getIslandRarity(4), '', 0, {}).some((entry) => entry.islandTreasureId), false, 'no tile on treasure-less islands');
      const collected = { [ISLAND_TREASURES_KEY]: { missionId: 'island-treasures', version: 1, collected: { 'treasure-005': { islandNumber: 5, cycleIndex: 0, atMs: 1 } }, updatedAtMs: 1 } };
      assertEqual(getIslandTreasureTileIndex(5, { signatureMissionProgressByIsland: collected as never }), null, 'gone once collected');
    },
  },
  {
    name: 'Island treasures: only landing exactly on the tile collects, once; the ledger keeps and merges it',
    run: () => {
      const index = getIslandTreasureTileIndex(10, { signatureMissionProgressByIsland: {} })!;
      const miss = collectIslandTreasureForLanding({ ledger: {}, islandNumber: 10, cycleIndex: 0, landingTileIndex: index + 1, treasureTileIndex: index, nowMs: 5 });
      assertEqual(miss.treasure, null, 'passing near it does not collect');
      const hit = collectIslandTreasureForLanding({ ledger: {}, islandNumber: 10, cycleIndex: 0, landingTileIndex: index, treasureTileIndex: index, nowMs: 5 });
      assertEqual(hit.treasure?.id, 'treasure-010', 'landing on it collects');
      assertEqual(getPendingTileTreasure(hit.ledger, 10), null, 'no longer pending');
      const again = collectIslandTreasureForLanding({ ledger: hit.ledger, islandNumber: 10, cycleIndex: 1, landingTileIndex: index, treasureTileIndex: index, nowMs: 9 });
      assertEqual(again.treasure, null, 'never collected twice, even next cycle');
      const sanitized = sanitizeIslandRunSignatureMissionProgress(hit.ledger);
      assert(Boolean(sanitized[ISLAND_TREASURES_KEY]), 'the mission ledger keeps the collection');
      const junk = sanitizeIslandTreasureCollection({ collected: { nope: { atMs: 1 }, 'treasure-005': { islandNumber: 5, atMs: 3 } } });
      assertEqual(Object.keys(junk.collected).join(','), 'treasure-005', 'unknown treasures are dropped');
      const merged = mergeIslandTreasureCollections(
        sanitizeIslandTreasureCollection({ collected: { 'treasure-005': { islandNumber: 5, atMs: 30 } } }),
        sanitizeIslandTreasureCollection({ collected: { 'treasure-005': { islandNumber: 5, atMs: 10 }, 'treasure-010': { islandNumber: 10, atMs: 20 } } }),
      );
      assertEqual(Object.keys(merged.collected).sort().join(','), 'treasure-005,treasure-010', 'devices merge by union');
      assertEqual(merged.collected['treasure-005']!.atMs, 10, 'the earliest find wins');
    },
  },
  {
    name: 'Treasure Island wealth: treasures + investment, with the next treasure to find',
    run: () => {
      const index = getIslandTreasureTileIndex(5, { signatureMissionProgressByIsland: {} })!;
      const { ledger } = collectIslandTreasureForLanding({ ledger: {}, islandNumber: 5, cycleIndex: 0, landingTileIndex: index, treasureTileIndex: index, nowMs: 1 });
      const withMission = { ...ledger, '0:12': { missionId: 'sunken-sands-first-treasure', claimedAtMs: 7 } };
      const wealth = resolveTreasureIslandWealth({ ledger: withMission, vaultInvested: 1_000, currentIslandNumber: 6 });
      assertEqual(wealth.collectedCount, 2, 'tile and mission treasures both count');
      assertEqual(wealth.treasureValue, getIslandTreasure(5)!.value + getIslandTreasure(12)!.value, 'appraised value adds up');
      assertEqual(wealth.total, wealth.treasureValue + 1_000, 'investment adds to the worth');
      assertEqual(wealth.next?.islandNumber, 10, 'the next treasure is on Island 10');
    },
  },
];
