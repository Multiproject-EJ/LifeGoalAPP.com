import { REWARD_BAR_CURATED_TARGET_SEQUENCE } from './islandRunContractV2RewardBar';
import { resolveDiceRegenConfig } from './islandRunDiceRegeneration';

/**
 * Fortune Engine economy planner.
 *
 * This is deliberately separate from persistence and React. It answers the
 * balancing question "how many launches can a player plausibly earn?" from
 * bounded, observable inputs: passive regeneration, Daily Treat dice, other
 * app dice, reward-bar ticket payouts and the daily free launch.
 */

export interface FortuneEnginePrizeLadderEntry {
  id: string;
  pointsRequired: number;
  rewardLabel: string;
  reward: {
    dicePool?: number;
    essence?: number;
    shards?: number;
    eventTickets?: number;
    coreFragments?: number;
  };
}

/**
 * The visible event ladder starts with a useful 50-dice win and culminates in
 * a deliberately aspirational 2,000-dice prize. Total dice across the full
 * ladder is 5,800: similar in shape to a large Monopoly GO event, while the
 * 4,500-point ceiling keeps the final prize outside ordinary casual play.
 */
export const FORTUNE_ENGINE_PRIZE_LADDER: readonly FortuneEnginePrizeLadderEntry[] = Object.freeze([
  {
    id: 'fortune_1',
    pointsRequired: 60,
    rewardLabel: '50 Dice',
    reward: { dicePool: 50 },
  },
  {
    id: 'fortune_2',
    pointsRequired: 180,
    rewardLabel: '100 Dice + Core piece',
    reward: { dicePool: 100, coreFragments: 1 },
  },
  {
    id: 'fortune_3',
    pointsRequired: 360,
    rewardLabel: '200 Dice + 3 Event Tickets',
    reward: { dicePool: 200, eventTickets: 3 },
  },
  {
    id: 'fortune_4',
    pointsRequired: 700,
    rewardLabel: '350 Dice + Core piece',
    reward: { dicePool: 350, essence: 120, coreFragments: 1 },
  },
  {
    id: 'fortune_5',
    pointsRequired: 1_200,
    rewardLabel: '600 Dice + 5 Event Tickets',
    reward: { dicePool: 600, eventTickets: 5, coreFragments: 1 },
  },
  {
    id: 'fortune_6',
    pointsRequired: 2_000,
    rewardLabel: '1,000 Dice',
    reward: { dicePool: 1_000, essence: 250, shards: 2 },
  },
  {
    id: 'fortune_7',
    pointsRequired: 3_000,
    rewardLabel: '1,500 Dice + Core piece',
    reward: { dicePool: 1_500, coreFragments: 1, shards: 4 },
  },
  {
    id: 'fortune_8',
    pointsRequired: 4_500,
    rewardLabel: '2,000 Dice + 2 Core pieces',
    reward: { dicePool: 2_000, coreFragments: 2, essence: 500, shards: 6 },
  },
]);

export const FORTUNE_ENGINE_TOTAL_TRACK_DICE = FORTUNE_ENGINE_PRIZE_LADDER.reduce(
  (total, milestone) => total + Math.max(0, Math.floor(milestone.reward.dicePool ?? 0)),
  0,
);

export interface FortuneEngineEconomyProjectionInput {
  playerLevel: number;
  eventDurationDays: number;
  /** Number of complete passive-refill opportunities the player actually uses per day. */
  regenRefillsPerDay: number;
  /** Daily Treat dice expected to be opened during this event, one amount per day. */
  dailyTreatDice: readonly number[];
  /** Bounded dice from other app sources available during the same event. */
  otherAppDice?: number;
  startingEventTickets?: number;
  goldenLaunchesPerDay?: number;
  /** Expected reward-bar progress earned per die spent on the board. */
  expectedBoardProgressPerDie?: number;
  /** Expected Fortune Engine event points from one completed run. */
  expectedEventPointsPerRun?: number;
  /** Tickets returned by reachable Fortune Engine milestones. */
  milestoneTicketReturns?: number;
}

export interface FortuneEngineEconomyProjection {
  passiveRegenDice: number;
  dailyTreatDice: number;
  otherAppDice: number;
  boardDiceOpportunity: number;
  expectedRewardBarProgress: number;
  rewardBarClaims: number;
  rewardBarTickets: number;
  freeGoldenLaunches: number;
  initialLaunches: number;
  projectedLaunches: number;
  expectedEventPoints: number;
  finalMilestonePoints: number;
  finalMilestoneReachRatio: number;
}

function safeWhole(value: number, fallback = 0): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

/**
 * Event-ticket payouts occur on reward-bar claim indexes 2, 6, 10, 14...
 * (the third claim in each four-reward rotation). The payout is 6 + tier.
 */
export function resolveRewardBarTicketPayoutForTier(tier: number): number {
  const safeTier = safeWhole(tier);
  return safeTier % 4 === 2 ? 6 + safeTier : 0;
}

export function projectRewardBarClaimsFromProgress(progress: number): {
  claims: number;
  tickets: number;
  progressSpent: number;
} {
  const available = Math.max(0, Number.isFinite(progress) ? progress : 0);
  let progressSpent = 0;
  let claims = 0;
  let tickets = 0;

  for (let tier = 0; tier < REWARD_BAR_CURATED_TARGET_SEQUENCE.length; tier += 1) {
    const threshold = REWARD_BAR_CURATED_TARGET_SEQUENCE[tier] ?? 0;
    if (progressSpent + threshold > available) break;
    progressSpent += threshold;
    claims += 1;
    tickets += resolveRewardBarTicketPayoutForTier(tier);
  }

  return { claims, tickets, progressSpent };
}

export function projectFortuneEngineEconomy(
  input: FortuneEngineEconomyProjectionInput,
): FortuneEngineEconomyProjection {
  const level = Math.max(1, safeWhole(input.playerLevel, 1));
  const durationDays = Math.max(1, safeWhole(input.eventDurationDays, 1));
  const refillsPerDay = safeWhole(input.regenRefillsPerDay);
  const regenConfig = resolveDiceRegenConfig(level);
  const passiveRegenDice = regenConfig.maxDice * refillsPerDay * durationDays;
  const dailyTreatDice = input.dailyTreatDice
    .slice(0, durationDays)
    .reduce((total, amount) => total + safeWhole(amount), 0);
  const otherAppDice = safeWhole(input.otherAppDice ?? 0);
  const boardDiceOpportunity = passiveRegenDice + dailyTreatDice + otherAppDice;
  const progressPerDie = Number.isFinite(input.expectedBoardProgressPerDie)
    ? Math.max(0, input.expectedBoardProgressPerDie ?? 0)
    : 1.1;
  const expectedRewardBarProgress = Math.floor(boardDiceOpportunity * progressPerDie);
  const rewardBar = projectRewardBarClaimsFromProgress(expectedRewardBarProgress);
  const freeGoldenLaunches = durationDays * safeWhole(input.goldenLaunchesPerDay ?? 1);
  const initialLaunches = safeWhole(input.startingEventTickets ?? 3)
    + rewardBar.tickets
    + freeGoldenLaunches;
  const projectedLaunches = initialLaunches + safeWhole(input.milestoneTicketReturns ?? 8);
  const expectedPointsPerRun = Number.isFinite(input.expectedEventPointsPerRun)
    ? Math.max(0, input.expectedEventPointsPerRun ?? 0)
    : 110;
  const expectedEventPoints = Math.floor(projectedLaunches * expectedPointsPerRun);
  const finalMilestonePoints = FORTUNE_ENGINE_PRIZE_LADDER[
    FORTUNE_ENGINE_PRIZE_LADDER.length - 1
  ]?.pointsRequired ?? 0;

  return {
    passiveRegenDice,
    dailyTreatDice,
    otherAppDice,
    boardDiceOpportunity,
    expectedRewardBarProgress,
    rewardBarClaims: rewardBar.claims,
    rewardBarTickets: rewardBar.tickets,
    freeGoldenLaunches,
    initialLaunches,
    projectedLaunches,
    expectedEventPoints,
    finalMilestonePoints,
    finalMilestoneReachRatio: finalMilestonePoints > 0
      ? expectedEventPoints / finalMilestonePoints
      : 0,
  };
}

/**
 * Reference calibration used by tests and balancing notes:
 * level 1, a two-day event, two practical refill sessions per day, and the
 * first two Daily Treat dice rewards. It intentionally falls short of the
 * 2,000-dice prize at average skill.
 */
export const FORTUNE_ENGINE_REFERENCE_PROJECTION = projectFortuneEngineEconomy({
  playerLevel: 1,
  eventDurationDays: 2,
  regenRefillsPerDay: 2,
  dailyTreatDice: [25, 35],
  expectedBoardProgressPerDie: 1.1,
  expectedEventPointsPerRun: 110,
  startingEventTickets: 3,
  goldenLaunchesPerDay: 1,
  milestoneTicketReturns: 8,
});
