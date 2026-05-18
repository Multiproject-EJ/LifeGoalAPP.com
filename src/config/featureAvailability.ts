export type FeatureStatus = 'live' | 'demo' | 'comingSoon' | 'locked' | 'hidden';

/** Controls what a public (non-admin) user can do with the feature. */
export type FeatureAccessLevel = 'open' | 'previewOnly' | 'hidden';

export type FeatureAvailabilityId =
  | 'app.body'
  | 'energy.shell'
  | 'mind.breathingSpace'
  | 'body.yoga'
  | 'body.food'
  | 'body.exercise'
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
  publicLabel?: string;
  adminLabel?: string;
  shortPitch?: string;
  votingEnabled?: boolean;
  votingQuestion?: string;
  voteCategory?: string;
}

const FUTURE_FEATURE_LABEL = 'Future Feature';
const DEMO_MODE_LABEL = 'Demo Mode';
const DEFAULT_FUTURE_FEATURE_QUESTION =
  'HabitGame grows around what helps players stay motivated in real life. Vote if this is a feature you’d love to see next.';

export const featureAvailabilityRegistry = {
  'app.body': {
    id: 'app.body',
    label: 'Body',
    description: 'Body routines and personal care section.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'App',
    category: 'workspace',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'Body routines and personal care support for healthier real-life momentum.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'body',
  },
  'energy.shell': {
    id: 'energy.shell',
    label: 'Energy',
    description: 'Energy shell and Mind / Body segmented entry point.',
    status: 'live',
    publicAccess: 'open',
    adminAccess: 'open',
    surface: 'BreathingSpace',
    category: 'energy',
  },
  'mind.breathingSpace': {
    id: 'mind.breathingSpace',
    label: 'Breathing Space',
    description: 'Live breathing and meditation tools in the Energy area.',
    status: 'live',
    publicAccess: 'open',
    adminAccess: 'open',
    surface: 'BreathingSpace',
    category: 'mind',
  },
  'body.yoga': {
    id: 'body.yoga',
    label: 'Yoga',
    description: 'Yoga reset routines in the Energy Body area.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'BreathingSpace',
    category: 'body',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'Gentle yoga resets that help your body recharge between real-life quests.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'body',
  },
  'body.food': {
    id: 'body.food',
    label: 'Food',
    description: 'Food and mindful nutrition routines in the Energy Body area.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'BreathingSpace',
    category: 'body',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'Mindful food routines that support balanced energy without perfection pressure.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'body',
  },
  'body.exercise': {
    id: 'body.exercise',
    label: 'Exercise',
    description: 'Exercise and training routines in the Energy Body area.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'BreathingSpace',
    category: 'body',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'Exercise quests that turn movement into gentle progress for real life.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'body',
  },
  'score.playerShop': {
    id: 'score.playerShop',
    label: 'Player Shop',
    description: 'Reward creation and redemption experience in the Score hub.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'A player shop for creating motivating rewards that support healthy habits.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
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
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'A cozy upgrade space for companions, cosmetics, and your growing world.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
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
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'Achievement moments that celebrate progress without requiring perfection.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
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
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'A friendly ranking view for motivation while keeping real-life balance first.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
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
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'A clearer home for score, XP, and reward balances as your quest grows.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
  },
  'score.collections': {
    id: 'score.collections',
    label: 'Collections',
    description: 'Collections tab in the Score hub.',
    status: 'live',
    publicAccess: 'open',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'A creature care space for bonding with companions from your island journey.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
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
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: DEMO_MODE_LABEL,
    shortPitch: 'A playful gallery for collectible stickers, seasons, and achievement memories.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
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
