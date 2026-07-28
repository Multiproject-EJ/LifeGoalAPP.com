import { SPIN_PRIZES, type SpinPrize } from '../../../../../types/gamification';
import {
  DAILY_SPIN_DICE_REWARD_AMOUNTS,
  resolveDailySpinAwards,
} from '../../../../../services/dailySpinRewardPolicy';
import { assert, assertEqual, type TestCase } from './testHarness';

function prize(type: SpinPrize['type'], value = 1): SpinPrize {
  return { type, value, label: type, icon: 'test' };
}

export const dailySpinRewardPolicyTests: TestCase[] = [
  {
    name: 'visible Daily Spin dice segments award between 50 and 125 base dice',
    run: () => {
      const dicePrizes = SPIN_PRIZES.filter((entry) => entry.type === 'dice');
      assertEqual(dicePrizes.length, 2, 'wheel should retain two visible dice segments');
      assert(
        dicePrizes.every((entry) => entry.value >= DAILY_SPIN_DICE_REWARD_AMOUNTS.standard),
        'every visible dice outcome should award at least 50 dice',
      );
      assert(
        dicePrizes.some((entry) => entry.value === DAILY_SPIN_DICE_REWARD_AMOUNTS.rare),
        'the rare visible dice outcome should award 125 dice',
      );
    },
  },
  {
    name: 'rare treasure chest includes 100 dice and respects reward multiplier',
    run: () => {
      const awards = resolveDailySpinAwards(prize('treasure_chest'), 2);
      const dice = awards.find((award) => award.currency === 'dice');
      assertEqual(
        dice?.amount,
        DAILY_SPIN_DICE_REWARD_AMOUNTS.treasureChest * 2,
        'boosted treasure chest should multiply its dice award',
      );
    },
  },
  {
    name: 'legendary mystery dice outcome awards 250 base dice',
    run: () => {
      // Mystery order is money, essence, dice, gold; 0.6 selects dice.
      const awards = resolveDailySpinAwards(prize('mystery'), 1, () => 0.6);
      assertEqual(awards[0]?.currency, 'dice', 'deterministic mystery pick should select dice');
      assertEqual(
        awards[0]?.amount,
        DAILY_SPIN_DICE_REWARD_AMOUNTS.legendaryMystery,
        'legendary mystery dice should award 250',
      );
    },
  },
  {
    name: 'direct dice prize award payload matches its visible wheel value',
    run: () => {
      const awards = resolveDailySpinAwards(prize('dice', 125), 1);
      assertEqual(awards[0]?.amount, 125, 'visible 125 Dice prize must resolve to exactly 125 dice');
    },
  },
];
