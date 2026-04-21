"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunContractV2SemanticsTests = void 0;
const islandRunContractV2Semantics_1 = require("../islandRunContractV2Semantics");
const testHarness_1 = require("./testHarness");
exports.islandRunContractV2SemanticsTests = [
    {
        name: 'v2 ON: spin token wallet copy is labeled as minigame tokens',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunContractV2Semantics_1.resolveIslandRunSpinTokenWalletLabel)(true), 'Minigame tokens', 'Expected v2 label to use minigame-token wording');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2Semantics_1.formatIslandRunSpinTokenReward)({ islandRunContractV2Enabled: true, amount: 1 }), '+1 token', 'Expected singular token wording for v2');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2Semantics_1.formatIslandRunSpinTokenReward)({ islandRunContractV2Enabled: true, amount: 2 }), '+2 tokens', 'Expected plural token wording for v2');
        },
    },
    {
        name: 'v2 OFF: legacy spin copy remains unchanged',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunContractV2Semantics_1.resolveIslandRunSpinTokenWalletLabel)(false), 'Spins', 'Expected legacy label to stay as Spins');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2Semantics_1.formatIslandRunSpinTokenReward)({ islandRunContractV2Enabled: false, amount: 1 }), '+1 spin', 'Expected singular spin wording in legacy mode');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2Semantics_1.formatIslandRunSpinTokenReward)({ islandRunContractV2Enabled: false, amount: 3 }), '+3 spins', 'Expected plural spin wording in legacy mode');
        },
    },
    {
        name: 'reward HUD state keeps reward-bar values bounded and claimable only when ready',
        run: () => {
            const state = (0, islandRunContractV2Semantics_1.resolveIslandRunContractV2RewardHudState)({
                islandRunContractV2Enabled: true,
                runtimeState: {
                    activeTimedEvent: {
                        eventId: 'evt',
                        eventType: 'focus',
                        startedAtMs: 100,
                        expiresAtMs: 800,
                        version: 1,
                    },
                    rewardBarProgress: 8.8,
                    rewardBarThreshold: 4.2,
                    rewardBarEscalationTier: 0,
                    rewardBarClaimCountInEvent: 0,
                },
                nowMs: 300,
            });
            (0, testHarness_1.assertEqual)(state.rewardBarProgress, 8, 'Expected reward bar progress to be floored');
            (0, testHarness_1.assertEqual)(state.rewardBarThreshold, 4, 'Expected threshold to be floored and bounded');
            (0, testHarness_1.assertEqual)(state.canClaimRewardBar, true, 'Expected claimability when progress meets threshold in v2');
            (0, testHarness_1.assertEqual)(state.timedEventRemainingMs, 500, 'Expected remaining event ms to derive from nowMs');
            (0, testHarness_1.assertEqual)(state.rewardBarPercent, 100, 'Expected reward bar percent to clamp to 100');
            (0, testHarness_1.assertEqual)(state.nextRewardKind, 'dice', 'Expected first reward kind to be dice');
            (0, testHarness_1.assertEqual)(state.nextRewardIcon, '🎲', 'Expected dice reward icon');
        },
    },
];
