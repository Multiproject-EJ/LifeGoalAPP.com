import { buildFreshIslandRunRecord } from '../islandRunProgressReset';
import { ISLAND_RUN_DEFAULT_STARTING_DICE } from '../islandRunEconomy';
import { assert, assertEqual, assertDeepEqual, type TestCase } from './testHarness';

export const islandRunProgressResetTests: TestCase[] = [
  {
    name: 'buildFreshIslandRunRecord starts on island 1 with default dice',
    run: () => {
      const record = buildFreshIslandRunRecord({
        audioEnabled: true,
        onboardingDisplayNameLoopCompleted: false,
      });

      assertEqual(record.currentIslandNumber, 1, 'Expected currentIslandNumber = 1');
      assertEqual(record.cycleIndex, 0, 'Expected cycleIndex = 0');
      assertEqual(record.tokenIndex, 0, 'Expected tokenIndex = 0');
      assertEqual(record.dicePool, ISLAND_RUN_DEFAULT_STARTING_DICE, 'Expected starting dice');
      assertEqual(record.essence, 0, 'Expected essence = 0');
      assertEqual(record.essenceLifetimeEarned, 0, 'Expected essenceLifetimeEarned = 0');
      assertEqual(record.essenceLifetimeSpent, 0, 'Expected essenceLifetimeSpent = 0');
      assertEqual(record.shards, 0, 'Expected shards = 0');
      assertEqual(record.diamonds, 3, 'Expected diamonds = 3');
      assertEqual(record.shields, 0, 'Expected shields = 0');
      assertEqual(record.spinTokens, 0, 'Expected spinTokens = 0');
      assertEqual(record.firstRunClaimed, false, 'Expected firstRunClaimed = false');
      assertEqual(record.storyPrologueSeen, false, 'Expected storyPrologueSeen = false');
    },
  },
  {
    name: 'buildFreshIslandRunRecord preserves audioEnabled preference',
    run: () => {
      const withAudioOff = buildFreshIslandRunRecord({
        audioEnabled: false,
        onboardingDisplayNameLoopCompleted: true,
      });

      assertEqual(withAudioOff.audioEnabled, false, 'Expected audioEnabled = false');
      assertEqual(withAudioOff.onboardingDisplayNameLoopCompleted, true, 'Expected onboarding completed = true');
    },
  },
  {
    name: 'buildFreshIslandRunRecord clears all island progress and stops',
    run: () => {
      const record = buildFreshIslandRunRecord({
        audioEnabled: true,
        onboardingDisplayNameLoopCompleted: false,
      });

      assertDeepEqual(record.completedStopsByIsland, {}, 'Expected empty completedStopsByIsland');
      assertDeepEqual(record.stopTicketsPaidByIsland, {}, 'Expected empty stopTicketsPaidByIsland');
      assertDeepEqual(record.marketOwnedBundlesByIsland, {}, 'Expected empty marketOwnedBundlesByIsland');
      assertDeepEqual(record.perIslandEggs, {}, 'Expected empty perIslandEggs');
      assertDeepEqual(record.creatureCollection, [], 'Expected empty creatureCollection');
      assertEqual(record.activeCompanionId, null, 'Expected null activeCompanionId');
      assertEqual(record.activeEggTier, null, 'Expected null activeEggTier');
      assertEqual(record.bossState.unlocked, false, 'Expected boss unlocked = false');
      assertEqual(record.bossState.objectiveComplete, false, 'Expected boss objective = false');
      assertEqual(record.bossState.buildComplete, false, 'Expected boss build = false');
    },
  },
  {
    name: 'buildFreshIslandRunRecord resets reward bar and timed events',
    run: () => {
      const record = buildFreshIslandRunRecord({
        audioEnabled: true,
        onboardingDisplayNameLoopCompleted: false,
      });

      assertEqual(record.rewardBarProgress, 0, 'Expected rewardBarProgress = 0');
      assertEqual(record.rewardBarClaimCountInEvent, 0, 'Expected rewardBarClaimCountInEvent = 0');
      assertEqual(record.activeTimedEvent, null, 'Expected null activeTimedEvent');
      assertDeepEqual(record.stickerInventory, {}, 'Expected empty stickerInventory');
    },
  },
  {
    name: 'buildFreshIslandRunRecord provides starting creature treat inventory',
    run: () => {
      const record = buildFreshIslandRunRecord({
        audioEnabled: true,
        onboardingDisplayNameLoopCompleted: false,
      });

      assertDeepEqual(
        record.creatureTreatInventory,
        { basic: 3, favorite: 1, rare: 0 },
        'Expected default creature treat inventory',
      );
    },
  },
  {
    name: 'buildFreshIslandRunRecord sets 48-hour island expiry',
    run: () => {
      const before = Date.now();
      const record = buildFreshIslandRunRecord({
        audioEnabled: true,
        onboardingDisplayNameLoopCompleted: false,
      });
      const after = Date.now();
      const fortyEightHoursMs = 48 * 60 * 60 * 1000;

      assert(record.islandStartedAtMs >= before, 'islandStartedAtMs should be >= before');
      assert(record.islandStartedAtMs <= after, 'islandStartedAtMs should be <= after');
      assert(
        record.islandExpiresAtMs >= before + fortyEightHoursMs,
        'islandExpiresAtMs should be >= before + 48h',
      );
      assert(
        record.islandExpiresAtMs <= after + fortyEightHoursMs,
        'islandExpiresAtMs should be <= after + 48h',
      );
    },
  },
];
