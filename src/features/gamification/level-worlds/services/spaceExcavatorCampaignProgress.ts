import type { SpaceExcavatorProgressEntry } from './islandRunGameStateStore';

export type SpaceExcavatorCampaignRewardKind = 'essence' | 'dice' | 'shards' | 'bundle';

export interface SpaceExcavatorCampaignReward {
  essence?: number;
  dicePool?: number;
  shards?: number;
}

export interface SpaceExcavatorCampaignMilestone {
  id: string;
  pointsRequired: number;
  rewardKind: SpaceExcavatorCampaignRewardKind;
  rewardLabel: string;
  reward: SpaceExcavatorCampaignReward;
}

export const SPACE_EXCAVATOR_CAMPAIGN_MILESTONES: SpaceExcavatorCampaignMilestone[] = [
  { id: 'clear_1', pointsRequired: 1, rewardKind: 'essence', rewardLabel: '+25 Essence', reward: { essence: 25 } },
  { id: 'clear_2', pointsRequired: 2, rewardKind: 'dice', rewardLabel: '+5 Dice', reward: { dicePool: 5 } },
  { id: 'clear_3', pointsRequired: 3, rewardKind: 'shards', rewardLabel: '+1 Shard', reward: { shards: 1 } },
  { id: 'clear_5', pointsRequired: 5, rewardKind: 'essence', rewardLabel: '+75 Essence', reward: { essence: 75 } },
  { id: 'clear_10', pointsRequired: 10, rewardKind: 'bundle', rewardLabel: '+25 Dice +3 Shards', reward: { dicePool: 25, shards: 3 } },
  { id: 'clear_15', pointsRequired: 15, rewardKind: 'essence', rewardLabel: '+150 Essence', reward: { essence: 150 } },
  { id: 'clear_20', pointsRequired: 20, rewardKind: 'bundle', rewardLabel: '+20 Dice +2 Shards', reward: { dicePool: 20, shards: 2 } },
  { id: 'clear_25', pointsRequired: 25, rewardKind: 'dice', rewardLabel: '+35 Dice', reward: { dicePool: 35 } },
  { id: 'clear_30', pointsRequired: 30, rewardKind: 'shards', rewardLabel: '+5 Shards', reward: { shards: 5 } },
  { id: 'clear_35', pointsRequired: 35, rewardKind: 'bundle', rewardLabel: '+60 Dice +8 Shards +300 Essence', reward: { dicePool: 60, shards: 8, essence: 300 } },
];

export const SPACE_EXCAVATOR_DEFAULT_CAMPAIGN_TOTAL_POINTS = 35;
export const SPACE_EXCAVATOR_CAMPAIGN_TOTAL_POINTS =
  SPACE_EXCAVATOR_CAMPAIGN_MILESTONES[SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.length - 1]?.pointsRequired
  ?? SPACE_EXCAVATOR_DEFAULT_CAMPAIGN_TOTAL_POINTS;

export function resolveSpaceExcavatorClaimedMilestoneIds(options: {
  eventProgressPoints: number;
  claimedMilestoneIds?: string[];
}): string[] {
  const claimed = new Set(
    (options.claimedMilestoneIds ?? []).filter((id) =>
      SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.some((milestone) => milestone.id === id),
    ),
  );
  return Array.from(claimed).sort((left, right) => {
    const leftIndex = SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.findIndex((milestone) => milestone.id === left);
    const rightIndex = SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.findIndex((milestone) => milestone.id === right);
    return leftIndex - rightIndex;
  });
}

export function getSpaceExcavatorCampaignMilestone(milestoneId: string): SpaceExcavatorCampaignMilestone | null {
  return SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.find((milestone) => milestone.id === milestoneId) ?? null;
}

export function getNextSpaceExcavatorCampaignMilestone(
  progress: Pick<SpaceExcavatorProgressEntry, 'eventProgressPoints'> | null | undefined,
): SpaceExcavatorCampaignMilestone | null {
  const points = Math.max(0, Math.floor(progress?.eventProgressPoints ?? 0));
  return SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.find((milestone) => points < milestone.pointsRequired) ?? null;
}
