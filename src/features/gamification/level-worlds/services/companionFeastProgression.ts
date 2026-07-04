/**
 * companionFeastProgression.ts — pure levels + rewards-bar progression rules
 * for the Companion Feast fruit-drop mini-game.
 *
 * Design (ticket-per-drop economy, mirroring Space Excavator's per-action
 * ticket system):
 * - Every fruit dropped into the bowl spends 1 event ticket ("each drop is a
 *   ticket"). Tickets are earned on the island loop and spent through the
 *   canonical `applyCompanionFeastDrop` action.
 * - Levels: each level asks the player to forge a goal dish for the first
 *   time. Level 1 clears the moment the first fruit merges into the Cheese
 *   Moon 🧀; later levels chase grander dishes up the ladder.
 * - Every level cleared earns 1 "feast point" that travels along the rewards
 *   bar. Milestone rewards on the bar are visible ahead of time and become
 *   claimable once the bar reaches them (claims flow through the canonical
 *   `claimCompanionFeastMilestoneReward` action).
 *
 * Everything here is deterministic and side-effect free so the rules can be
 * exercised by the Island Run service test suite.
 */
import type { CompanionFeastProgressEntry } from './islandRunGameStateStore';
import { COMPANION_FEAST_FOOD_TIERS, getCompanionFeastFoodTier } from './companionFeastGame';

// ---------------------------------------------------------------------------
// Ticket-per-drop economy (Space Excavator-style per-action spend)
// ---------------------------------------------------------------------------

/** Every fruit dropped into the bowl costs this many event tickets. */
export const COMPANION_FEAST_DROP_TICKET_COST = 1;

/** Whether the player can afford to drop one more fruit. */
export function canDropCompanionFeastFruit(options: { ticketsRemaining: number }): boolean {
  const tickets = Number.isFinite(options.ticketsRemaining)
    ? Math.floor(options.ticketsRemaining)
    : 0;
  return tickets >= COMPANION_FEAST_DROP_TICKET_COST;
}

// ---------------------------------------------------------------------------
// Level ladder — each level forges a grander goal dish
// ---------------------------------------------------------------------------

export interface CompanionFeastLevel {
  /** 0-based level index (level 1 is index 0). */
  levelIndex: number;
  /** Player-facing level number. */
  levelNumber: number;
  id: string;
  name: string;
  /** Food-ladder tier that must be created (merged into) to clear the level. */
  goalTier: number;
  /** Short flavor line shown on the level card. */
  flavor: string;
}

/**
 * Level ladder. Level 1 clears when the first fruit merges into the Cheese
 * Moon (tier 5); each later level chases the next dish on the ladder until
 * the Grand Feast crowns the campaign.
 */
export const COMPANION_FEAST_LEVELS: readonly CompanionFeastLevel[] = Object.freeze([
  { levelIndex: 0, levelNumber: 1, id: 'first_cheese', name: 'First Cheese', goalTier: 5, flavor: 'Merge fruit until the first Cheese Moon 🧀 rises over the bowl.' },
  { levelIndex: 1, levelNumber: 2, id: 'tide_pie_trial', name: 'Tide Pie Trial', goalTier: 6, flavor: 'Stack the harvest higher — bake a Tide Pie 🥧 from the swells.' },
  { levelIndex: 2, levelNumber: 3, id: 'pumpkin_harvest', name: 'Pumpkin Harvest', goalTier: 7, flavor: 'Grow the feast into a glowing Hearth Pumpkin 🎃.' },
  { levelIndex: 3, levelNumber: 4, id: 'cauldron_keeper', name: 'Cauldron Keeper', goalTier: 8, flavor: 'Simmer everything together into the Stew Cauldron 🍲.' },
  { levelIndex: 4, levelNumber: 5, id: 'royal_baker', name: 'Royal Baker', goalTier: 9, flavor: 'Layer a Royal Cake 🎂 worthy of the island court.' },
  { levelIndex: 5, levelNumber: 6, id: 'grand_feast', name: 'Grand Feast', goalTier: 10, flavor: 'Summon the legendary Grand Feast ✨ and feed every creature.' },
]);

export const COMPANION_FEAST_MAX_LEVEL_INDEX = COMPANION_FEAST_LEVELS.length - 1;

/**
 * Level accessor. Indexes past the last level return the final level so the
 * campaign stays playable (endless Grand Feast encores) without ever reading
 * out of bounds.
 */
export function getCompanionFeastLevel(levelIndex: number): CompanionFeastLevel {
  const clamped = Math.max(0, Math.min(COMPANION_FEAST_MAX_LEVEL_INDEX, Math.floor(levelIndex)));
  return COMPANION_FEAST_LEVELS[clamped];
}

/** True once every level (including the Grand Feast) has been cleared. */
export function isCompanionFeastCampaignComplete(progress: Pick<CompanionFeastProgressEntry, 'levelIndex'> | null | undefined): boolean {
  return Math.floor(progress?.levelIndex ?? 0) > COMPANION_FEAST_MAX_LEVEL_INDEX;
}

/** Fresh progress entry for a newly opened event. */
export function createCompanionFeastProgress(nowMs: number): CompanionFeastProgressEntry {
  return {
    levelIndex: 0,
    feastPoints: 0,
    highestTierReached: 0,
    bestScore: 0,
    cumulativeScore: 0,
    totalFruitDropped: 0,
    claimedMilestoneIds: [],
    updatedAtMs: Math.max(0, Math.floor(nowMs)),
  };
}

export interface CompanionFeastMergeProgressResult {
  progress: CompanionFeastProgressEntry;
  /** Levels cleared by this merge, in order (usually 0 or 1 entries). */
  clearedLevels: CompanionFeastLevel[];
  /** True when this merge raised `highestTierReached`. */
  reachedNewHighestTier: boolean;
}

/**
 * Fold one merge outcome into campaign progress. When the produced tier
 * reaches the active level's goal dish the level clears immediately ("the
 * first fruit to go to a cheese cleared level 1") and one feast point is
 * earned per cleared level. A single towering merge can clear multiple
 * levels when it jumps past several goal tiers.
 *
 * Pure: returns a new entry, never mutates the input.
 */
export function applyCompanionFeastMergeToProgress(options: {
  progress: CompanionFeastProgressEntry;
  /** Tier produced by the merge (null merges at the top of the ladder count as max tier). */
  mergedToTier: number | null;
  /** Optional final run score to bank at run end so partial rounds keep progressing. */
  runScore?: number;
  nowMs: number;
}): CompanionFeastMergeProgressResult {
  const producedTier = options.mergedToTier === null
    ? COMPANION_FEAST_FOOD_TIERS.length - 1
    : Math.max(0, Math.floor(options.mergedToTier));
  const previous = options.progress;
  const clearedLevels: CompanionFeastLevel[] = [];
  let levelIndex = Math.max(0, Math.floor(previous.levelIndex));
  let feastPoints = Math.max(0, Math.floor(previous.feastPoints));
  const runScore = Number.isFinite(options.runScore) ? Math.max(0, Math.floor(options.runScore ?? 0)) : 0;
  const previousCumulativeScore = Math.max(0, Math.floor(previous.cumulativeScore ?? 0));
  const cumulativeScore = previousCumulativeScore + runScore;

  while (levelIndex <= COMPANION_FEAST_MAX_LEVEL_INDEX) {
    const level = COMPANION_FEAST_LEVELS[levelIndex];
    if (producedTier < level.goalTier) break;
    clearedLevels.push(level);
    levelIndex += 1;
    feastPoints += 1;
  }

  const highestTierReached = Math.max(previous.highestTierReached, producedTier);
  const reachedNewHighestTier = highestTierReached > previous.highestTierReached;
  const scoreBankedFeastPoints = Math.min(
    COMPANION_FEAST_REWARD_BAR_TOTAL_POINTS,
    Math.floor(cumulativeScore / COMPANION_FEAST_SCORE_PER_FEAST_POINT),
  );
  feastPoints = Math.max(feastPoints, scoreBankedFeastPoints);
  if (clearedLevels.length === 0 && !reachedNewHighestTier && cumulativeScore === previousCumulativeScore) {
    return { progress: previous, clearedLevels, reachedNewHighestTier };
  }
  return {
    progress: {
      ...previous,
      levelIndex,
      feastPoints,
      highestTierReached,
      cumulativeScore,
      updatedAtMs: Math.max(0, Math.floor(options.nowMs)),
    },
    clearedLevels,
    reachedNewHighestTier,
  };
}

// ---------------------------------------------------------------------------
// Rewards bar — feast points travel along visible upcoming rewards
// ---------------------------------------------------------------------------

export interface CompanionFeastRewardBarReward {
  essence?: number;
  dicePool?: number;
  shards?: number;
}

export interface CompanionFeastRewardBarMilestone {
  id: string;
  /** Feast points (levels cleared) required to unlock. */
  pointsRequired: number;
  rewardLabel: string;
  reward: CompanionFeastRewardBarReward;
}

/**
 * Rewards bar milestones. One feast point per level cleared, so the bar
 * shows exactly which reward each upcoming level unlocks.
 */
export const COMPANION_FEAST_REWARD_BAR_MILESTONES: readonly CompanionFeastRewardBarMilestone[] = Object.freeze([
  { id: 'feast_1', pointsRequired: 1, rewardLabel: '+3 Dice', reward: { dicePool: 3 } },
  { id: 'feast_2', pointsRequired: 2, rewardLabel: '+40 Essence', reward: { essence: 40 } },
  { id: 'feast_3', pointsRequired: 3, rewardLabel: '+1 Shard', reward: { shards: 1 } },
  { id: 'feast_4', pointsRequired: 4, rewardLabel: '+8 Dice +60 Essence', reward: { dicePool: 8, essence: 60 } },
  { id: 'feast_5', pointsRequired: 5, rewardLabel: '+2 Shards +100 Essence', reward: { shards: 2, essence: 100 } },
  { id: 'feast_6', pointsRequired: 6, rewardLabel: '+20 Dice +4 Shards +200 Essence', reward: { dicePool: 20, shards: 4, essence: 200 } },
]);

export const COMPANION_FEAST_REWARD_BAR_TOTAL_POINTS =
  COMPANION_FEAST_REWARD_BAR_MILESTONES[COMPANION_FEAST_REWARD_BAR_MILESTONES.length - 1]?.pointsRequired ?? 0;

export const COMPANION_FEAST_SCORE_PER_FEAST_POINT = 250;

export function getCompanionFeastMilestone(milestoneId: string): CompanionFeastRewardBarMilestone | null {
  return COMPANION_FEAST_REWARD_BAR_MILESTONES.find((milestone) => milestone.id === milestoneId) ?? null;
}

export function getNextCompanionFeastMilestone(
  progress: Pick<CompanionFeastProgressEntry, 'feastPoints'> | null | undefined,
): CompanionFeastRewardBarMilestone | null {
  const points = Math.max(0, Math.floor(progress?.feastPoints ?? 0));
  return COMPANION_FEAST_REWARD_BAR_MILESTONES.find((milestone) => points < milestone.pointsRequired) ?? null;
}

/** Drop unknown ids and keep claim order stable by milestone order. */
export function resolveCompanionFeastClaimedMilestoneIds(options: {
  claimedMilestoneIds?: string[];
}): string[] {
  const claimed = new Set(
    (options.claimedMilestoneIds ?? []).filter((id) =>
      COMPANION_FEAST_REWARD_BAR_MILESTONES.some((milestone) => milestone.id === id),
    ),
  );
  return Array.from(claimed).sort((left, right) => {
    const leftIndex = COMPANION_FEAST_REWARD_BAR_MILESTONES.findIndex((milestone) => milestone.id === left);
    const rightIndex = COMPANION_FEAST_REWARD_BAR_MILESTONES.findIndex((milestone) => milestone.id === right);
    return leftIndex - rightIndex;
  });
}

export type CompanionFeastRewardBarNodeState = 'claimed' | 'claimable' | 'upcoming';

export interface CompanionFeastRewardBarNode {
  milestone: CompanionFeastRewardBarMilestone;
  state: CompanionFeastRewardBarNodeState;
  /** Goal dish for the level that earns this milestone's feast point. */
  goalEmoji: string;
  goalName: string;
}

export interface CompanionFeastRewardBarViewModel {
  feastPoints: number;
  totalPoints: number;
  /** 0..1 fill for the traveling rewards bar. */
  fillRatio: number;
  nodes: CompanionFeastRewardBarNode[];
  nextMilestone: CompanionFeastRewardBarMilestone | null;
  claimableCount: number;
}

/**
 * Build the rewards-bar view model: how far the player has traveled and
 * which rewards are claimable now vs. coming up if they keep playing.
 */
export function buildCompanionFeastRewardBarViewModel(
  progress: Pick<CompanionFeastProgressEntry, 'feastPoints' | 'claimedMilestoneIds'> | null | undefined,
): CompanionFeastRewardBarViewModel {
  const feastPoints = Math.max(0, Math.floor(progress?.feastPoints ?? 0));
  const claimed = new Set(resolveCompanionFeastClaimedMilestoneIds({
    claimedMilestoneIds: progress?.claimedMilestoneIds ?? [],
  }));
  let claimableCount = 0;
  const nodes: CompanionFeastRewardBarNode[] = COMPANION_FEAST_REWARD_BAR_MILESTONES.map((milestone, index) => {
    let state: CompanionFeastRewardBarNodeState = 'upcoming';
    if (claimed.has(milestone.id)) {
      state = 'claimed';
    } else if (feastPoints >= milestone.pointsRequired) {
      state = 'claimable';
      claimableCount += 1;
    }
    const goalLevel = getCompanionFeastLevel(index);
    const goalTierInfo = getCompanionFeastFoodTier(goalLevel.goalTier);
    return { milestone, state, goalEmoji: goalTierInfo.emoji, goalName: goalTierInfo.name };
  });
  const totalPoints = COMPANION_FEAST_REWARD_BAR_TOTAL_POINTS;
  return {
    feastPoints,
    totalPoints,
    fillRatio: totalPoints > 0 ? Math.min(1, feastPoints / totalPoints) : 0,
    nodes,
    nextMilestone: getNextCompanionFeastMilestone({ feastPoints }),
    claimableCount,
  };
}
