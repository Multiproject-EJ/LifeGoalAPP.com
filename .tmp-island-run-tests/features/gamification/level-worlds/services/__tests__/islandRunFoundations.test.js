"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunFoundationTests = void 0;
const islandBoardTileMap_1 = require("../islandBoardTileMap");
const islandRunEconomy_1 = require("../islandRunEconomy");
const islandRunStops_1 = require("../islandRunStops");
const islandRunRuntimeState_1 = require("../islandRunRuntimeState");
const testHarness_1 = require("./testHarness");
exports.islandRunFoundationTests = [
    {
        name: 'generateTileMap produces no stop tiles (stops are external side quests)',
        run: () => {
            const map = (0, islandBoardTileMap_1.generateTileMap)(9, (0, islandBoardTileMap_1.getIslandRarity)(9), 'forest', 0);
            (0, testHarness_1.assertEqual)(map.length, 40, 'Expected 40 tiles on the spark40 ring');
            const stopTiles = map.filter((tile) => tile.tileType === 'stop');
            (0, testHarness_1.assertEqual)(stopTiles.length, 0, 'Expected zero tiles with tileType="stop" — stops are off-board');
            // Every tile should be a regular feeding / hazard / encounter tile.
            // `event` tile type retired — see TILE_POOL comment in islandBoardTileMap.ts.
            const validTypes = new Set(['currency', 'chest', 'hazard', 'micro', 'encounter']);
            map.forEach((tile) => {
                (0, testHarness_1.assertEqual)(validTypes.has(tile.tileType), true, `Tile #${tile.index} has unexpected tileType "${tile.tileType}"`);
            });
        },
    },
    {
        name: 'normal-island encounter tile unlocks after day index 2',
        run: () => {
            const before = (0, islandBoardTileMap_1.generateTileMap)(3, 'normal', 'forest', 1);
            const after = (0, islandBoardTileMap_1.generateTileMap)(3, 'normal', 'forest', 2);
            (0, testHarness_1.assert)(before[6]?.tileType !== 'encounter', 'Expected day 1 encounter to remain hidden on normal islands');
            (0, testHarness_1.assertEqual)(after[6]?.tileType, 'encounter', 'Expected day 2 encounter tile to unlock');
        },
    },
    {
        name: 'generateIslandStopPlan always includes at least one behavior stop',
        run: () => {
            const plan = (0, islandRunStops_1.generateIslandStopPlan)(12);
            (0, testHarness_1.assertEqual)(plan.length, 5, 'Expected five canonical stops');
            (0, testHarness_1.assert)(plan.some((stop) => stop.isBehaviorStop), 'Expected at least one behavior-oriented dynamic stop');
        },
    },
    {
        name: 'ISLAND_RUN_DEFAULT_STARTING_DICE is a sane starting value',
        run: () => {
            (0, testHarness_1.assert)(islandRunEconomy_1.ISLAND_RUN_DEFAULT_STARTING_DICE >= 10, 'Expected starting dice to be at least 10');
            (0, testHarness_1.assert)(islandRunEconomy_1.ISLAND_RUN_DEFAULT_STARTING_DICE <= 200, 'Expected starting dice to be at most 200');
            (0, testHarness_1.assertEqual)(islandRunEconomy_1.ISLAND_RUN_DEFAULT_STARTING_DICE, 30, 'Expected default starting dice to be 30');
        },
    },
    {
        name: 'resolveCollectibleForClaim cycles through the collectible roster',
        run: () => {
            const first = (0, islandRunRuntimeState_1.resolveCollectibleForClaim)(0);
            const wrapped = (0, islandRunRuntimeState_1.resolveCollectibleForClaim)(7);
            (0, testHarness_1.assertEqual)(first.name, wrapped.name, 'Expected collectible roster to wrap every 7 claims');
        },
    },
];
