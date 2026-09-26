import { SPIN_PRIZES, type SpinPrize } from '../../../../../types/gamification';
import {
  DAILY_SPIN_DICE_REWARD_AMOUNTS,
  DAILY_SPIN_SUPER_SLICE_OPTIONS,
  resolveDailySpinAwards,
} from '../../../../../services/dailySpinRewardPolicy';
import {
  buildDailySpinPrizePool,
  ISLAND_THREE_JACKPOT_PRIZE,
  selectDailySpinPrize,
} from '../../../../../services/dailySpinPrizePool';
import {
  applySuperSliceLuck,
  normalizeSuperSliceHistory,
  resolveSuperSliceLuck,
  SUPER_SLICE_LAUNCHED_AT_MS,
} from '../../../../../services/dailySpinSuperLuck';
import { assert, assertEqual, type TestCase } from './testHarness';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 11, 1, 12);
const isoDay = (ms: number) => new Date(ms).toISOString().split('T')[0];
/** `count` ordinary spins, one per day, ending yesterday; newest first. */
function spins(count: number, endMs = NOW - DAY): { prizeType: string; spunAtMs: number }[] {
  return Array.from({ length: count }, (_, index) => ({ prizeType: 'dice', spunAtMs: endMs - index * DAY }));
}

function prize(type: SpinPrize['type'], value = 1): SpinPrize {
  return { type, value, label: type, icon: 'test' };
}

export const dailySpinRewardPolicyTests: TestCase[] = [
  {
    name: 'Super Slice luck combines comeback, bad-luck and new-player boosts under hard caps',
    run: () => {
      const yesterday = isoDay(NOW - DAY);
      // Weekly cap: nothing lands again within 7 days of a Super Slice.
      const recentSuper = [{ prizeType: 'super', spunAtMs: NOW - 3 * DAY }, ...spins(5)];
      const cooling = resolveSuperSliceLuck({ history: recentSuper, totalSpinsUsed: 300, lastSpinDate: isoDay(NOW - 20 * DAY), nowMs: NOW });
      assert(cooling.onCooldown && cooling.multiplier === 0 && !cooling.guaranteed, 'cooldown beats comeback luck and guarantees');
      assertEqual(applySuperSliceLuck(SPIN_PRIZES, cooling).find((entry) => entry.type === 'super')?.wheelWeight, 0, 'cooldown removes the slice from the draw');
      const rested = resolveSuperSliceLuck({ history: [{ prizeType: 'super', spunAtMs: NOW - 8 * DAY }], totalSpinsUsed: 300, lastSpinDate: yesterday, nowMs: NOW });
      assert(!rested.onCooldown && rested.multiplier === 1, 'after a week the slice is back at normal odds');

      // Comeback luck.
      const away4 = resolveSuperSliceLuck({ history: spins(3, NOW - 4 * DAY), totalSpinsUsed: 300, lastSpinDate: isoDay(NOW - 4 * DAY), nowMs: NOW });
      assertEqual(away4.multiplier, 3, '3-6 days away gives x3');
      const away10 = resolveSuperSliceLuck({ history: spins(3, NOW - 10 * DAY), totalSpinsUsed: 300, lastSpinDate: isoDay(NOW - 10 * DAY), nowMs: NOW });
      assertEqual(away10.multiplier, 5, '7+ days away gives x5');
      assert(away10.reasons.includes('comeback'), 'comeback reason is reported for the badge');

      // Bad-luck protection counts only spins since launch, then guarantees.
      const thirty = resolveSuperSliceLuck({ history: spins(30), totalSpinsUsed: 300, lastSpinDate: yesterday, nowMs: NOW });
      assertEqual(thirty.multiplier, 2.1, 'odds creep up after 20 spins without one');
      const due = resolveSuperSliceLuck({ history: spins(44), totalSpinsUsed: 300, lastSpinDate: yesterday, nowMs: NOW });
      assert(due.guaranteed, 'the 45th spin without a Super Slice is guaranteed');
      const preLaunch = spins(50, SUPER_SLICE_LAUNCHED_AT_MS - DAY);
      const veteran = resolveSuperSliceLuck({ history: preLaunch, totalSpinsUsed: 500, lastSpinDate: yesterday, nowMs: SUPER_SLICE_LAUNCHED_AT_MS + DAY });
      assert(!veteran.guaranteed && veteran.multiplier === 1, 'spins before launch never make a Super Slice owed');

      // Combined cap.
      const both = resolveSuperSliceLuck({ history: spins(40, NOW - 9 * DAY), totalSpinsUsed: 300, lastSpinDate: isoDay(NOW - 9 * DAY), nowMs: NOW });
      assertEqual(both.multiplier, 5, 'comeback x5 and bad-luck protection together stay capped at x5');
      const weights = applySuperSliceLuck(SPIN_PRIZES, both);
      const total = weights.reduce((sum, entry) => sum + (entry.wheelWeight ?? 1), 0);
      const odds = (weights.find((entry) => entry.type === 'super')?.wheelWeight ?? 0) / total;
      assert(odds < 0.12, `boosted odds stay below about 1 in 9 (got ${odds.toFixed(3)})`);

      // New-player hook.
      const sixth = resolveSuperSliceLuck({ history: spins(6), totalSpinsUsed: 6, lastSpinDate: yesterday, nowMs: NOW });
      assert(sixth.guaranteed && sixth.reasons.includes('new_player'), 'a new player gets it by their 7th spin');
      const third = resolveSuperSliceLuck({ history: spins(3), totalSpinsUsed: 3, lastSpinDate: yesterday, nowMs: NOW });
      assert(!third.guaranteed, 'not guaranteed earlier than the 7th spin');

      // History rows from the database or demo storage both work.
      const rows = normalizeSuperSliceHistory([{ prize_type: 'super', spun_at: new Date(NOW).toISOString() }, { prizeType: 'dice', spunAt: new Date(NOW).toISOString() }, { nonsense: true }]);
      assertEqual(rows.length, 2, 'snake_case and camelCase rows normalise; junk is dropped');
    },
  },
  {
    name: 'Super Slice is a rare glowing wheel slice that pays one high-value jackpot',
    run: () => {
      const superPrizes = SPIN_PRIZES.filter((entry) => entry.type === 'super');
      assertEqual(superPrizes.length, 1, 'the wheel has exactly one Super Slice');
      const totalWeight = SPIN_PRIZES.reduce((sum, entry) => sum + (entry.wheelWeight ?? 1), 0);
      const odds = (superPrizes[0].wheelWeight ?? 0) / totalWeight;
      assert(odds > 0.015 && odds < 0.04, `Super Slice lands roughly once in 25-60 spins (got ${odds.toFixed(3)})`);
      assert(SPIN_PRIZES.some((entry) => entry.type === 'mystery'), 'the Mystery Box slice stays alongside it');

      const first = resolveDailySpinAwards(superPrizes[0], 1, () => 0);
      assertEqual(JSON.stringify(first.map((award) => [award.currency, award.amount])), JSON.stringify([['dice', 550]]), 'lowest roll pays 550 dice');
      const last = resolveDailySpinAwards(superPrizes[0], 1, () => 0.9999);
      assertEqual(JSON.stringify(last.map((award) => [award.currency, award.amount])), JSON.stringify([['dice', 1000]]), 'top roll pays the 1,000 dice jackpot');
      const boosted = resolveDailySpinAwards(superPrizes[0], 3, () => 0);
      assertEqual(boosted[0].amount, 1650, 'reward boosts multiply the jackpot');
      for (const option of DAILY_SPIN_SUPER_SLICE_OPTIONS) {
        const total = option.awards.reduce((sum, award) => sum + (award.currency === 'dice' ? award.amount : 0), 0);
        const money = option.awards.reduce((sum, award) => sum + (award.currency === 'essence' ? award.amount : 0), 0);
        assert(total >= 300 || money >= 400, 'every Super Slice jackpot beats ordinary slices');
      }
    },
  },
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
