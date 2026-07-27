/**
 * Shared mini-game HUD contract tests.
 * Covers: ticket view-model clamping + low threshold, reward summary
 * (fill/next-prize/remaining/openable) across claimed and unclaimed
 * milestones, and the canonical "Open reward" label.
 */
import {
  buildMinigameHudReward,
  buildMinigameHudTickets,
  MINIGAME_HUD_LOW_TICKETS,
  MINIGAME_OPEN_REWARD_LABEL,
} from '../minigameHudContract';
import { assert, assertEqual, type TestCase } from './testHarness';

const LADDER = [
  { pointsRequired: 5, rewardLabel: '+35 Dice', claimed: false },
  { pointsRequired: 15, rewardLabel: '+40 Dice', claimed: false },
  { pointsRequired: 25, rewardLabel: '+50 Dice', claimed: false },
];

export const minigameHudContractTests: TestCase[] = [
  {
    name: 'claim surfaces share the canonical Open reward label',
    run: () => {
      // The doc asks for "Open reward", not "Claim"/"Collect". Pinning the
      // constant keeps every game's button on the same vocabulary.
      assertEqual(MINIGAME_OPEN_REWARD_LABEL, 'Open reward', 'label matches the observation doc');
    },
  },
  {
    name: 'ticket view model clamps, floors, and flags the low state',
    run: () => {
      assertEqual(buildMinigameHudTickets({ count: 7.9 }).count, 7, 'counts floor to integers');
      assertEqual(buildMinigameHudTickets({ count: -4 }).count, 0, 'counts clamp at zero');
      assertEqual(buildMinigameHudTickets({ count: Number.NaN }).count, 0, 'invalid counts read as zero');
      assertEqual(
        buildMinigameHudTickets({ count: MINIGAME_HUD_LOW_TICKETS }).low,
        true,
        'the threshold itself is low',
      );
      assertEqual(
        buildMinigameHudTickets({ count: MINIGAME_HUD_LOW_TICKETS + 1 }).low,
        false,
        'above the threshold is not low',
      );
      const blocks = buildMinigameHudTickets({ count: 9, icon: '🧱', noun: 'blocks' });
      assertEqual(blocks.icon, '🧱', 'games can rebrand the currency icon');
      assertEqual(blocks.noun, 'blocks', 'games can rebrand the currency noun');
      assertEqual(buildMinigameHudTickets({ count: 2 }).icon, '🎟️', 'tickets are the default icon');
    },
  },
  {
    name: 'reward summary reports the next exact prize and points to go',
    run: () => {
      const reward = buildMinigameHudReward({ points: 8, milestones: LADDER });
      assertEqual(reward.nextRewardLabel, '+40 Dice', 'the next unclaimed milestone is the one shown');
      assertEqual(reward.remainingLabel, '7 pts to go', 'remaining counts toward that milestone');
      assertEqual(reward.openableCount, 1, 'the passed milestone is openable');
      assert(reward.fillRatio > 0.31 && reward.fillRatio < 0.33, 'fill is points over the ladder total');
    },
  },
  {
    name: 'claimed milestones are skipped for both next-prize and openable count',
    run: () => {
      const reward = buildMinigameHudReward({
        points: 20,
        milestones: [
          { ...LADDER[0], claimed: true },
          { ...LADDER[1], claimed: true },
          LADDER[2],
        ],
      });
      assertEqual(reward.openableCount, 0, 'already-claimed milestones are not re-openable');
      assertEqual(reward.nextRewardLabel, '+50 Dice', 'the next prize looks past claimed ones');
      assertEqual(reward.remainingLabel, '5 pts to go', 'remaining measures the unclaimed target');
    },
  },
  {
    name: 'a finished ladder reports full fill and no next prize',
    run: () => {
      const reward = buildMinigameHudReward({
        points: 99,
        milestones: LADDER.map((m) => ({ ...m, claimed: true })),
      });
      assertEqual(reward.nextRewardLabel, null, 'nothing is next once everything is claimed');
      assertEqual(reward.remainingLabel, null, 'no remaining line without a next milestone');
      assertEqual(reward.openableCount, 0, 'nothing left to open');
      assertEqual(reward.fillRatio, 1, 'fill caps at 1');
    },
  },
  {
    name: 'milestone order in the input does not matter',
    run: () => {
      const shuffled = buildMinigameHudReward({
        points: 8,
        milestones: [LADDER[2], LADDER[0], LADDER[1]],
      });
      assertEqual(shuffled.nextRewardLabel, '+40 Dice', 'milestones are sorted before summarising');
      assertEqual(shuffled.openableCount, 1, 'openable count is order-independent');
    },
  },
  {
    name: 'empty ladders and disabled units degrade safely',
    run: () => {
      const empty = buildMinigameHudReward({ points: 5, milestones: [] });
      assertEqual(empty.fillRatio, 0, 'no ladder means no fill');
      assertEqual(empty.nextRewardLabel, null, 'no ladder means no next prize');
      assertEqual(empty.openableCount, 0, 'no ladder means nothing openable');

      const unitless = buildMinigameHudReward({ points: 2, milestones: LADDER, remainingUnit: null });
      assertEqual(unitless.remainingLabel, null, 'a null unit hides the remaining line');
      assertEqual(unitless.nextRewardLabel, '+35 Dice', 'the next prize still shows without a unit');
    },
  },
];
