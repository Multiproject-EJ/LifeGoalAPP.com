import { SPIN_PRIZES, type SpinPrize } from '../../../../../types/gamification';
import {
  DAILY_SPIN_DICE_REWARD_AMOUNTS,
  resolveDailySpinAwards,
} from '../../../../../services/dailySpinRewardPolicy';
import {
  buildDailySpinPrizePool,
  ISLAND_THREE_JACKPOT_PRIZE,
  selectDailySpinPrize,
} from '../../../../../services/dailySpinPrizePool';
import { assert, assertEqual, type TestCase } from './testHarness';

function prize(type: SpinPrize['type'], value = 1): SpinPrize {
  return { type, value, label: type, icon: 'test' };
}

export const dailySpinRewardPolicyTests: TestCase[] = [
  {
    name: 'visible Daily Spin dice segments use the 25 to 500 dice economy ladder',
    run: () => {
      const dicePrizes = SPIN_PRIZES.filter((entry) => entry.type === 'dice');
      assertEqual(dicePrizes.length, 6, 'wheel should expose six weighted dice outcomes');
      assert(
        dicePrizes.every((entry) => entry.value >= DAILY_SPIN_DICE_REWARD_AMOUNTS.minimum),
        'every visible dice outcome should award at least 25 dice',
      );
      assert(
        dicePrizes.some((entry) => entry.value === DAILY_SPIN_DICE_REWARD_AMOUNTS.rare),
        'the rare visible dice outcome should award 250 dice',
      );
      assert(
        dicePrizes.some((entry) => entry.value === DAILY_SPIN_DICE_REWARD_AMOUNTS.ultraRare),
        'the ultra-rare visible dice outcome should award 500 dice',
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
      const awards = resolveDailySpinAwards(prize('dice', 500), 1);
      assertEqual(awards[0]?.amount, 500, 'visible 500 Dice prize must resolve to exactly 500 dice');
    },
  },
  {
    name: 'Island 3 adds one guaranteed 2000 dice jackpot until it has been claimed',
    run: () => {
      const unclaimed = buildDailySpinPrizePool({
        basePrizes: SPIN_PRIZES,
        currentIslandNumber: 3,
        islandThreeJackpotClaimed: false,
      });
      const claimed = buildDailySpinPrizePool({
        basePrizes: SPIN_PRIZES,
        currentIslandNumber: 3,
        islandThreeJackpotClaimed: true,
      });
      assertEqual(
        unclaimed.filter((entry) => entry.details?.island3Jackpot === true).length,
        1,
        'unclaimed Island 3 pool should contain exactly one jackpot segment',
      );
      assertEqual(
        claimed.filter((entry) => entry.details?.island3Jackpot === true).length,
        0,
        'claimed Island 3 pool must not offer the jackpot again',
      );
      assertEqual(
        selectDailySpinPrize(unclaimed, () => 0.999).value,
        DAILY_SPIN_DICE_REWARD_AMOUNTS.islandThreeJackpot,
        'the first Island 3 wheel spin should force the jackpot',
      );
    },
  },
  {
    name: 'Island 3 jackpot ignores reward multipliers and stays exactly 2000 dice',
    run: () => {
      const awards = resolveDailySpinAwards(ISLAND_THREE_JACKPOT_PRIZE, 3);
      assertEqual(awards[0]?.currency, 'dice', 'jackpot should credit the dice wallet');
      assertEqual(
        awards[0]?.amount,
        DAILY_SPIN_DICE_REWARD_AMOUNTS.islandThreeJackpot,
        'jackpot must not inflate to 6000 dice through the boost control',
      );
    },
  },
];
