import { canClaimIslandRunContractV2RewardBar } from '../islandRunContractV2RewardBar';
import {
  resolveLuckyRollProductionBoardMaxDice,
  resolveSpaceExcavatorCampaignMilestoneDiceTotal,
  simulateIslandRunIntegratedEconomySafety,
  type IslandRunIntegratedEconomySafetyResult,
} from '../islandRunIntegratedEconomySafetyModel';
import { assert, assertEqual, type TestCase } from './testHarness';

const STARTING_DICE = 2_500;
const LONG_HORIZONS = [500, 1_000, 2_000] as const;

function assertIntegratedEconomySafetyResult(
  result: IslandRunIntegratedEconomySafetyResult,
  label: string,
): void {
  assertEqual(result.startingDice, STARTING_DICE, `${label}: expected canonical high-dice starting pool`);
  assert(result.rollsTaken > 0, `${label}: expected at least one roll/action to execute`);
  assert(result.totalRewardBarClaims > 0, `${label}: expected reward-bar baseline to be exercised`);
  assert(result.rewardBarDiceAwarded > 0, `${label}: expected reward-bar dice inflow to be included`);
  assert(result.externalDiceAwarded > 0, `${label}: expected external dice inflow to be included`);
  assert(result.stickerCompletionBonusDiceAwarded > 0, `${label}: expected sticker-completion reward-bar dice to be included`);
  assert(result.diceAwarded < result.diceSpent, `${label}: dice awarded (${result.diceAwarded}) must stay below spent (${result.diceSpent})`);
  assert(result.dicePool <= STARTING_DICE, `${label}: final dice (${result.dicePool}) must not exceed starting dice`);
  assert(result.rollsTaken < result.rollAttempts, `${label}: dice scarcity should stop before the full horizon`);
  assert(result.maxRewardBarClaimsFromSingleBatch <= 10, `${label}: reward-bar chain must stay inside resolver cap`);
  assert(!canClaimIslandRunContractV2RewardBar(result.rewardBarState), `${label}: reward-bar drain should not leave claimable overflow`);
}

export const islandRunIntegratedEconomySafetyTests: TestCase[] = [
  {
    name: 'integrated economy model includes bounded Lucky Roll and Space Excavator dice sources',
    run: () => {
      assertEqual(resolveLuckyRollProductionBoardMaxDice({ islandNumber: 1, cycleIndex: 0 }), 16, 'Lucky Roll max unique dice should match the production board');
      assertEqual(resolveSpaceExcavatorCampaignMilestoneDiceTotal(), 145, 'Space Excavator campaign dice should match dice-bearing milestone rewards');
    },
  },
  ...LONG_HORIZONS.map((rollAttempts): TestCase => ({
    name: `integrated economy safety: ${rollAttempts} attempts with reward bar, Lucky Roll, Space Excavator, and one passive regen refill are not dice-positive`,
    run: () => {
      const result = simulateIslandRunIntegratedEconomySafety({
        startingDice: STARTING_DICE,
        rollAttempts,
        playerLevel: 125,
        islandNumber: 1,
        cycleIndex: 0,
        includeLuckyRollProductionBoard: true,
        includeSpaceExcavatorCampaignMilestones: true,
        includeSinglePassiveRegenRefill: true,
      });

      assertIntegratedEconomySafetyResult(result, `${rollAttempts}-attempt integrated economy model`);
      assertEqual(result.rollAttempts, rollAttempts, 'Expected the requested long-horizon attempt count to be preserved');
      assertEqual(result.externalDiceAwarded, 361, 'Expected modeled external stack: 16 Lucky Roll + 145 Space Excavator + 200 passive regen');
      assertEqual(result.passiveRegenRefillsApplied, 1, 'Expected exactly one bounded passive regen catch-up in the model');
      assertEqual(result.dicePool, 0, 'Expected the integrated stack to exhaust rather than sustain itself');
    },
  })),
  {
    name: 'integrated economy model excludes one-time and time-gated grants from repeatable loop income',
    run: () => {
      const result = simulateIslandRunIntegratedEconomySafety({
        startingDice: STARTING_DICE,
        rollAttempts: 500,
        includeLuckyRollProductionBoard: true,
        includeSpaceExcavatorCampaignMilestones: true,
        includeSinglePassiveRegenRefill: true,
      });
      const modeledKinds = new Set(result.sourceLedger.map((entry) => entry.kind));

      assert(!modeledKinds.has('daily_treats' as never), 'Daily Treats must not be modeled as repeatable per-roll loop income');
      assert(!modeledKinds.has('welcome_pack' as never), 'Welcome/tutorial grants must not be modeled as repeatable loop income');
      assert(!modeledKinds.has('admin_dev_grant' as never), 'Admin/dev grants must not be modeled as repeatable loop income');
    },
  },
];
