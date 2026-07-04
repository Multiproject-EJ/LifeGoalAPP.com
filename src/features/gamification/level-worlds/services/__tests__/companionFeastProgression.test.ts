/**
 * Companion Feast progression tests: level ladder ("first fruit to reach the
 * Cheese Moon clears Level 1"), rewards-bar milestones + view model, per-drop
 * ticket rules, and claimed-milestone normalization.
 */
import {
  applyCompanionFeastMergeToProgress,
  buildCompanionFeastRewardBarViewModel,
  canDropCompanionFeastFruit,
  COMPANION_FEAST_DROP_TICKET_COST,
  COMPANION_FEAST_LEVELS,
  COMPANION_FEAST_MAX_LEVEL_INDEX,
  COMPANION_FEAST_REWARD_BAR_MILESTONES,
  COMPANION_FEAST_REWARD_BAR_TOTAL_POINTS,
  createCompanionFeastProgress,
  getCompanionFeastLevel,
  getCompanionFeastMilestone,
  getNextCompanionFeastMilestone,
  isCompanionFeastCampaignComplete,
  resolveCompanionFeastClaimedMilestoneIds,
} from '../companionFeastProgression';
import { COMPANION_FEAST_MAX_TIER } from '../companionFeastGame';
import { assert, assertEqual, type TestCase } from './testHarness';

export const companionFeastProgressionTests: TestCase[] = [
  {
    name: 'level ladder starts at the Cheese Moon and climbs strictly to the Grand Feast',
    run: () => {
      assertEqual(COMPANION_FEAST_LEVELS[0].goalTier, 5, 'level 1 goal should be the Cheese Moon (tier 5)');
      assertEqual(
        COMPANION_FEAST_LEVELS[COMPANION_FEAST_MAX_LEVEL_INDEX].goalTier,
        COMPANION_FEAST_MAX_TIER,
        'final level should chase the Grand Feast (max tier)',
      );
      for (let i = 1; i < COMPANION_FEAST_LEVELS.length; i += 1) {
        assert(
          COMPANION_FEAST_LEVELS[i].goalTier > COMPANION_FEAST_LEVELS[i - 1].goalTier,
          `level ${i + 1} goal tier should exceed level ${i}`,
        );
        assertEqual(COMPANION_FEAST_LEVELS[i].levelIndex, i, 'level indexes should be sequential');
      }
      assertEqual(getCompanionFeastLevel(-3).levelNumber, 1, 'level accessor clamps below zero');
      assertEqual(
        getCompanionFeastLevel(99).levelIndex,
        COMPANION_FEAST_MAX_LEVEL_INDEX,
        'level accessor clamps above the ladder (encore feasts)',
      );
    },
  },
  {
    name: 'per-drop ticket rules gate every fruit on one ticket',
    run: () => {
      assertEqual(COMPANION_FEAST_DROP_TICKET_COST, 1, 'each fruit drop should cost one ticket');
      assertEqual(canDropCompanionFeastFruit({ ticketsRemaining: 0 }), false, 'zero tickets should block a drop');
      assertEqual(canDropCompanionFeastFruit({ ticketsRemaining: 1 }), true, 'one ticket should allow a drop');
      assertEqual(canDropCompanionFeastFruit({ ticketsRemaining: Number.NaN }), false, 'invalid ticket counts should block');
    },
  },
  {
    name: 'first Cheese Moon merge clears level 1 and earns one feast point',
    run: () => {
      const fresh = createCompanionFeastProgress(1_000);
      const below = applyCompanionFeastMergeToProgress({ progress: fresh, mergedToTier: 4, nowMs: 1_001 });
      assertEqual(below.clearedLevels.length, 0, 'merges below the goal should not clear the level');
      assertEqual(below.progress.feastPoints, 0, 'no feast point before the goal dish');

      const cheese = applyCompanionFeastMergeToProgress({ progress: below.progress, mergedToTier: 5, nowMs: 1_002 });
      assertEqual(cheese.clearedLevels.length, 1, 'the first Cheese Moon should clear level 1');
      assertEqual(cheese.clearedLevels[0].id, 'first_cheese', 'level 1 is First Cheese');
      assertEqual(cheese.progress.levelIndex, 1, 'campaign should advance to level 2');
      assertEqual(cheese.progress.feastPoints, 1, 'clearing a level earns one feast point');
      assertEqual(cheese.progress.highestTierReached, 5, 'highest tier should track the Cheese Moon');

      const repeat = applyCompanionFeastMergeToProgress({ progress: cheese.progress, mergedToTier: 5, nowMs: 1_003 });
      assertEqual(repeat.clearedLevels.length, 0, 'another Cheese Moon should not clear level 2');
      assertEqual(repeat.progress, cheese.progress, 'no-op merges should return the same progress object');
    },
  },
  {
    name: 'a towering merge can clear multiple levels at once and max-tier merges count as max tier',
    run: () => {
      const fresh = createCompanionFeastProgress(2_000);
      const jump = applyCompanionFeastMergeToProgress({ progress: fresh, mergedToTier: 7, nowMs: 2_001 });
      assertEqual(jump.clearedLevels.length, 3, 'a tier-7 dish should clear levels 1-3');
      assertEqual(jump.progress.levelIndex, 3, 'campaign should sit at level 4');
      assertEqual(jump.progress.feastPoints, 3, 'one feast point per level cleared');

      const celebration = applyCompanionFeastMergeToProgress({ progress: jump.progress, mergedToTier: null, nowMs: 2_002 });
      assertEqual(
        celebration.progress.levelIndex,
        COMPANION_FEAST_MAX_LEVEL_INDEX + 1,
        'a max-tier celebration merge should finish the campaign',
      );
      assertEqual(celebration.progress.feastPoints, COMPANION_FEAST_LEVELS.length, 'all feast points earned');
      assertEqual(isCompanionFeastCampaignComplete(celebration.progress), true, 'campaign should report complete');
      assertEqual(isCompanionFeastCampaignComplete(jump.progress), false, 'mid-campaign should not report complete');
    },
  },
  {
    name: 'rewards bar milestones align one-per-level with visible upcoming rewards',
    run: () => {
      assertEqual(
        COMPANION_FEAST_REWARD_BAR_MILESTONES.length,
        COMPANION_FEAST_LEVELS.length,
        'one rewards-bar milestone per level',
      );
      for (let i = 0; i < COMPANION_FEAST_REWARD_BAR_MILESTONES.length; i += 1) {
        assertEqual(
          COMPANION_FEAST_REWARD_BAR_MILESTONES[i].pointsRequired,
          i + 1,
          'milestones should unlock at successive feast points',
        );
      }
      assertEqual(
        COMPANION_FEAST_REWARD_BAR_TOTAL_POINTS,
        COMPANION_FEAST_LEVELS.length,
        'bar total should span the whole campaign',
      );
      assertEqual(getCompanionFeastMilestone('feast_1')?.pointsRequired, 1, 'milestone lookup by id');
      assertEqual(getCompanionFeastMilestone('nope'), null, 'unknown milestone ids resolve to null');
      assertEqual(getNextCompanionFeastMilestone({ feastPoints: 0 })?.id, 'feast_1', 'next milestone from zero points');
      assertEqual(getNextCompanionFeastMilestone({ feastPoints: 99 }), null, 'no next milestone once the bar is full');
    },
  },
  {
    name: 'reward bar view model tracks fill, claimable and upcoming states',
    run: () => {
      const empty = buildCompanionFeastRewardBarViewModel(null);
      assertEqual(empty.feastPoints, 0, 'null progress should read as zero points');
      assertEqual(empty.fillRatio, 0, 'empty bar has no fill');
      assertEqual(empty.claimableCount, 0, 'nothing claimable at zero points');
      assert(empty.nodes.every((node) => node.state === 'upcoming'), 'all rewards should be upcoming');

      const midway = buildCompanionFeastRewardBarViewModel({
        feastPoints: 2,
        claimedMilestoneIds: ['feast_1'],
      });
      assertEqual(midway.nodes[0].state, 'claimed', 'claimed milestone should render claimed');
      assertEqual(midway.nodes[1].state, 'claimable', 'reached milestone should be claimable');
      assertEqual(midway.nodes[2].state, 'upcoming', 'future milestone should stay upcoming');
      assertEqual(midway.claimableCount, 1, 'exactly one claimable milestone');
      assertEqual(midway.nextMilestone?.id, 'feast_3', 'next milestone should look ahead');
      assert(midway.fillRatio > 0 && midway.fillRatio < 1, 'partial progress should partially fill the bar');
      assertEqual(midway.nodes[0].goalEmoji, '🧀', 'first node should surface the Cheese Moon goal');
    },
  },
  {
    name: 'claimed milestone ids drop unknown entries and stay in milestone order',
    run: () => {
      assertEqual(
        resolveCompanionFeastClaimedMilestoneIds({
          claimedMilestoneIds: ['feast_3', 'bogus', 'feast_1', 'feast_1'],
        }).join(','),
        'feast_1,feast_3',
        'ids should be deduped, filtered, and ordered by milestone position',
      );
      assertEqual(resolveCompanionFeastClaimedMilestoneIds({}).length, 0, 'missing input resolves to empty');
    },
  },
];
