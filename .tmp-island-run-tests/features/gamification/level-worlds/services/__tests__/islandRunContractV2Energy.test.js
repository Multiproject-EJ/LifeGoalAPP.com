"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunContractV2EnergyTests = void 0;
const islandRunContractV2Energy_1 = require("../islandRunContractV2Energy");
const testHarness_1 = require("./testHarness");
exports.islandRunContractV2EnergyTests = [
    {
        name: 'roll availability depends on dice only',
        run: () => {
            const mode = (0, islandRunContractV2Energy_1.resolveIslandRunRollButtonMode)({
                isRolling: false,
                dicePool: 1,
                dicePerRoll: 2,
            });
            const depleted = (0, islandRunContractV2Energy_1.isIslandRunRollEnergyDepleted)({
                dicePool: 1,
                dicePerRoll: 2,
            });
            (0, testHarness_1.assertEqual)(mode, 'no_dice', 'Expected mode to block roll without enough dice');
            (0, testHarness_1.assertEqual)(depleted, true, 'Expected energy to be depleted when dicePool < dicePerRoll');
        },
    },
    {
        name: 'roll is available when dice pool is sufficient',
        run: () => {
            const mode = (0, islandRunContractV2Energy_1.resolveIslandRunRollButtonMode)({
                isRolling: false,
                dicePool: 2,
                dicePerRoll: 2,
            });
            const depleted = (0, islandRunContractV2Energy_1.isIslandRunRollEnergyDepleted)({
                dicePool: 2,
                dicePerRoll: 2,
            });
            (0, testHarness_1.assertEqual)(mode, 'roll', 'Expected roll mode when dice are available');
            (0, testHarness_1.assertEqual)(depleted, false, 'Expected energy not depleted with enough dice');
        },
    },
    {
        name: 'boss retry is always allowed (hearts retired)',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunContractV2Energy_1.canRetryBossTrial)(), true, 'Expected boss retry to always be available');
        },
    },
    {
        name: 'timer label is always Timer:',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunContractV2Energy_1.resolveIslandRunTimerLabel)(), 'Timer:', 'Expected timer label to always be Timer:');
        },
    },
    {
        name: 'rolling state returns rolling mode',
        run: () => {
            const mode = (0, islandRunContractV2Energy_1.resolveIslandRunRollButtonMode)({
                isRolling: true,
                dicePool: 100,
                dicePerRoll: 2,
            });
            (0, testHarness_1.assertEqual)(mode, 'rolling', 'Expected rolling mode when isRolling is true');
        },
    },
];
