export type FeatureStatus = 'live' | 'demo' | 'comingSoon' | 'locked' | 'hidden';

/** Controls what a public (non-admin) user can do with the feature. */
export type FeatureAccessLevel = 'open' | 'previewOnly' | 'hidden';

export type FeatureAvailabilityId =
  | 'score.playerShop'
  | 'score.garage'
  | 'score.achievements'
  | 'score.leaderboard'
  | 'score.bank'
  | 'score.collections'
  | 'score.creatureSanctuary'
  | 'score.stickersGallery'
  | 'score.zenGarden';

export interface FeatureAvailability {
  id: FeatureAvailabilityId;
  label: string;
  description: string;
  status: FeatureStatus;
  /** Access level for regular (non-admin) users. */
  publicAccess: FeatureAccessLevel;
  /** Access level for admin / creator / dev users (reserved for a future PR). */
  adminAccess: FeatureAccessLevel;
  surface?: string;
  category?: string;
}

export const featureAvailabilityRegistry = {
  'score.playerShop': {
    id: 'score.playerShop',
    label: 'Player Shop',
    description: 'Reward creation and redemption experience in the Score hub.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
  },
  'score.garage': {
    id: 'score.garage',
    label: 'Garage',
    description: 'Ship systems shell for companions, upgrades, and cosmetics.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
  },
  'score.achievements': {
    id: 'score.achievements',
    label: 'Achievements',
    description: 'Achievements entry point from the Score hub.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
  },
  'score.leaderboard': {
    id: 'score.leaderboard',
    label: 'Leaderboard',
    description: 'Leaderboard snapshot and ranking experience.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
  },
  'score.bank': {
    id: 'score.bank',
    label: 'Bank',
    description: 'Score, XP, and currency balance details.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
  },
  'score.collections': {
    id: 'score.collections',
    label: 'Collections',
    description: 'Collections tab placeholder in the Score hub.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
  },
  'score.creatureSanctuary': {
    id: 'score.creatureSanctuary',
    label: 'Creature Sanctuary',
    description: 'Future Score hub entry point for creature care.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
  },
  'score.stickersGallery': {
    id: 'score.stickersGallery',
    label: 'Stickers Gallery',
    description: 'Future Score hub entry point for sticker collections.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
  },
  'score.zenGarden': {
    id: 'score.zenGarden',
    label: 'Zen Garden',
    description: 'Zen Garden entry point from the Score hub.',
    status: 'live',
    publicAccess: 'open',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
  },
} as const satisfies Record<FeatureAvailabilityId, FeatureAvailability>;

export function getFeatureAvailability(id: FeatureAvailabilityId): FeatureAvailability {
  return featureAvailabilityRegistry[id];
}
