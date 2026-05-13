import type { SpaceExcavatorProgressEntry } from './islandRunGameStateStore';

export type SpaceExcavatorCampaignRewardKind = 'dice_placeholder' | 'essence_placeholder' | 'shards_placeholder' | 'event_completion_placeholder';

export interface SpaceExcavatorCampaignMilestone {
  id: string;
  pointsRequired: number;
  rewardKind: SpaceExcavatorCampaignRewardKind;
  rewardLabel: string;
}

export const SPACE_EXCAVATOR_CAMPAIGN_MILESTONES: SpaceExcavatorCampaignMilestone[] = [
  { id: 'clear_1', pointsRequired: 1, rewardKind: 'dice_placeholder', rewardLabel: '25 dice placeholder' },
  { id: 'clear_2', pointsRequired: 2, rewardKind: 'essence_placeholder', rewardLabel: '50 essence placeholder' },
  { id: 'clear_3', pointsRequired: 3, rewardKind: 'shards_placeholder', rewardLabel: '10 shards placeholder' },
  { id: 'clear_5', pointsRequired: 5, rewardKind: 'essence_placeholder', rewardLabel: '150 essence placeholder' },
  { id: 'clear_10', pointsRequired: 10, rewardKind: 'event_completion_placeholder', rewardLabel: 'Event completion reward placeholder' },
];

export const SPACE_EXCAVATOR_DEFAULT_CAMPAIGN_TOTAL_POINTS = 10;
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
  const points = Math.max(0, Math.floor(options.eventProgressPoints));
  SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.forEach((milestone) => {
    if (points >= milestone.pointsRequired) claimed.add(milestone.id);
  });
  return Array.from(claimed).sort((left, right) => {
    const leftIndex = SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.findIndex((milestone) => milestone.id === left);
    const rightIndex = SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.findIndex((milestone) => milestone.id === right);
    return leftIndex - rightIndex;
  });
}

export function getNextSpaceExcavatorCampaignMilestone(
  progress: Pick<SpaceExcavatorProgressEntry, 'eventProgressPoints'> | null | undefined,
): SpaceExcavatorCampaignMilestone | null {
  const points = Math.max(0, Math.floor(progress?.eventProgressPoints ?? 0));
  return SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.find((milestone) => points < milestone.pointsRequired) ?? null;
}
