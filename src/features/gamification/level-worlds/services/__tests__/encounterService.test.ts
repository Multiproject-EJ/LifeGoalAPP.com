import { drawEncounterChallengeForBucket, formatEncounterRewardSummary, rollEncounterReward } from '../encounterService';
import { assert, assertEqual, type TestCase } from './testHarness';

export const encounterServiceTests: TestCase[] = [
  {
    name: 'drawEncounterChallengeForBucket is deterministic for the same island tile bucket',
    run: () => {
      const first = drawEncounterChallengeForBucket({ islandNumber: 12, tileIndex: 6, timeBucket: 12345 });
      const second = drawEncounterChallengeForBucket({ islandNumber: 12, tileIndex: 6, timeBucket: 12345 });
      assertEqual(JSON.stringify(first), JSON.stringify(second), 'Expected deterministic encounter challenge selection');
    },
  },
  {
    name: 'drawEncounterChallengeForBucket returns reusable metadata for UI copy',
    run: () => {
      const challenge = drawEncounterChallengeForBucket({ islandNumber: 7, tileIndex: 4, timeBucket: 200 });
      assert(challenge.id.length > 0, 'Expected encounter challenges to expose stable ids');
      assert(challenge.title.length > 0, 'Expected encounter challenges to expose titles');
      assert(challenge.completionLabel.length > 0, 'Expected encounter challenges to expose completion labels');
    },
  },
  {
    name: 'rollEncounterReward never returns direct dice',
    run: () => {
      // Test across multiple challenge types and island tiers to confirm no dice in any path
      const quizReward = rollEncounterReward({ islandNumber: 65, challengeType: 'quiz', random: () => 0.01 });
      assert(!('dice' in quizReward), 'Expected rollEncounterReward to not include a dice field');

      const breathingReward = rollEncounterReward({ islandNumber: 1, challengeType: 'breathing', random: () => 0.99 });
      assert(!('dice' in breathingReward), 'Expected rollEncounterReward to not include a dice field for breathing');

      const gratitudeReward = rollEncounterReward({ islandNumber: 30, challengeType: 'gratitude', random: () => 0.5 });
      assert(!('dice' in gratitudeReward), 'Expected rollEncounterReward to not include a dice field for gratitude');
    },
  },
  {
    name: 'rollEncounterReward scales richer essence rewards for higher islands and quiz type',
    run: () => {
      const values = [0.5, 0.01, 0.01];
      let index = 0;
      const reward = rollEncounterReward({ islandNumber: 65, challengeType: 'quiz', random: () => values[index++] ?? 0.01 });
      assert(reward.essence >= 14, 'Expected higher-tier encounter rewards to scale essence floor upward');
      assertEqual(reward.spinTokens, 1, 'Expected deterministic random path to grant a spin token');
    },
  },
  {
    name: 'formatEncounterRewardSummary never includes dice text',
    run: () => {
      const summary = formatEncounterRewardSummary({ essence: 18, walletShards: true, spinTokens: 1 });
      assert(!summary.includes('dice'), 'Expected no dice text in encounter reward summary');
      assert(summary.includes('+1 spin'), 'Expected spin reward text in summary');
      assert(summary.includes('+18 essence'), 'Expected essence reward text in summary');
    },
  },
  {
    name: 'formatEncounterRewardSummary omits optional rewards when absent',
    run: () => {
      const summary = formatEncounterRewardSummary({ essence: 9, walletShards: false, spinTokens: 0 });
      assertEqual(summary, '+9 essence', 'Expected summary to stay compact when only essence is awarded');
    },
  },
  {
    name: 'rollEncounterReward still awards essence and spin/shard rewards',
    run: () => {
      // Force all chances to hit
      const reward = rollEncounterReward({ islandNumber: 65, challengeType: 'quiz', random: () => 0.01 });
      assert(reward.essence > 0, 'Expected essence to be awarded');
      assertEqual(reward.walletShards, true, 'Expected shards to be awarded when chance hits');
      assertEqual(reward.spinTokens, 1, 'Expected spin token to be awarded when chance hits');
    },
  },
  {
    name: 'rollEncounterReward omits shard and spin when chances do not hit',
    run: () => {
      const reward = rollEncounterReward({ islandNumber: 1, challengeType: 'breathing', random: () => 0.99 });
      assert(reward.essence > 0, 'Expected essence even when optional rewards are skipped');
      assertEqual(reward.walletShards, false, 'Expected no shards when chance does not hit');
      assertEqual(reward.spinTokens, 0, 'Expected no spin tokens when chance does not hit');
    },
  },
];
