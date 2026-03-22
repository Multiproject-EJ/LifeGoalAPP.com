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
    name: 'rollEncounterReward scales richer rewards for higher islands and quiz type',
    run: () => {
      const values = [0.5, 0.01, 0.01, 0.01, 0.01];
      let index = 0;
      const reward = rollEncounterReward({ islandNumber: 65, challengeType: 'quiz', random: () => values[index++] ?? 0.01 });
      assert(reward.coins >= 14, 'Expected higher-tier encounter rewards to scale coin floor upward');
      assertEqual(reward.dice > 0, true, 'Expected quiz rewards to be able to grant dice');
      assertEqual(reward.spinTokens, 1, 'Expected deterministic random path to grant a spin token');
    },
  },
  {
    name: 'formatEncounterRewardSummary includes dice and spin rewards when present',
    run: () => {
      const summary = formatEncounterRewardSummary({ coins: 18, heart: true, walletShards: true, dice: 4, spinTokens: 1 });
      assert(summary.includes('+4 dice'), 'Expected dice reward text in summary');
      assert(summary.includes('+1 spin'), 'Expected spin reward text in summary');
    },
  },
  {
    name: 'formatEncounterRewardSummary omits optional rewards when absent',
    run: () => {
      const summary = formatEncounterRewardSummary({ coins: 9, heart: false, walletShards: false, dice: 0, spinTokens: 0 });
      assertEqual(summary, '+9 coins', 'Expected summary to stay compact when only coins are awarded');
    },
  },
];
