export type FeatureStatus = 'live' | 'demo' | 'comingSoon' | 'locked' | 'hidden';

/** Controls what a public (non-admin) user can do with the feature. */
export type FeatureAccessLevel = 'open' | 'previewOnly' | 'hidden';

export type FeatureAvailabilityId =
  | 'app.body'
  | 'app.contracts'
  | 'app.routines'
  | 'energy.shell'
  | 'mind.breathingSpace'
  | 'mind.meditation'
  | 'mind.conflictResolver'
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
  | 'score.zenGarden'
  | 'settings.holidayThemes'
  | 'settings.notifications'
  | 'settings.experimentalFeatures';

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
const ADMIN_DEMO_MODE_LABEL = 'Demo Mode';
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
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Body routines and personal care support for healthier real-life momentum.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'body',
  },
  'app.contracts': {
    id: 'app.contracts',
    label: 'Promises',
    description: 'Contracts and promises workspace for personal commitments.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'App',
    category: 'workspace',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Keep meaningful promises to yourself with gentle accountability and rewards.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'lifeTools',
  },
  'app.routines': {
    id: 'app.routines',
    label: 'Routines',
    description: 'Routines workspace for repeatable daily flows.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'App',
    category: 'workspace',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Build repeatable daily flows that make your habits easier to start.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'lifeTools',
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
  'mind.meditation': {
    id: 'mind.meditation',
    label: 'Meditation',
    description: 'Guided meditation tools in the Energy Mind area.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'BreathingSpace',
    category: 'mind',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Guided meditation support for calmer focus and real-life momentum.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'mind',
  },
  'mind.conflictResolver': {
    id: 'mind.conflictResolver',
    label: 'Conflict Resolver',
    description: 'Conflict Resolver tools in the Energy Mind area.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'BreathingSpace',
    category: 'mind',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Peace-building prompts for navigating hard conversations with care.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'mind',
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
    adminLabel: ADMIN_DEMO_MODE_LABEL,
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
    adminLabel: ADMIN_DEMO_MODE_LABEL,
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
    adminLabel: ADMIN_DEMO_MODE_LABEL,
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
    adminLabel: ADMIN_DEMO_MODE_LABEL,
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
    adminLabel: ADMIN_DEMO_MODE_LABEL,
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
    adminLabel: ADMIN_DEMO_MODE_LABEL,
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
    adminLabel: ADMIN_DEMO_MODE_LABEL,
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
    adminLabel: ADMIN_DEMO_MODE_LABEL,
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
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'A creature care space for bonding with companions from your island journey.',
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
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'A playful gallery for collectible stickers, seasons, and achievement memories.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
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
  'settings.holidayThemes': {
    id: 'settings.holidayThemes',
    label: 'Holiday Themes',
    description: 'Seasonal theme settings in My Account.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'MyAccountPanel',
    category: 'settings',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Seasonal themes that make the app feel alive around meaningful moments.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'settings',
  },
  'settings.notifications': {
    id: 'settings.notifications',
    label: 'Notifications',
    description: 'Notification and reminder settings in My Account.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'MyAccountPanel',
    category: 'settings',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Gentle reminders that support your quest without becoming noisy.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'settings',
  },
  'settings.experimentalFeatures': {
    id: 'settings.experimentalFeatures',
    label: 'Experimental Features',
    description: 'Experimental feature toggles in My Account.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'MyAccountPanel',
    category: 'settings',
    publicLabel: FUTURE_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Early ideas and creator previews for future HabitGame experiences.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'settings',
  },
} as const satisfies Record<FeatureAvailabilityId, FeatureAvailability>;

export function getFeatureAvailability(id: FeatureAvailabilityId): FeatureAvailability {
  return featureAvailabilityRegistry[id];
}
