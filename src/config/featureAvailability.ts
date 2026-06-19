export type FeatureStatus = 'live' | 'demo' | 'comingSoon' | 'locked' | 'hidden';

/** Controls what a public (non-admin) user can do with the feature. */
export type FeatureAccessLevel = 'open' | 'previewOnly' | 'hidden';

export type FeatureAvailabilityId =
  | 'app.body'
  | 'app.contracts'
  | 'app.routines'
  | 'app.compass_book'
  | 'today.visionStar'
  | 'today.waterZenTree'
  | 'today.feedCreatures'
  | 'today.weeklyVictory'
  | 'actions.taskTower'
  | 'actions.visionBoard'
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
  | 'settings.experimentalFeatures'
  | 'future.socialQuests'
  | 'future.aiQuestCoach';

export interface FeatureAvailabilityScreenshot {
  src: string;
  alt: string;
}

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
  previewScreenshots?: FeatureAvailabilityScreenshot[];
}

export const DEMO_FEATURE_LABEL = 'Demo ⭐️';
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Build repeatable daily flows that make your habits easier to start.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'lifeTools',
  },
  'app.compass_book': {
    id: 'app.compass_book',
    label: 'Compass Book',
    description: 'Deep six-chapter curriculum and durable personal model for life direction.',
    status: 'comingSoon',
    publicAccess: 'previewOnly',
    adminAccess: 'previewOnly',
    surface: 'Player Menu',
    category: 'lifeTools',
    publicLabel: 'Coming Soon',
    shortPitch: 'A future guided book for deeper self-understanding and long-term life direction.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'lifeTools',
  },
  'today.visionStar': {
    id: 'today.visionStar',
    label: 'Vision Star',
    description: 'Daily Today action for revealing a vision spark.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'Today',
    category: 'today',
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Reveal a small spark from your vision board to keep your bigger goals close.',
    votingEnabled: true,
    voteCategory: 'today',
  },
  'today.waterZenTree': {
    id: 'today.waterZenTree',
    label: 'Water the Zen Tree',
    description: 'Daily Today action for watering the Zen Tree.',
    status: 'demo',
    publicAccess: 'hidden',
    adminAccess: 'open',
    surface: 'Today',
    category: 'today',
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'A gentle daily ritual for growing your calm Zen Tree.',
    votingEnabled: true,
    voteCategory: 'today',
  },
  'today.feedCreatures': {
    id: 'today.feedCreatures',
    label: 'Feed Pet',
    description: 'Daily Today action for feeding your pet companion.',
    status: 'demo',
    publicAccess: 'hidden',
    adminAccess: 'open',
    surface: 'Today',
    category: 'today',
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Care for your pet companion with a simple daily action.',
    votingEnabled: true,
    voteCategory: 'today',
  },
  'today.weeklyVictory': {
    id: 'today.weeklyVictory',
    label: 'Weekly Victory',
    description: 'Weekly habit snapshot scorecard shown on the Today screen.',
    status: 'demo',
    // Hidden for the public: this is an admin-only demo feature, so regular
    // users can't toggle it on from the Experiments modal.
    publicAccess: 'hidden',
    adminAccess: 'open',
    surface: 'Today',
    category: 'today',
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'A simple weekly scorecard that celebrates your momentum and consistency.',
    votingEnabled: false,
    voteCategory: 'today',
  },
  'actions.taskTower': {
    id: 'actions.taskTower',
    label: 'Task Tower',
    description: 'Actions launcher entry for Task Tower.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ActionsTab',
    category: 'actions',
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Turn your tasks into a focused tower challenge that makes progress feel game-like.',
    votingEnabled: true,
    voteCategory: 'actions',
  },
  'actions.visionBoard': {
    id: 'actions.visionBoard',
    label: 'Vision Board',
    description: 'Actions launcher entry for Vision Board.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ActionsTab',
    category: 'actions',
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Keep your bigger goals visible with a visual board that supports your daily quest.',
    votingEnabled: true,
    voteCategory: 'actions',
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Peace-building prompts for navigating hard conversations with care.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'mind',
  },
  'body.yoga': {
    id: 'body.yoga',
    label: 'Flexibility',
    description: 'Flexibility reset routines in the Energy Body area.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'BreathingSpace',
    category: 'body',
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Gentle flexibility resets that help your body recharge between real-life quests.',
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'A creature care space for bonding with companions from your island journey.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
  },
  'score.stickersGallery': {
    id: 'score.stickersGallery',
    label: 'Puzzle Gallery',
    description: 'Future Score hub entry point for sticker collections.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'A playful gallery for collectible stickers, seasons, and achievement memories.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
  },
  'score.zenGarden': {
    id: 'score.zenGarden',
    label: 'Zen Garden',
    description: 'Future Score hub entry point for Zen Garden progression.',
    status: 'demo',
    publicAccess: 'previewOnly',
    adminAccess: 'open',
    surface: 'ScoreTab',
    category: 'scoreHub',
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'A peaceful progression garden where your consistency unlocks calming scenes and rewards.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'scoreHub',
    previewScreenshots: [
      {
        src: '/assets/zen garden/IMG_9482.webp',
        alt: 'Zen Garden early preview screenshot with calm stone path and water scene.',
      },
      {
        src: '/assets/Score_zengarden.webp',
        alt: 'Zen Garden Score hub concept card screenshot.',
      },
      {
        src: '/assets/zenshopmain.webp',
        alt: 'Zen Garden unlock shop concept screenshot.',
      },
    ],
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
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
    publicLabel: DEMO_FEATURE_LABEL,
    adminLabel: ADMIN_DEMO_MODE_LABEL,
    shortPitch: 'Early ideas and creator previews for future HabitGame experiences.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'settings',
  },
  'future.socialQuests': {
    id: 'future.socialQuests',
    label: 'Social Quests',
    description: 'Team up with friends on shared goals and celebrate wins together.',
    status: 'comingSoon',
    publicAccess: 'previewOnly',
    adminAccess: 'previewOnly',
    surface: 'MyAccountPanel',
    category: 'future',
    publicLabel: 'Coming Soon',
    shortPitch: 'Team up with friends on shared real-life quests and celebrate wins together.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'social',
  },
  'future.aiQuestCoach': {
    id: 'future.aiQuestCoach',
    label: 'AI Quest Coach',
    description: 'Personalized AI-powered guidance to help you stay on track with life goals.',
    status: 'comingSoon',
    publicAccess: 'previewOnly',
    adminAccess: 'previewOnly',
    surface: 'MyAccountPanel',
    category: 'future',
    publicLabel: 'Coming Soon',
    shortPitch: 'Personalized AI guidance that adapts to your real-life quest momentum.',
    votingEnabled: true,
    votingQuestion: DEFAULT_FUTURE_FEATURE_QUESTION,
    voteCategory: 'ai',
  },
} as const satisfies Record<FeatureAvailabilityId, FeatureAvailability>;

export function getFeatureAvailability(id: FeatureAvailabilityId): FeatureAvailability {
  return featureAvailabilityRegistry[id];
}
