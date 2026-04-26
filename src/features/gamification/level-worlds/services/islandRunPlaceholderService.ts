export type IslandRunPlaceholderKind =
  | 'habit_stop_unfinished'
  | 'wisdom_stop_unfinished'
  | 'mystery_stop_unfinished'
  | 'minigame_unavailable'
  | 'timed_event_unavailable'
  | 'launch_blocked_while_rolling';

export interface IslandRunPlaceholderDescriptor {
  kind: IslandRunPlaceholderKind;
  title: string;
  body: string;
  closeLabel: string;
  completionCtaLabel: string | null;
}

export function resolveIslandRunPlaceholderDescriptor(
  kind: IslandRunPlaceholderKind,
): IslandRunPlaceholderDescriptor {
  switch (kind) {
    case 'habit_stop_unfinished':
      return {
        kind,
        title: '✅ Habit Challenge (Placeholder)',
        body: 'This stop is not fully built yet. You can safely close this and stay on Island Run, or explicitly mark the stop complete for testing.',
        closeLabel: 'Close',
        completionCtaLabel: 'Mark Habit Stop Complete',
      };
    case 'wisdom_stop_unfinished':
      return {
        kind,
        title: '📖 Wisdom Chapter (Placeholder)',
        body: 'Wisdom chapter content is still in progress. You can close safely and continue rolling, or explicitly mark this stop complete.',
        closeLabel: 'Close',
        completionCtaLabel: 'Mark Wisdom Stop Complete',
      };
    case 'mystery_stop_unfinished':
      return {
        kind,
        title: '🧩 Mystery Stop (Placeholder)',
        body: 'This mystery variant is not available yet. Closing returns you to the board without changing stop progression.',
        closeLabel: 'Close',
        completionCtaLabel: null,
      };
    case 'minigame_unavailable':
      return {
        kind,
        title: '🎮 Minigame Unavailable',
        body: 'This minigame is not available right now. Closing keeps you inside Island Run and returns you to the board safely.',
        closeLabel: 'Close',
        completionCtaLabel: null,
      };
    case 'timed_event_unavailable':
      return {
        kind,
        title: '⏳ Event Placeholder',
        body: 'This timed event surface is not wired yet. You can close and continue playing Island Run immediately.',
        closeLabel: 'Close',
        completionCtaLabel: null,
      };
    case 'launch_blocked_while_rolling':
      return {
        kind,
        title: '🎲 Finish Current Roll First',
        body: 'A roll animation is still in progress. Wait for it to settle, then launch content again.',
        closeLabel: 'Got it',
        completionCtaLabel: null,
      };
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unhandled placeholder kind: ${String(exhaustive)}`);
    }
  }
}

export function canOpenIslandRunOverlayWhileRollingState(options: {
  isRolling: boolean;
  isAnimatingRoll: boolean;
  isRollSyncPending: boolean;
}): boolean {
  return !(options.isRolling || options.isAnimatingRoll || options.isRollSyncPending);
}
