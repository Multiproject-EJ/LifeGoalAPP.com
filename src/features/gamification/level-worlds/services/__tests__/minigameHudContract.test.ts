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
  resolveMinigameRewardIcon,
} from '../minigameHudContract';
import { assert, assertEqual, type TestCase } from './testHarness';

const LADDER = [
  { pointsRequired: 5, rewardLabel: '+35 Dice', claimed: false },
  { pointsRequired: 15, rewardLabel: '+40 Dice', claimed: false },
  { pointsRequired: 25, rewardLabel: '+50 Dice', claimed: false },
];

export const minigameHudContractTests: TestCase[] = [
  {
    name: 'reward nodes carry position, glyph and state for the single-row track',
    run: () => {
      const reward = buildMinigameHudReward({
        points: 5,
        milestones: [
          { pointsRequired: 2, rewardLabel: '+3 Dice', claimed: true },
          { pointsRequired: 4, rewardLabel: '+40 Essence', claimed: false },
          { pointsRequired: 8, rewardLabel: '+1 Shard', claimed: false },
          { pointsRequired: 10, rewardLabel: '+20 Dice', claimed: false },
        ],
      });
      assertEqual(reward.nodes.length, 4, 'every milestone becomes a node');
      assertEqual(reward.nodes[0].state, 'claimed', 'already-opened milestones read as claimed');
      assertEqual(reward.nodes[1].state, 'openable', 'a passed unclaimed milestone is openable');
      assertEqual(reward.nodes[2].state, 'next', 'the first unreached milestone is the next one');
      assertEqual(reward.nodes[3].state, 'upcoming', 'later milestones stay upcoming');

      // Nodes are evenly spaced so uneven ladders stay legible on a phone.
      assertEqual(reward.nodes[0].positionPercent, 25, 'nodes are spaced evenly, not by threshold');
      assertEqual(reward.nodes[3].positionPercent, 100, 'the final milestone sits at the end of the track');
      for (let i = 1; i < reward.nodes.length; i += 1) {
        assert(
          reward.nodes[i].positionPercent > reward.nodes[i - 1].positionPercent,
          'node positions increase monotonically',
        );
      }
      assertEqual(reward.pointsLabel, '5', 'current score is exposed for the head of the row');
    },
  },
  {
    name: 'a cheap-to-expensive ladder does not bunch its early nodes together',
    run: () => {
      // The Fortune Engine shape: opens at 50, ends at 2000. Proportional
      // spacing would crush the first four nodes into the leftmost 10%.
      const reward = buildMinigameHudReward({
        points: 0,
        milestones: [50, 120, 260, 500, 2000].map((p) => ({
          pointsRequired: p, rewardLabel: `${p} Dice`, claimed: false,
        })),
      });
      const gaps = reward.nodes.slice(1).map((n, i) => n.positionPercent - reward.nodes[i].positionPercent);
      for (const gap of gaps) {
        assert(gap > 15, `every node keeps a legible gap (got ${gap})`);
      }
    },
  },
  {
    name: 'fill interpolates within the current segment, matching the node spacing',
    run: () => {
      const ladder = [
        { pointsRequired: 10, rewardLabel: '+3 Dice', claimed: false },
        { pointsRequired: 20, rewardLabel: '+5 Dice', claimed: false },
        { pointsRequired: 30, rewardLabel: '+9 Dice', claimed: false },
        { pointsRequired: 40, rewardLabel: '+20 Dice', claimed: false },
      ];
      assertEqual(buildMinigameHudReward({ points: 0, milestones: ladder }).fillRatio, 0, 'no points means empty');
      // Halfway to the first node = half of the first quarter-segment.
      assertEqual(buildMinigameHudReward({ points: 5, milestones: ladder }).fillRatio, 0.125, 'fill interpolates inside a segment');
      assertEqual(buildMinigameHudReward({ points: 10, milestones: ladder }).fillRatio, 0.25, 'reaching a node fills exactly to it');
      assertEqual(buildMinigameHudReward({ points: 40, milestones: ladder }).fillRatio, 1, 'the last node fills the track');
      assertEqual(buildMinigameHudReward({ points: 999, milestones: ladder }).fillRatio, 1, 'overshooting clamps to full');
    },
  },
  {
    name: 'node glyphs are derived from the reward currency but can be overridden',
    run: () => {
      assertEqual(resolveMinigameRewardIcon('+20 Dice'), '🎲', 'dice rewards get the dice glyph');
      assertEqual(resolveMinigameRewardIcon('+40 Essence'), '🟣', 'essence rewards get the essence glyph');
      assertEqual(resolveMinigameRewardIcon('+2 Shards'), '💎', 'shard rewards get the shard glyph');
      assertEqual(resolveMinigameRewardIcon('a mystery box'), '🎁', 'unknown rewards fall back to a prize glyph');
      // Mixed labels resolve to the rarest currency named, so the glyph shows
      // the headline prize: shards beat dice, dice beat essence.
      assertEqual(resolveMinigameRewardIcon('+8 Dice +60 Essence'), '🎲', 'dice outrank essence in mixed labels');
      assertEqual(resolveMinigameRewardIcon('+20 Dice +4 Shards +200 Essence'), '💎', 'shards outrank everything');

      const reward = buildMinigameHudReward({
        points: 0,
        milestones: [{ pointsRequired: 1, rewardLabel: '+3 Dice', claimed: false, icon: '🗼' }],
      });
      assertEqual(reward.nodes[0].icon, '🗼', 'an explicit game-supplied glyph wins');
    },
  },
  {
    name: 'an empty ladder produces no nodes and a zero score label',
    run: () => {
      const reward = buildMinigameHudReward({ points: 0, milestones: [] });
      assertEqual(reward.nodes.length, 0, 'no milestones means no nodes');
      assertEqual(reward.pointsLabel, '0', 'score label still renders');
      assertEqual(reward.fillRatio, 0, 'fill stays empty');
    },
  },
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
      // Fill is segment-based (see the even-spacing rationale in the contract),
      // so 8 points sits partway through the segment after the passed node.
      assert(
        reward.fillRatio > 0 && reward.fillRatio < 1,
        `fill sits inside the track while a milestone remains (got ${reward.fillRatio})`,
      );
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
