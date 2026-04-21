"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunProgressionTests = void 0;
const islandRunProgression_1 = require("../islandRunProgression");
const testHarness_1 = require("./testHarness");
exports.islandRunProgressionTests = [
    {
        name: 'getRequiredStopIdsForIsland returns all canonical stop ids',
        run: () => {
            (0, testHarness_1.assertDeepEqual)((0, islandRunProgression_1.getRequiredStopIdsForIsland)(9), ['hatchery', 'habit', 'mystery', 'wisdom', 'boss'], 'Expected progression gating to require every canonical stop');
        },
    },
    {
        name: 'isIslandFullyCleared requires all stop ids including boss',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunProgression_1.isIslandFullyCleared)(9, ['hatchery', 'habit', 'mystery', 'wisdom']), false, 'Expected missing boss stop to block completion');
            (0, testHarness_1.assertEqual)((0, islandRunProgression_1.isIslandFullyCleared)(9, ['hatchery', 'habit', 'mystery', 'wisdom', 'boss']), true, 'Expected all stops to count as a full clear');
        },
    },
    {
        name: 'getNextIslandOnExpiry always advances to the next island',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunProgression_1.getNextIslandOnExpiry)(12, ['hatchery', 'habit', 'mystery', 'wisdom']), 13, 'Expected incomplete island expiry to unlock the next island');
            (0, testHarness_1.assertEqual)((0, islandRunProgression_1.getNextIslandOnExpiry)(12, ['hatchery', 'habit', 'mystery', 'wisdom', 'boss']), 13, 'Expected cleared island expiry to advance to the next island');
        },
    },
];
