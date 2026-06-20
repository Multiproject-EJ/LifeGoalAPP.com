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
};

export type DualTrackOverlayViewModel = {
  title: string;
  subtitle: string;
  realLifeTrack: DualTrackMilestoneCard[];
  gameTrack: DualTrackMilestoneCard[];
  centerSpine: {
    label: string;
    progressPercent: number;
    icon: string;
  };
};

type BuildDualTrackOverlayViewModelInput = {
  islandNumber?: number;
  islandDisplayName?: string;
  rewardBarProgress?: number;
  rewardBarThreshold?: number;
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
  return Number.isFinite(islandNumber) ? Math.min(120, Math.max(1, Math.floor(islandNumber ?? 1))) : 1;
}

function createRealLifeTrack(): DualTrackMilestoneCard[] {
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
  const nextIsland = Math.min(120, currentIsland + 1);
  const futureIsland = Math.min(120, currentIsland + 2);

  const cards: DualTrackMilestoneCard[] = [];

  if (currentIsland > 1) {
    cards.push({
      id: `game-island-${previousIsland}`,
      track: 'game',
      position: 'achieved',
      title: `Island ${previousIsland}`,
      subtitle: getIslandDisplayName(previousIsland),
      progressLabel: 'Completed',
      rewardPreviewLabel: 'Built',
      icon: '✓',
      source: 'island',
    });
  } else {
    cards.push({
      id: 'game-island-foundation',
      track: 'game',
      position: 'achieved',
      title: 'Adventure begun',
      subtitle: 'Your first island path is open.',
      progressLabel: 'Started',
      rewardPreviewLabel: 'First step',
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
    rewardPreviewLabel: 'Current island',
    icon: '🏝️',
    source: 'island',
  });

  if (currentIsland < 120) {
    cards.push({
      id: `game-island-${nextIsland}`,
      track: 'game',
      position: 'next',
      title: `Island ${nextIsland}`,
      subtitle: getIslandDisplayName(nextIsland),
      progressLabel: 'Up next',
      rewardPreviewLabel: 'Preview',
      icon: '?',
      source: 'island',
    });
  }

  cards.push({
    id: currentIsland < 119 ? `game-island-${futureIsland}` : 'game-island-final-future',
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
  return {
    title: 'My Quest & Game Progress',
    subtitle: 'Life growth and adventure progress rise together.',
    realLifeTrack: createRealLifeTrack(),
    gameTrack: createGameTrack(input),
    centerSpine: {
      label: 'Together',
      progressPercent: clampPercent(input.rewardBarProgress ?? 0, input.rewardBarThreshold ?? 10),
      icon: '✦',
    },
  };
}
