import { resolveJourneyChestReward } from '../combinedJourneyRewardLadder';
import { assertEqual, type TestCase } from './testHarness';

export const combinedJourneyRewardLadderTests: TestCase[] = [
  {
    name: 'grants eggs on multiples of three, else dice (even) or essence (odd)',
    run: () => {
      assertEqual(resolveJourneyChestReward(2).kind, 'dice', 'Expected even threshold to grant dice');
      assertEqual(resolveJourneyChestReward(3).kind, 'egg', 'Expected multiple of three to grant an egg');
      assertEqual(resolveJourneyChestReward(4).kind, 'dice', 'Expected even threshold to grant dice');
      assertEqual(resolveJourneyChestReward(5).kind, 'essence', 'Expected odd non-multiple-of-three to grant essence');
      assertEqual(resolveJourneyChestReward(6).kind, 'egg', 'Expected multiple of three to grant an egg');
      assertEqual(resolveJourneyChestReward(9).kind, 'egg', 'Expected multiple of three to grant an egg');
    },
  },
  {
    name: 'reward amounts grow one band every five levels (mirrors the SQL RPC)',
    run: () => {
      assertEqual(resolveJourneyChestReward(2).amount, 10, 'dice band 0 = 10');
      assertEqual(resolveJourneyChestReward(3).amount, 1, 'egg amount is always 1');
      assertEqual(resolveJourneyChestReward(5).amount, 8, 'essence band 1 = 5 + 3');
      assertEqual(resolveJourneyChestReward(8).amount, 15, 'dice band 1 = 10 + 5');
      assertEqual(resolveJourneyChestReward(10).amount, 20, 'dice band 2 = 10 + 10');
      assertEqual(resolveJourneyChestReward(11).amount, 11, 'essence band 2 = 5 + 6');
    },
  },
  {
    name: 'clamps non-positive / fractional thresholds to a safe reward',
    run: () => {
      const reward = resolveJourneyChestReward(0);
      assertEqual(reward.kind, 'essence', 'Expected clamped level 1 (odd) to grant essence');
      assertEqual(reward.amount, 5, 'Expected clamped level 1 essence amount');
      assertEqual(resolveJourneyChestReward(4.9).kind, 'dice', 'Expected fractional 4.9 to floor to 4 (dice)');
    },
  },
];
