"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunProgressResetTests = void 0;
const islandRunProgressReset_1 = require("../islandRunProgressReset");
const islandRunEconomy_1 = require("../islandRunEconomy");
const testHarness_1 = require("./testHarness");
exports.islandRunProgressResetTests = [
    {
        name: 'buildFreshIslandRunRecord starts on island 1 with default dice',
        run: () => {
            const record = (0, islandRunProgressReset_1.buildFreshIslandRunRecord)({
                audioEnabled: true,
                onboardingDisplayNameLoopCompleted: false,
            });
            (0, testHarness_1.assertEqual)(record.currentIslandNumber, 1, 'Expected currentIslandNumber = 1');
            (0, testHarness_1.assertEqual)(record.cycleIndex, 0, 'Expected cycleIndex = 0');
            (0, testHarness_1.assertEqual)(record.tokenIndex, 0, 'Expected tokenIndex = 0');
            (0, testHarness_1.assertEqual)(record.dicePool, islandRunEconomy_1.ISLAND_RUN_DEFAULT_STARTING_DICE, 'Expected starting dice');
            (0, testHarness_1.assertEqual)(record.essence, 0, 'Expected essence = 0');
            (0, testHarness_1.assertEqual)(record.essenceLifetimeEarned, 0, 'Expected essenceLifetimeEarned = 0');
            (0, testHarness_1.assertEqual)(record.essenceLifetimeSpent, 0, 'Expected essenceLifetimeSpent = 0');
            (0, testHarness_1.assertEqual)(record.shards, 0, 'Expected shards = 0');
            (0, testHarness_1.assertEqual)(record.diamonds, 3, 'Expected diamonds = 3');
            (0, testHarness_1.assertEqual)(record.shields, 0, 'Expected shields = 0');
            (0, testHarness_1.assertEqual)(record.spinTokens, 0, 'Expected spinTokens = 0');
            (0, testHarness_1.assertEqual)(record.firstRunClaimed, false, 'Expected firstRunClaimed = false');
            (0, testHarness_1.assertEqual)(record.storyPrologueSeen, false, 'Expected storyPrologueSeen = false');
        },
    },
    {
        name: 'buildFreshIslandRunRecord preserves audioEnabled preference',
        run: () => {
            const withAudioOff = (0, islandRunProgressReset_1.buildFreshIslandRunRecord)({
                audioEnabled: false,
                onboardingDisplayNameLoopCompleted: true,
            });
            (0, testHarness_1.assertEqual)(withAudioOff.audioEnabled, false, 'Expected audioEnabled = false');
            (0, testHarness_1.assertEqual)(withAudioOff.onboardingDisplayNameLoopCompleted, true, 'Expected onboarding completed = true');
        },
    },
    {
        name: 'buildFreshIslandRunRecord clears all island progress and stops',
        run: () => {
            const record = (0, islandRunProgressReset_1.buildFreshIslandRunRecord)({
                audioEnabled: true,
                onboardingDisplayNameLoopCompleted: false,
            });
            (0, testHarness_1.assertDeepEqual)(record.completedStopsByIsland, {}, 'Expected empty completedStopsByIsland');
            (0, testHarness_1.assertDeepEqual)(record.stopTicketsPaidByIsland, {}, 'Expected empty stopTicketsPaidByIsland');
            (0, testHarness_1.assertDeepEqual)(record.marketOwnedBundlesByIsland, {}, 'Expected empty marketOwnedBundlesByIsland');
            (0, testHarness_1.assertDeepEqual)(record.perIslandEggs, {}, 'Expected empty perIslandEggs');
            (0, testHarness_1.assertDeepEqual)(record.creatureCollection, [], 'Expected empty creatureCollection');
            (0, testHarness_1.assertEqual)(record.activeCompanionId, null, 'Expected null activeCompanionId');
            (0, testHarness_1.assertEqual)(record.activeEggTier, null, 'Expected null activeEggTier');
            (0, testHarness_1.assertEqual)(record.bossState.unlocked, false, 'Expected boss unlocked = false');
            (0, testHarness_1.assertEqual)(record.bossState.objectiveComplete, false, 'Expected boss objective = false');
            (0, testHarness_1.assertEqual)(record.bossState.buildComplete, false, 'Expected boss build = false');
        },
    },
    {
        name: 'buildFreshIslandRunRecord resets reward bar and timed events',
        run: () => {
            const record = (0, islandRunProgressReset_1.buildFreshIslandRunRecord)({
                audioEnabled: true,
                onboardingDisplayNameLoopCompleted: false,
            });
            (0, testHarness_1.assertEqual)(record.rewardBarProgress, 0, 'Expected rewardBarProgress = 0');
            (0, testHarness_1.assertEqual)(record.rewardBarClaimCountInEvent, 0, 'Expected rewardBarClaimCountInEvent = 0');
            (0, testHarness_1.assertEqual)(record.activeTimedEvent, null, 'Expected null activeTimedEvent');
            (0, testHarness_1.assertDeepEqual)(record.stickerInventory, {}, 'Expected empty stickerInventory');
        },
    },
    {
        name: 'buildFreshIslandRunRecord provides starting creature treat inventory',
        run: () => {
            const record = (0, islandRunProgressReset_1.buildFreshIslandRunRecord)({
                audioEnabled: true,
                onboardingDisplayNameLoopCompleted: false,
            });
            (0, testHarness_1.assertDeepEqual)(record.creatureTreatInventory, { basic: 3, favorite: 1, rare: 0 }, 'Expected default creature treat inventory');
        },
    },
    {
        name: 'buildFreshIslandRunRecord sets 48-hour island expiry',
        run: () => {
            const before = Date.now();
            const record = (0, islandRunProgressReset_1.buildFreshIslandRunRecord)({
                audioEnabled: true,
                onboardingDisplayNameLoopCompleted: false,
            });
            const after = Date.now();
            const fortyEightHoursMs = 48 * 60 * 60 * 1000;
            (0, testHarness_1.assert)(record.islandStartedAtMs >= before, 'islandStartedAtMs should be >= before');
            (0, testHarness_1.assert)(record.islandStartedAtMs <= after, 'islandStartedAtMs should be <= after');
            (0, testHarness_1.assert)(record.islandExpiresAtMs >= before + fortyEightHoursMs, 'islandExpiresAtMs should be >= before + 48h');
            (0, testHarness_1.assert)(record.islandExpiresAtMs <= after + fortyEightHoursMs, 'islandExpiresAtMs should be <= after + 48h');
        },
    },
];
