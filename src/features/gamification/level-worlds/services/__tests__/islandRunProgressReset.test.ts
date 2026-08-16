import {
  buildFreshIslandRunRecord,
  buildIslandRunResetRecord,
} from '../islandRunProgressReset';
import { resolveIslandRunRecordForConflict } from '../islandRunGameStateStore';
import { ISLAND_RUN_DEFAULT_STARTING_DICE } from '../islandRunEconomy';
import { assert, assertEqual, assertDeepEqual, type TestCase } from './testHarness';

export const islandRunProgressResetTests: TestCase[] = [
  {
    name: 'buildFreshIslandRunRecord starts on island 1 with default dice',
    run: () => {
      const record = buildFreshIslandRunRecord({
        audioEnabled: true,
        musicEnabled: true,
        sfxEnabled: true,
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
    name: 'buildFreshIslandRunRecord preserves split audio preferences',
    run: () => {
      const withAudioOff = buildFreshIslandRunRecord({
        audioEnabled: true,
        musicEnabled: true,
        sfxEnabled: false,
        onboardingDisplayNameLoopCompleted: true,
      });

      assertEqual(withAudioOff.audioEnabled, true, 'Expected world ambience preference to remain enabled');
      assertEqual(withAudioOff.musicEnabled, true, 'Expected musicEnabled = true');
      assertEqual(withAudioOff.sfxEnabled, false, 'Expected sfxEnabled = false');
      assertEqual(withAudioOff.onboardingDisplayNameLoopCompleted, true, 'Expected onboarding completed = true');
    },
  },
  {
    name: 'buildFreshIslandRunRecord clears all island progress and stops',
    run: () => {
      const record = buildFreshIslandRunRecord({
        audioEnabled: true,
        musicEnabled: true,
        sfxEnabled: true,
        onboardingDisplayNameLoopCompleted: false,
      });

      assertDeepEqual(record.completedStopsByIsland, {}, 'Expected empty completedStopsByIsland');
      assertDeepEqual(record.stopTicketsPaidByIsland, {}, 'Expected empty stopTicketsPaidByIsland');
      assertDeepEqual(record.techCollectionByIsland, {}, 'Expected empty techCollectionByIsland');
      assertDeepEqual(record.techCollectionRewardedLinesByIsland, {}, 'Expected empty techCollectionRewardedLinesByIsland');
      assertDeepEqual(record.technologyUnlocksById, {}, 'Expected empty technologyUnlocksById');
      assertDeepEqual(record.marketOwnedBundlesByIsland, {}, 'Expected empty marketOwnedBundlesByIsland');
      assertDeepEqual(record.perIslandEggs, {}, 'Expected empty perIslandEggs');
      assertDeepEqual(record.eggRewardInventory, [], 'Expected empty eggRewardInventory');
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
        musicEnabled: true,
        sfxEnabled: true,
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
        musicEnabled: true,
        sfxEnabled: true,
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
        musicEnabled: true,
        sfxEnabled: true,
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
  {
    name: 'reset can preserve creatures and eggs while always clearing Concord and island progress',
    run: () => {
      const current = buildFreshIslandRunRecord({
        audioEnabled: true,
        musicEnabled: true,
        sfxEnabled: true,
        onboardingDisplayNameLoopCompleted: true,
      });
      current.currentIslandNumber = 9;
      current.techCollectionByIsland = { '1': [3] };
      current.technologyUnlocksById = { concord: { unlockedAtMs: 123 } } as never;
      current.activeEggTier = 'rare';
      current.activeEggSetAtMs = 500;
      current.perIslandEggs = {
        '9': [{ id: 'egg-9', tier: 'rare', status: 'incubating', createdAtMs: 500 }],
      } as never;
      current.eggRewardInventory = [{ id: 'reward-egg', tier: 'rare', grantedAtMs: 500 }] as never;
      current.creatureCollection = [{
        creatureId: 'common-sproutling',
        copies: 1,
        firstCollectedAtMs: 100,
        lastCollectedAtMs: 100,
        lastCollectedIslandNumber: 1,
        bondXp: 0,
        bondLevel: 1,
        lastFedAtMs: null,
        claimedBondMilestones: [],
      }];

      const reset = buildIslandRunResetRecord(current, { resetCreaturesAndEggs: false });

      assertEqual(reset.currentIslandNumber, 1, 'reset should always return to island 1');
      assertDeepEqual(reset.techCollectionByIsland, {}, 'reset should always clear Concord fragments');
      assertDeepEqual(reset.technologyUnlocksById, {}, 'reset should always clear Concord unlocks');
      assertEqual(reset.activeEggTier, 'rare', 'egg incubation should be preserved when unchecked');
      assertDeepEqual(reset.perIslandEggs, current.perIslandEggs, 'egg ledger should be preserved when unchecked');
      assertDeepEqual(reset.eggRewardInventory, current.eggRewardInventory, 'egg rewards should be preserved when unchecked');
      assertDeepEqual(reset.creatureCollection, current.creatureCollection, 'creatures should be preserved when unchecked');
    },
  },
  {
    name: 'authoritative reset conflict replacement cannot resurrect remote Concord eggs or creatures',
    run: () => {
      const localReset = buildFreshIslandRunRecord({
        audioEnabled: true,
        musicEnabled: true,
        sfxEnabled: true,
        onboardingDisplayNameLoopCompleted: true,
      });
      localReset.runtimeVersion = 4;
      const remote = {
        ...localReset,
        runtimeVersion: 11,
        currentIslandNumber: 10,
        techCollectionByIsland: { '1': [3] },
        creatureCollection: [{
          creatureId: 'common-sproutling',
          copies: 1,
          firstCollectedAtMs: 100,
          lastCollectedAtMs: 100,
          lastCollectedIslandNumber: 1,
          bondXp: 0,
          bondLevel: 1,
          lastFedAtMs: null,
          claimedBondMilestones: [],
        }],
      };

      const resolved = resolveIslandRunRecordForConflict({
        remote,
        local: localReset,
        conflictMode: 'replace',
      });

      assertEqual(resolved.runtimeVersion, 11, 'replacement should rebase to latest remote version');
      assertEqual(resolved.currentIslandNumber, 1, 'replacement should retain reset island');
      assertDeepEqual(resolved.techCollectionByIsland, {}, 'replacement must not merge old Concord state');
      assertDeepEqual(resolved.creatureCollection, [], 'replacement must not merge old creatures');
    },
  },
];
