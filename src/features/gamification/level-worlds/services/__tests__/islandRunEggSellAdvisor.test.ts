import { adviseEggSellChoice } from '../islandRunEggSellAdvisor';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunEggSellAdvisorTests: TestCase[] = [
  {
    name: 'near sticker completion prefers shards',
    run: () => {
      const result = adviseEggSellChoice({
        tier: 'common',
        shardsBalance: 58,
        diceBalance: 30,
        nextStickerShardCost: 60,
      });
      assertEqual(result.recommendedChoice, 'shards', 'Expected shards recommendation near sticker threshold');
    },
  },
  {
    name: 'low dice balance prefers dice',
    run: () => {
      const result = adviseEggSellChoice({
        tier: 'rare',
        shardsBalance: 15,
        diceBalance: 0,
        nextStickerShardCost: 120,
      });
      assertEqual(result.recommendedChoice, 'dice', 'Expected dice recommendation when dice balance is empty');
    },
  },
  {
    name: 'non-urgent state falls back to shards (tie/long-term progression)',
    run: () => {
      const result = adviseEggSellChoice({
        tier: 'mythic',
        shardsBalance: 150,
        diceBalance: 120,
        nextStickerShardCost: 220,
      });
      assertEqual(result.recommendedChoice, 'shards', 'Expected shards fallback recommendation');
    },
  },
];
