import {
  canOpenIslandRunOverlayWhileRollingState,
  resolveIslandRunPlaceholderDescriptor,
} from '../islandRunPlaceholderService';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunPlaceholderServiceTests: TestCase[] = [
  {
    name: 'missing-content placeholders always resolve to in-board close flow',
    run: () => {
      const timedEvent = resolveIslandRunPlaceholderDescriptor('timed_event_unavailable');
      const mystery = resolveIslandRunPlaceholderDescriptor('mystery_stop_unfinished');
      const minigame = resolveIslandRunPlaceholderDescriptor('minigame_unavailable');

      assertEqual(Boolean(timedEvent.title), true, 'timed event placeholder should include a visible title');
      assertEqual(Boolean(mystery.title), true, 'mystery placeholder should include a visible title');
      assertEqual(Boolean(minigame.title), true, 'minigame placeholder should include a visible title');
      assertEqual(timedEvent.closeLabel.length > 0, true, 'timed event placeholder must define a close CTA');
      assertEqual(mystery.completionCtaLabel, null, 'mystery placeholder should not auto-complete stops');
      assertEqual(minigame.completionCtaLabel, null, 'missing minigame placeholder should not auto-complete stops');
    },
  },
  {
    name: 'habit/wisdom placeholders require explicit completion trigger',
    run: () => {
      const habit = resolveIslandRunPlaceholderDescriptor('habit_stop_unfinished');
      const wisdom = resolveIslandRunPlaceholderDescriptor('wisdom_stop_unfinished');

      assertEqual(
        habit.completionCtaLabel,
        'Mark Habit Stop Complete',
        'habit placeholder should expose explicit completion CTA',
      );
      assertEqual(
        wisdom.completionCtaLabel,
        'Mark Wisdom Stop Complete',
        'wisdom placeholder should expose explicit completion CTA',
      );
    },
  },
  {
    name: 'launcher open is blocked while roll state is active to prevent stuck overlay/roll overlap',
    run: () => {
      assertEqual(
        canOpenIslandRunOverlayWhileRollingState({
          isRolling: true,
          isAnimatingRoll: false,
          isRollSyncPending: false,
        }),
        false,
        'launches should be blocked while isRolling=true',
      );
      assertEqual(
        canOpenIslandRunOverlayWhileRollingState({
          isRolling: false,
          isAnimatingRoll: true,
          isRollSyncPending: false,
        }),
        false,
        'launches should be blocked while animation refs are active',
      );
      assertEqual(
        canOpenIslandRunOverlayWhileRollingState({
          isRolling: false,
          isAnimatingRoll: false,
          isRollSyncPending: true,
        }),
        false,
        'launches should be blocked while roll sync is pending',
      );
      assertEqual(
        canOpenIslandRunOverlayWhileRollingState({
          isRolling: false,
          isAnimatingRoll: false,
          isRollSyncPending: false,
        }),
        true,
        'launches should be allowed when board roll state is idle',
      );
    },
  },
];
