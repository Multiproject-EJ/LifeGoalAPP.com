import {
  FORTUNE_ENGINE_PRIZE_LADDER,
  FORTUNE_ENGINE_REFERENCE_PROJECTION,
  FORTUNE_ENGINE_TOTAL_TRACK_DICE,
  projectFortuneEngineEconomy,
  projectRewardBarClaimsFromProgress,
  resolveRewardBarTicketPayoutForTier,
} from '../fortuneEngineEconomyModel';
import { assert, assertEqual, type TestCase } from './testHarness';

export const fortuneEngineEconomyModelTests: TestCase[] = [
  {
    name: 'Fortune Engine dice ladder starts at 50, reaches 2000, and totals 5800 dice',
    run: () => {
      assertEqual(FORTUNE_ENGINE_PRIZE_LADDER[0]?.reward.dicePool, 50, 'Expected useful first dice prize');
      assertEqual(
        FORTUNE_ENGINE_PRIZE_LADDER[FORTUNE_ENGINE_PRIZE_LADDER.length - 1]?.reward.dicePool,
        2_000,
        'Expected aspirational final dice prize',
      );
      assertEqual(FORTUNE_ENGINE_TOTAL_TRACK_DICE, 5_800, 'Expected complete event dice headline');
      for (let index = 1; index < FORTUNE_ENGINE_PRIZE_LADDER.length; index += 1) {
        assert(
          FORTUNE_ENGINE_PRIZE_LADDER[index]!.pointsRequired > FORTUNE_ENGINE_PRIZE_LADDER[index - 1]!.pointsRequired,
          'Milestone points must rise strictly',
        );
      }
    },
  },
  {
    name: 'reward-bar ticket projection follows the canonical four-claim rotation',
    run: () => {
      assertEqual(resolveRewardBarTicketPayoutForTier(0), 0, 'Tier 0 is dice');
      assertEqual(resolveRewardBarTicketPayoutForTier(2), 8, 'Tier 2 returns 8 event tickets');
      assertEqual(resolveRewardBarTicketPayoutForTier(6), 12, 'Tier 6 returns 12 event tickets');
      const projected = projectRewardBarClaimsFromProgress(198);
      assertEqual(projected.claims, 7, '198 progress clears the first seven curated targets');
      assertEqual(projected.tickets, 20, 'First seven claims include 8 + 12 event tickets');
    },
  },
  {
    name: 'reference level-1 two-day projection makes progress without casually reaching 2000-dice prize',
    run: () => {
      const projection = FORTUNE_ENGINE_REFERENCE_PROJECTION;
      assertEqual(projection.passiveRegenDice, 120, 'Two refills per day for two days at the level-1 30-dice floor');
      assertEqual(projection.dailyTreatDice, 60, 'First two Daily Treat dice rewards are included');
      assertEqual(projection.rewardBarTickets, 20, 'Board opportunity produces two ticket-bearing reward claims');
      assertEqual(projection.projectedLaunches, 33, 'Projection includes base tickets, Golden plays and milestone returns');
      assert(projection.finalMilestoneReachRatio > 0.7, 'Average play should visibly approach the aspirational prize');
      assert(projection.finalMilestoneReachRatio < 1, 'Average play must not automatically reach the 2,000-dice prize');
    },
  },
  {
    name: 'extra bounded app dice increase tickets and make the aspirational prize reachable',
    run: () => {
      const projection = projectFortuneEngineEconomy({
        playerLevel: 1,
        eventDurationDays: 2,
        regenRefillsPerDay: 2,
        dailyTreatDice: [25, 35],
        otherAppDice: 500,
        expectedBoardProgressPerDie: 1.1,
        expectedEventPointsPerRun: 125,
        startingEventTickets: 3,
        goldenLaunchesPerDay: 1,
        milestoneTicketReturns: 8,
      });
      assert(projection.rewardBarTickets > FORTUNE_ENGINE_REFERENCE_PROJECTION.rewardBarTickets, 'Extra app dice should create more ticket opportunity');
      assert(projection.finalMilestoneReachRatio >= 1, 'High engagement and strong play should make the final prize achievable');
    },
  },
];
