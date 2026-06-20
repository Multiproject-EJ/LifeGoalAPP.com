import { getIslandDisplayName } from './islandNames';

export type DualTrackMilestonePosition = 'achieved' | 'current' | 'next' | 'locked';
export type DualTrackMilestoneTrack = 'real_life' | 'game';
export type DualTrackMilestoneSource = 'placeholder' | 'goal' | 'habit' | 'island' | 'profile';

export type DualTrackMilestoneCard = {
  id: string;
  track: DualTrackMilestoneTrack;
  position: DualTrackMilestonePosition;
  title: string;
  subtitle: string;
  progressLabel: string;
  rewardPreviewLabel: string;
  icon: string;
  source: DualTrackMilestoneSource;
  /** Concrete island number for game cards that map to a real island; omitted for mystery/placeholder cards. */
  islandNumber?: number;
};

export type DualTrackOverlayViewModel = {
  title: string;
  subtitle: string;
  realLifeTrack: DualTrackMilestoneCard[];
  gameTrack: DualTrackMilestoneCard[];
  /** Display-only summary for the Real Life Journey track. */
  realLifeProgress: {
    source: 'data' | 'placeholder';
    goalCount: number;
    habitCount: number;
  };
  /** Display-only gallery summary for the Game Journey track. */
  gameProgress: {
    currentIsland: number;
    collectedCount: number;
    totalCount: number;
  };
  centerSpine: {
    label: string;
    progressPercent: number;
    icon: string;
  };
};

const TOTAL_ISLANDS = 120;

/** Lightweight, read-only real-life inputs the overlay may receive once a user is authenticated. */
export type DualTrackRealLifeGoalInput = {
  id: string;
  title: string;
  status?: string | null;
};

export type DualTrackRealLifeHabitInput = {
  id: string;
  title: string;
  emoji?: string | null;
};

export type DualTrackRealLifeInput = {
  isAuthenticated?: boolean;
  goals?: DualTrackRealLifeGoalInput[];
  habits?: DualTrackRealLifeHabitInput[];
};

type BuildDualTrackOverlayViewModelInput = {
  islandNumber?: number;
  islandDisplayName?: string;
  rewardBarProgress?: number;
  rewardBarThreshold?: number;
  realLife?: DualTrackRealLifeInput;
};

const REAL_LIFE_PLACEHOLDERS = [
  {
    title: 'Clarity & Focus',
    subtitle: 'Know what you want and why it matters.',
    icon: '🌱',
    rewardPreviewLabel: 'Foundation built',
  },
  {
    title: 'Consistent Habits',
    subtitle: 'Build daily actions that move you forward.',
    icon: '📘',
    rewardPreviewLabel: 'Rhythm unlocked',
  },
  {
    title: 'Healthy & Strong',
    subtitle: 'Support your body and mind with care.',
    icon: '💪',
    rewardPreviewLabel: 'Energy rising',
  },
  {
    title: 'Dream Career',
    subtitle: 'Shape work that fits your direction.',
    icon: '🏙️',
    rewardPreviewLabel: 'Next milestone',
  },
  {
    title: 'Financial Freedom',
    subtitle: 'Create room for choice and peace.',
    icon: '🌄',
    rewardPreviewLabel: 'Future preview',
  },
];

function clampPercent(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((numerator / denominator) * 100)));
}

function normalizeIslandNumber(islandNumber: number | undefined): number {
  return Number.isFinite(islandNumber) ? Math.min(TOTAL_ISLANDS, Math.max(1, Math.floor(islandNumber ?? 1))) : 1;
}

const COMPLETED_GOAL_STATUS_HINTS = ['complete', 'done', 'achiev', 'finish', 'won', 'success'];

function isCompletedGoalStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return COMPLETED_GOAL_STATUS_HINTS.some((hint) => normalized.includes(hint));
}

function sanitizeRealLifeTitle(title: string | undefined, fallback: string): string {
  const trimmed = (title ?? '').trim();
  if (!trimmed) return fallback;
  return trimmed.length > 48 ? `${trimmed.slice(0, 47)}…` : trimmed;
}

/**
 * Map already-loaded, read-only goal/habit summaries into the shared milestone shape.
 * Returns null whenever data is missing or ambiguous so the placeholder ladder is used instead.
 */
function createRealLifeTrackFromData(realLife: DualTrackRealLifeInput): DualTrackMilestoneCard[] | null {
  if (!realLife.isAuthenticated) return null;

  const goals = (realLife.goals ?? []).filter((goal): goal is DualTrackRealLifeGoalInput =>
    Boolean(goal && typeof goal.title === 'string' && goal.title.trim()),
  );
  const habits = (realLife.habits ?? []).filter((habit): habit is DualTrackRealLifeHabitInput =>
    Boolean(habit && typeof habit.title === 'string' && habit.title.trim()),
  );
  if (goals.length === 0 && habits.length === 0) return null;

  const completedGoals = goals.filter((goal) => isCompletedGoalStatus(goal.status));
  const activeGoals = goals.filter((goal) => !isCompletedGoalStatus(goal.status));
  const habitCount = habits.length;

  const cards: DualTrackMilestoneCard[] = [];

  // Achieved (history / pride) — completed goals first, else established habit foundation.
  if (completedGoals.length > 0) {
    cards.push({
      id: 'real-life-achieved',
      track: 'real_life',
      position: 'achieved',
      title: sanitizeRealLifeTitle(completedGoals[0].title, 'Goal achieved'),
      subtitle: completedGoals.length > 1
        ? `${completedGoals.length} goals achieved so far.`
        : 'Goal achieved — momentum earned.',
      progressLabel: 'Achieved',
      rewardPreviewLabel: 'Done',
      icon: '✓',
      source: 'goal',
    });
  } else {
    cards.push({
      id: 'real-life-achieved',
      track: 'real_life',
      position: 'achieved',
      title: 'Consistent Habits',
      subtitle: habitCount > 1
        ? `${habitCount} habits keeping you steady.`
        : 'A daily habit keeping you steady.',
      progressLabel: 'In rhythm',
      rewardPreviewLabel: 'Foundation',
      icon: '✓',
      source: 'habit',
    });
  }

  // Current (focus) — the active goal you are working on, else daily habits, else encourage a new goal.
  if (activeGoals.length > 0) {
    cards.push({
      id: 'real-life-current',
      track: 'real_life',
      position: 'current',
      title: sanitizeRealLifeTitle(activeGoals[0].title, 'Current goal'),
      subtitle: 'Your current focus goal.',
      progressLabel: 'Current focus',
      rewardPreviewLabel: 'In progress',
      icon: '🎯',
      source: 'goal',
    });
  } else if (habitCount > 0) {
    cards.push({
      id: 'real-life-current',
      track: 'real_life',
      position: 'current',
      title: 'Daily Habits',
      subtitle: `Keeping ${habitCount} habit${habitCount > 1 ? 's' : ''} alive today.`,
      progressLabel: 'Current focus',
      rewardPreviewLabel: 'In progress',
      icon: '📘',
      source: 'habit',
    });
  } else {
    cards.push({
      id: 'real-life-current',
      track: 'real_life',
      position: 'current',
      title: 'Set your next goal',
      subtitle: 'Pick a new focus to keep climbing.',
      progressLabel: 'Current focus',
      rewardPreviewLabel: 'New chapter',
      icon: '🌱',
      source: 'placeholder',
    });
  }

  // Next — a second active goal if there is one, else a gentle prompt to add the next milestone.
  if (activeGoals.length > 1) {
    cards.push({
      id: 'real-life-next',
      track: 'real_life',
      position: 'next',
      title: sanitizeRealLifeTitle(activeGoals[1].title, 'Next goal'),
      subtitle: 'Up next on your path.',
      progressLabel: 'Up next',
      rewardPreviewLabel: 'Preview',
      icon: '🌄',
      source: 'goal',
    });
  } else {
    cards.push({
      id: 'real-life-next',
      track: 'real_life',
      position: 'next',
      title: 'Next milestone',
      subtitle: 'Add a new goal to extend your journey.',
      progressLabel: 'Up next',
      rewardPreviewLabel: 'Preview',
      icon: '🌱',
      source: 'placeholder',
    });
  }

  // Locked mystery stays placeholder-safe.
  cards.push({
    id: 'real-life-locked',
    track: 'real_life',
    position: 'locked',
    title: 'Future milestone',
    subtitle: 'Keep climbing to reveal this step.',
    progressLabel: 'Hidden future',
    rewardPreviewLabel: '???',
    icon: '?',
    source: 'placeholder',
  });

  return cards;
}

function createRealLifeTrack(realLife?: DualTrackRealLifeInput): DualTrackMilestoneCard[] {
  if (realLife) {
    const fromData = createRealLifeTrackFromData(realLife);
    if (fromData) return fromData;
  }
  return createRealLifePlaceholderTrack();
}

function createRealLifePlaceholderTrack(): DualTrackMilestoneCard[] {
  return REAL_LIFE_PLACEHOLDERS.map((milestone, index) => {
    const position: DualTrackMilestonePosition = index < 2 ? 'achieved' : index === 2 ? 'current' : index === 3 ? 'next' : 'locked';
    const progressLabel = position === 'achieved'
      ? 'Achieved'
      : position === 'current'
        ? 'Current focus'
        : position === 'next'
          ? 'Up next'
          : 'Hidden future';

    return {
      id: `real-life-${index + 1}`,
      track: 'real_life',
      position,
      title: position === 'locked' ? 'Future milestone' : milestone.title,
      subtitle: position === 'locked' ? 'Keep climbing to reveal this step.' : milestone.subtitle,
      progressLabel,
      rewardPreviewLabel: position === 'locked' ? '???' : milestone.rewardPreviewLabel,
      icon: position === 'locked' ? '?' : milestone.icon,
      source: 'placeholder',
    };
  });
}

function createGameTrack(input: BuildDualTrackOverlayViewModelInput): DualTrackMilestoneCard[] {
  const currentIsland = normalizeIslandNumber(input.islandNumber);
  const displayName = input.islandDisplayName?.trim() || getIslandDisplayName(currentIsland);
  const progressPercent = clampPercent(input.rewardBarProgress ?? 0, input.rewardBarThreshold ?? 10);
  const previousIsland = Math.max(1, currentIsland - 1);
  const nextIsland = Math.min(TOTAL_ISLANDS, currentIsland + 1);
  const futureIsland = Math.min(TOTAL_ISLANDS, currentIsland + 2);

  const cards: DualTrackMilestoneCard[] = [];

  if (currentIsland > 1) {
    cards.push({
      id: `game-island-${previousIsland}`,
      track: 'game',
      position: 'achieved',
      title: `Island ${previousIsland}`,
      subtitle: getIslandDisplayName(previousIsland),
      progressLabel: 'Completed',
      rewardPreviewLabel: 'Collected',
      icon: '✓',
      source: 'island',
      islandNumber: previousIsland,
    });
  } else {
    cards.push({
      id: 'game-island-foundation',
      track: 'game',
      position: 'achieved',
      title: 'Adventure begun',
      subtitle: 'Your first island path is open.',
      progressLabel: 'Started',
      rewardPreviewLabel: 'Collected',
      icon: '✓',
      source: 'placeholder',
    });
  }

  cards.push({
    id: `game-island-${currentIsland}`,
    track: 'game',
    position: 'current',
    title: `Island ${currentIsland}`,
    subtitle: displayName,
    progressLabel: `${progressPercent}% current progress`,
    rewardPreviewLabel: 'Exploring now',
    icon: '🏝️',
    source: 'island',
    islandNumber: currentIsland,
  });

  if (currentIsland < TOTAL_ISLANDS) {
    cards.push({
      id: `game-island-${nextIsland}`,
      track: 'game',
      position: 'next',
      title: `Island ${nextIsland}`,
      subtitle: getIslandDisplayName(nextIsland),
      progressLabel: 'Up next',
      rewardPreviewLabel: 'Next shore',
      icon: '?',
      source: 'island',
      islandNumber: nextIsland,
    });
  }

  cards.push({
    id: currentIsland < TOTAL_ISLANDS - 1 ? `game-island-${futureIsland}` : 'game-island-final-future',
    track: 'game',
    position: 'locked',
    title: 'Future island',
    subtitle: 'Keep climbing to reveal this shore.',
    progressLabel: 'Hidden future',
    rewardPreviewLabel: '???',
    icon: '?',
    source: 'placeholder',
  });

  return cards;
}

export function buildDualTrackOverlayViewModel(input: BuildDualTrackOverlayViewModelInput = {}): DualTrackOverlayViewModel {
  const currentIsland = normalizeIslandNumber(input.islandNumber);
  const realLifeTrack = createRealLifeTrack(input.realLife);
  const usesRealLifeData = realLifeTrack.some((card) => card.source === 'goal' || card.source === 'habit');
  const goalCount = (input.realLife?.goals ?? []).filter((goal) => goal && typeof goal.title === 'string' && goal.title.trim()).length;
  const habitCount = (input.realLife?.habits ?? []).filter((habit) => habit && typeof habit.title === 'string' && habit.title.trim()).length;

  return {
    title: 'My Quest & Game Progress',
    subtitle: 'Life growth and adventure progress rise together.',
    realLifeTrack,
    gameTrack: createGameTrack(input),
    realLifeProgress: {
      source: usesRealLifeData ? 'data' : 'placeholder',
      goalCount,
      habitCount,
    },
    gameProgress: {
      currentIsland,
      collectedCount: Math.max(0, currentIsland - 1),
      totalCount: TOTAL_ISLANDS,
    },
    centerSpine: {
      label: 'Together',
      progressPercent: clampPercent(input.rewardBarProgress ?? 0, input.rewardBarThreshold ?? 10),
      icon: '✦',
    },
  };
}
