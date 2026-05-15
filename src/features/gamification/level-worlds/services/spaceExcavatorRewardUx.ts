import {
  getNextSpaceExcavatorCampaignMilestone,
  SPACE_EXCAVATOR_CAMPAIGN_MILESTONES,
  SPACE_EXCAVATOR_CAMPAIGN_TOTAL_POINTS,
  type SpaceExcavatorCampaignMilestone,
} from './spaceExcavatorCampaignProgress';

export const SPACE_EXCAVATOR_BOARD_CLEAR_AUTO_ADVANCE_DELAY_MS = 2100;

export type SpaceExcavatorRewardUxStatus = 'active' | 'board_complete' | 'completed';

export interface SpaceExcavatorRewardUxState {
  boardsCleared: number;
  totalBoards: number;
  progressPercent: number;
  nextRewardLabel: string;
  rewardReady: boolean;
  claimableMilestones: SpaceExcavatorCampaignMilestone[];
  activeClaimableMilestone: SpaceExcavatorCampaignMilestone | null;
  milestoneDots: Array<{
    id: string;
    label: string;
    achieved: boolean;
    claimed: boolean;
    claimable: boolean;
  }>;
  canAutoAdvanceBoard: boolean;
  isTerminalBoardClear: boolean;
}

export function resolveSpaceExcavatorRewardUxState(options: {
  eventProgressPoints?: number;
  completedBoardCount?: number;
  claimedMilestoneIds?: string[];
  status: SpaceExcavatorRewardUxStatus;
  boardIndex?: number;
  totalBoards?: number;
}): SpaceExcavatorRewardUxState {
  const totalBoards = Math.max(1, Math.floor(options.totalBoards ?? SPACE_EXCAVATOR_CAMPAIGN_TOTAL_POINTS));
  const boardsCleared = Math.max(
    0,
    Math.min(
      totalBoards,
      Math.floor(options.eventProgressPoints ?? options.completedBoardCount ?? 0),
    ),
  );
  const claimedMilestoneIds = new Set(options.claimedMilestoneIds ?? []);
  const claimableMilestones = SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.filter(
    (milestone) => boardsCleared >= milestone.pointsRequired && !claimedMilestoneIds.has(milestone.id),
  );
  const activeClaimableMilestone = claimableMilestones[0] ?? null;
  const nextMilestone = getNextSpaceExcavatorCampaignMilestone({ eventProgressPoints: boardsCleared });
  const rewardReady = activeClaimableMilestone !== null;
  const currentBoardNumber = Math.max(1, Math.floor(options.boardIndex ?? 0) + 1);
  const isTerminalBoardClear = options.status === 'completed'
    || (options.status === 'board_complete' && currentBoardNumber >= totalBoards);

  return {
    boardsCleared,
    totalBoards,
    progressPercent: Math.min(100, Math.round((boardsCleared / totalBoards) * 100)),
    nextRewardLabel: rewardReady
      ? `Ready: ${activeClaimableMilestone.rewardLabel}`
      : nextMilestone
        ? `Next: ${nextMilestone.rewardLabel}`
        : 'All event rewards reached',
    rewardReady,
    claimableMilestones,
    activeClaimableMilestone,
    milestoneDots: SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.map((milestone) => {
      const achieved = boardsCleared >= milestone.pointsRequired;
      const claimed = claimedMilestoneIds.has(milestone.id);
      return {
        id: milestone.id,
        label: `${milestone.pointsRequired}`,
        achieved,
        claimed,
        claimable: achieved && !claimed,
      };
    }),
    canAutoAdvanceBoard: options.status === 'board_complete' && !rewardReady && !isTerminalBoardClear,
    isTerminalBoardClear,
  };
}

