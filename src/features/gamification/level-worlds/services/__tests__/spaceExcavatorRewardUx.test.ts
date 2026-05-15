import { SPACE_EXCAVATOR_CAMPAIGN_MILESTONES } from '../spaceExcavatorCampaignProgress';
import { resolveSpaceExcavatorRewardUxState } from '../spaceExcavatorRewardUx';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const spaceExcavatorRewardUxTests: TestCase[] = [
  {
    name: 'compact reward strip state summarizes progress and next reward without changing milestone rewards',
    run: () => {
      const state = resolveSpaceExcavatorRewardUxState({
        eventProgressPoints: 2,
        completedBoardCount: 2,
        claimedMilestoneIds: ['clear_1', 'clear_2'],
        status: 'active',
        boardIndex: 1,
        totalBoards: 10,
      });

      assertEqual(state.boardsCleared, 2, 'strip should expose boards cleared');
      assertEqual(state.totalBoards, 10, 'strip should expose total boards');
      assertEqual(state.progressPercent, 20, 'strip progress should be compact percentage state');
      assertEqual(state.nextRewardLabel, 'Next: +1 Shard', 'strip should summarize next unachieved reward');
      assertEqual(state.rewardReady, false, 'claimed achieved rewards should not show ready cue');
      assertDeepEqual(
        SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.map((milestone) => milestone.rewardLabel),
        ['+25 Essence', '+5 Dice', '+1 Shard', '+75 Essence', '+25 Dice +3 Shards'],
        'reward UX helpers must not change reward amounts',
      );
    },
  },
  {
    name: 'claimable modal selection resolves one milestone at a time in campaign order',
    run: () => {
      const firstState = resolveSpaceExcavatorRewardUxState({
        eventProgressPoints: 3,
        claimedMilestoneIds: [],
        status: 'board_complete',
        boardIndex: 2,
        totalBoards: 10,
      });

      assertEqual(firstState.rewardReady, true, 'achieved unclaimed milestones should show reward ready');
      assertEqual(firstState.activeClaimableMilestone?.id, 'clear_1', 'first claimable milestone should be selected first');
      assertDeepEqual(
        firstState.claimableMilestones.map((milestone) => milestone.id),
        ['clear_1', 'clear_2', 'clear_3'],
        'claimable queue should preserve milestone order',
      );

      const nextState = resolveSpaceExcavatorRewardUxState({
        eventProgressPoints: 3,
        claimedMilestoneIds: ['clear_1'],
        status: 'board_complete',
        boardIndex: 2,
        totalBoards: 10,
      });

      assertEqual(nextState.activeClaimableMilestone?.id, 'clear_2', 'after one claim, next claimable reward should surface');
    },
  },
  {
    name: 'auto-advance is enabled only for non-terminal board clears with no reward modal blocking',
    run: () => {
      const blockedByReward = resolveSpaceExcavatorRewardUxState({
        eventProgressPoints: 1,
        claimedMilestoneIds: [],
        status: 'board_complete',
        boardIndex: 0,
        totalBoards: 10,
      });
      assertEqual(blockedByReward.canAutoAdvanceBoard, false, 'claimable reward should block board auto-advance');

      const canAdvance = resolveSpaceExcavatorRewardUxState({
        eventProgressPoints: 1,
        claimedMilestoneIds: ['clear_1'],
        status: 'board_complete',
        boardIndex: 0,
        totalBoards: 10,
      });
      assertEqual(canAdvance.canAutoAdvanceBoard, true, 'non-terminal board clear with no modal should auto-advance');

      const terminalBoard = resolveSpaceExcavatorRewardUxState({
        eventProgressPoints: 10,
        claimedMilestoneIds: SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.map((milestone) => milestone.id),
        status: 'board_complete',
        boardIndex: 9,
        totalBoards: 10,
      });
      assert(terminalBoard.isTerminalBoardClear, 'last board clear should be treated as terminal');
      assertEqual(terminalBoard.canAutoAdvanceBoard, false, 'terminal board clear should not auto-advance');

      const completed = resolveSpaceExcavatorRewardUxState({
        eventProgressPoints: 10,
        claimedMilestoneIds: SPACE_EXCAVATOR_CAMPAIGN_MILESTONES.map((milestone) => milestone.id),
        status: 'completed',
        boardIndex: 9,
        totalBoards: 10,
      });
      assertEqual(completed.canAutoAdvanceBoard, false, 'completed event state should not auto-advance');
    },
  },
];

