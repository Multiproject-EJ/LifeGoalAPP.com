import {
  applyJourneyDiscArenaRoundToProgress,
  buildJourneyDiscArenaRewardTrack,
  createJourneyDiscArenaProgress,
  JOURNEY_DISC_ARENA_MILESTONES,
} from '../journeyDiscArenaProgression';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const journeyDiscArenaProgressionTests: TestCase[] = [
  {
    name: 'multi reward track is ordered, visible, and exposes claimable states',
    run: () => {
      const progress = { ...createJourneyDiscArenaProgress(1), eventPoints: 320 };
      const track = buildJourneyDiscArenaRewardTrack(progress);
      assert(JOURNEY_DISC_ARENA_MILESTONES.length >= 6, 'track should contain multiple meaningful rewards');
      assert(track.milestones.every((node, index) => index === 0 || node.points > track.milestones[index - 1]!.points), 'milestones rise strictly');
      assertEqual(track.milestones.filter((node) => node.state === 'claimable').length, 3, '320 points reaches exactly the first three rewards');
      assert(track.fillPercent > 0 && track.fillPercent < 100, 'partial progress fills only part of the bar');
    },
  },
  {
    name: 'round banking is additive and idempotent by round id',
    run: () => {
      const initial = createJourneyDiscArenaProgress(1);
      const first = applyJourneyDiscArenaRoundToProgress({ progress: initial, roundId: 'round-1', score: 145, won: true, deployedDiscs: 3, nowMs: 2 });
      assertEqual(first.applied, true, 'first submission banks');
      assertEqual(first.progress.eventPoints, 145, 'score becomes event points');
      assertEqual(first.progress.victories, 1, 'victory is tracked');
      const duplicate = applyJourneyDiscArenaRoundToProgress({ progress: first.progress, roundId: 'round-1', score: 999, won: true, deployedDiscs: 4, nowMs: 3 });
      assertEqual(duplicate.applied, false, 'duplicate round does not bank');
      assertDeepEqual(duplicate.progress, first.progress, 'duplicate is a true no-op');
    },
  },
];
