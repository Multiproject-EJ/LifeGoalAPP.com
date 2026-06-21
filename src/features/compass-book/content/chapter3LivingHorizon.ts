/**
 * Chapter 3 — The Living Horizon (Islands 41–60).
 *
 * Core question: What kind of ordinary life would genuinely fit me, not merely
 * impress me? Pure content. Visual zones: Sanctuary, Workshop, Gathering Place,
 * Vital Path, Open Gate, Horizon. Option ids are stable; labels here are the
 * display source of truth (resolved via LIVING_HORIZON_LABELS).
 */

import type {
  CompassBlockDefinition,
  CompassBlockOption,
  CompassBookActivityDefinition,
  CompassBookChapterDefinition,
  CompassChapterStageIndex,
} from '../types';

const CHAPTER_ID = 'living_horizon' as const;
const START_ISLAND = 41;

const MORNING_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'slow_quiet', label: 'Slow & quiet' },
  { id: 'active_early', label: 'Active & early' },
  { id: 'family_time', label: 'Family time' },
  { id: 'creative_first', label: 'Create first' },
  { id: 'outdoors', label: 'Outdoors' },
  { id: 'planning', label: 'Plan the day' },
];

const SCENE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'creating', label: 'Making something' },
  { id: 'helping', label: 'Helping people' },
  { id: 'building', label: 'Building / fixing' },
  { id: 'leading', label: 'Leading a team' },
  { id: 'analysing', label: 'Solving problems' },
  { id: 'teaching', label: 'Teaching / sharing' },
  { id: 'exploring', label: 'Exploring / researching' },
  { id: 'caring', label: 'Caring / tending' },
];

const RHYTHM_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'high_structure', label: 'Highly structured' },
  { id: 'mostly_structured', label: 'Mostly structured' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'mostly_free', label: 'Mostly free' },
  { id: 'fully_free', label: 'Fully free-flowing' },
];

const EVENING_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'social', label: 'Social' },
  { id: 'restful', label: 'Restful' },
  { id: 'creative', label: 'Creative' },
  { id: 'family', label: 'Family' },
  { id: 'learning', label: 'Learning' },
  { id: 'active', label: 'Active' },
];

const ENVIRONMENT_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'city', label: 'City' },
  { id: 'town', label: 'Small town' },
  { id: 'nature', label: 'Nature' },
  { id: 'coast', label: 'Coast' },
  { id: 'remote', label: 'Remote / rural' },
  { id: 'nomadic', label: 'Nomadic' },
];

const ROOTED_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'rooted', label: 'Rooted in one place' },
  { id: 'semi_rooted', label: 'A base, with travel' },
  { id: 'mobile', label: 'Mobile' },
];

const SOCIAL_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'solitary', label: 'Mostly solitary' },
  { id: 'small_circle', label: 'Small circle' },
  { id: 'community', label: 'Active community' },
  { id: 'large_network', label: 'Large network' },
];

const RELATIONSHIP_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'partner', label: 'Partner' },
  { id: 'family', label: 'Family' },
  { id: 'close_friends', label: 'Close friends' },
  { id: 'mentors', label: 'Mentors' },
  { id: 'collaborators', label: 'Collaborators' },
  { id: 'community', label: 'Community' },
];

const WORK_PROBLEM_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'people', label: 'People' },
  { id: 'systems', label: 'Systems' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'things', label: 'Physical things' },
  { id: 'words', label: 'Words / story' },
  { id: 'numbers', label: 'Numbers / data' },
  { id: 'beauty', label: 'Beauty / design' },
  { id: 'health', label: 'Health / care' },
];

const WORK_MODE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'create', label: 'Create' },
  { id: 'help', label: 'Help' },
  { id: 'lead', label: 'Lead' },
  { id: 'analyse', label: 'Analyse' },
  { id: 'teach', label: 'Teach' },
  { id: 'build', label: 'Build' },
];

const DEPTH_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'deep_focus', label: 'Deep focus' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'high_variety', label: 'High variety' },
];

const ENABLES_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'time_freedom', label: 'Time freedom' },
  { id: 'financial_security', label: 'Financial security' },
  { id: 'creative_outlet', label: 'Creative outlet' },
  { id: 'helping_others', label: 'Helping others' },
  { id: 'learning', label: 'Constant learning' },
  { id: 'status', label: 'Status / standing' },
];

const RESPONSIBILITY_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'light', label: 'Light' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'high', label: 'High' },
  { id: 'full_ownership', label: 'Full ownership' },
];

const CHALLENGE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'mastery', label: 'Mastery' },
  { id: 'growth', label: 'Growth' },
  { id: 'impact', label: 'Impact' },
  { id: 'stability', label: 'Stability' },
  { id: 'adventure', label: 'Adventure' },
];

const SCALE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'mastery_depth', label: 'Depth & mastery' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'scale_reach', label: 'Scale & reach' },
];

const ENOUGH_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'just_enough', label: 'Just enough' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'secure_buffer', label: 'Secure buffer' },
  { id: 'generous', label: 'Generous' },
  { id: 'ample', label: 'Ample' },
];

const TIME_FREEDOM_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'low', label: 'A little' },
  { id: 'some', label: 'Some' },
  { id: 'high', label: 'A lot' },
  { id: 'total', label: 'Total' },
];

const PROVE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'worth', label: 'My worth' },
  { id: 'intelligence', label: 'My intelligence' },
  { id: 'success', label: 'My success' },
  { id: 'independence', label: 'My independence' },
  { id: 'likeability', label: 'Being liked' },
  { id: 'toughness', label: 'My toughness' },
];

const ANTI_VISION_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'rich_but_empty', label: 'Rich but empty' },
  { id: 'busy_but_disconnected', label: 'Busy but disconnected' },
  { id: 'admired_but_unknown', label: 'Admired but unknown' },
  { id: 'secure_but_stagnant', label: 'Secure but stagnant' },
  { id: 'productive_but_unwell', label: 'Productive but unwell' },
  { id: 'powerful_but_alone', label: 'Powerful but alone' },
];

const PRICE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'health', label: 'My health' },
  { id: 'relationships', label: 'My relationships' },
  { id: 'integrity', label: 'My integrity' },
  { id: 'freedom', label: 'My freedom' },
  { id: 'presence', label: 'My presence' },
  { id: 'peace', label: 'My peace' },
];

export const LIVING_HORIZON_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...MORNING_OPTIONS,
    ...SCENE_OPTIONS,
    ...RHYTHM_OPTIONS,
    ...EVENING_OPTIONS,
    ...ENVIRONMENT_OPTIONS,
    ...ROOTED_OPTIONS,
    ...SOCIAL_OPTIONS,
    ...RELATIONSHIP_OPTIONS,
    ...WORK_PROBLEM_OPTIONS,
    ...WORK_MODE_OPTIONS,
    ...DEPTH_OPTIONS,
    ...ENABLES_OPTIONS,
    ...RESPONSIBILITY_OPTIONS,
    ...CHALLENGE_OPTIONS,
    ...SCALE_OPTIONS,
    ...ENOUGH_OPTIONS,
    ...TIME_FREEDOM_OPTIONS,
    ...PROVE_OPTIONS,
    ...ANTI_VISION_OPTIONS,
    ...PRICE_OPTIONS,
  ].map((option) => [option.id, option.label]),
);

function single(questionId: string, prompt: string, options: readonly CompassBlockOption[], required = true): CompassBlockDefinition {
  return { questionId, type: 'single_choice', prompt, required, options: [...options] };
}
function multi(questionId: string, prompt: string, options: readonly CompassBlockOption[], required = true): CompassBlockDefinition {
  return { questionId, type: 'multi_choice', prompt, required, options: [...options] };
}

function stageForOrder(order: number): CompassChapterStageIndex {
  if (order <= 4) return 1;
  if (order <= 8) return 2;
  if (order <= 12) return 3;
  if (order <= 16) return 4;
  return 5;
}

type ActivitySeed = {
  order: number;
  title: string;
  shortTitle: string;
  description?: string;
  required: boolean;
  blocks: CompassBlockDefinition[];
};

const SEEDS: ActivitySeed[] = [
  // Stage 1 — The ordinary good day (41–44)
  { order: 1, title: 'The ordinary morning', shortTitle: 'Morning', required: true,
    description: 'Picture a good ordinary day — not a holiday.',
    blocks: [single('morning', 'How does the morning feel?', MORNING_OPTIONS)] },
  { order: 2, title: 'Meaningful daytime', shortTitle: 'Daytime', required: true,
    description: 'Essential Scene — the heart of your good day.',
    blocks: [single('essential_scene', 'What are you mostly doing in the day?', SCENE_OPTIONS)] },
  { order: 3, title: 'Structure vs freedom', shortTitle: 'Rhythm', required: true,
    description: 'Desired Rhythm.',
    blocks: [single('rhythm', 'How structured is the day?', RHYTHM_OPTIONS)] },
  { order: 4, title: 'A good evening', shortTitle: 'Evening', required: true,
    blocks: [single('evening', 'How does the evening feel?', EVENING_OPTIONS)] },

  // Stage 2 — Place and people (45–48)
  { order: 5, title: 'Ideal environment', shortTitle: 'Environment', required: true,
    description: 'Sanctuary — where you live.',
    blocks: [single('environment', 'Where does this life happen?', ENVIRONMENT_OPTIONS)] },
  { order: 6, title: 'Rooted or mobile', shortTitle: 'Rooted', required: true,
    blocks: [single('rooted_mobile', 'Rooted in one place, or mobile?', ROOTED_OPTIONS)] },
  { order: 7, title: 'Social intensity', shortTitle: 'Social', required: true,
    description: 'Gathering Place — your people.',
    blocks: [single('social_intensity', 'How much social life fits you?', SOCIAL_OPTIONS)] },
  { order: 8, title: 'Relationships that belong', shortTitle: 'Relationships', required: true,
    blocks: [multi('relationships', 'Who belongs in this ordinary life?', RELATIONSHIP_OPTIONS)] },

  // Stage 3 — Work that fits (49–52)
  { order: 9, title: 'Problems I prefer', shortTitle: 'Problems', required: true,
    description: 'Workshop — work that fits.',
    blocks: [single('work_problems', 'What kind of problems do you like working on?', WORK_PROBLEM_OPTIONS)] },
  { order: 10, title: 'How I work', shortTitle: 'Work mode', required: true,
    blocks: [single('work_mode', 'What is your main mode of work?', WORK_MODE_OPTIONS)] },
  { order: 11, title: 'Depth vs variety', shortTitle: 'Depth', required: true,
    blocks: [single('depth_variety', 'Deep focus or high variety?', DEPTH_OPTIONS)] },
  { order: 12, title: 'What work makes possible', shortTitle: 'Enables', required: true,
    blocks: [single('work_enables', 'What should work make possible outside work?', ENABLES_OPTIONS)] },

  // Stage 4 — Challenge and responsibility (53–55) + Enough (56)
  { order: 13, title: 'Desired responsibility', shortTitle: 'Responsibility', required: true,
    description: 'Vital Path — challenge & responsibility.',
    blocks: [single('responsibility', 'How much responsibility do you want?', RESPONSIBILITY_OPTIONS)] },
  { order: 14, title: 'Meaningful challenge', shortTitle: 'Challenge', required: true,
    blocks: [single('challenge', 'What kind of challenge feels meaningful?', CHALLENGE_OPTIONS)] },
  { order: 15, title: 'Scale vs mastery', shortTitle: 'Scale', required: true,
    blocks: [single('scale_mastery', 'Depth & mastery, or scale & reach?', SCALE_OPTIONS)] },
  { order: 16, title: 'Financial enough', shortTitle: 'Enough', required: true,
    description: 'Open Gate — your definition of enough.',
    blocks: [single('financial_enough', 'What level of money is genuinely enough?', ENOUGH_OPTIONS)] },

  // Stage 5 — Enough cont., anti-vision, horizon (57–60)
  { order: 17, title: 'Time & proving', shortTitle: 'Time', required: true,
    blocks: [
      single('time_freedom', 'How much time freedom do you want?', TIME_FREEDOM_OPTIONS),
      single('no_longer_prove', 'What do you no longer need to prove?', PROVE_OPTIONS),
    ] },
  { order: 18, title: 'Success that still fails', shortTitle: 'Anti-vision', required: true,
    description: 'The kind of success that would still feel like failure.',
    blocks: [single('anti_vision', 'Which "success" would still feel like failure?', ANTI_VISION_OPTIONS)] },
  { order: 19, title: 'Price I will not pay', shortTitle: 'Price', required: true,
    blocks: [single('price_not_paid', 'What will you not sacrifice for any success?', PRICE_OPTIONS)] },
  { order: 20, title: 'Create the horizon', shortTitle: 'Confirm', required: true,
    description: 'Review your horizon and seal the chapter.',
    blocks: [
      {
        questionId: 'horizon_statement',
        type: 'short_text',
        prompt: 'Your Horizon statement — one sentence describing the life that fits you.',
        required: true,
        placeholder: 'e.g. A quiet coastal base, creative mornings, work that helps and still leaves time.',
        maxLength: 220,
      },
      { questionId: 'horizon_review', type: 'review', prompt: 'Review your Desired Rhythm, Essential Scene and the Price You Will Not Pay.', required: false },
      { questionId: 'horizon_confirm', type: 'confirmation', prompt: 'This is a life that would fit me. Set the Horizon.', required: true },
    ] },
];

function buildActivity(seed: ActivitySeed): CompassBookActivityDefinition {
  return {
    id: `${CHAPTER_ID}.a${String(seed.order).padStart(2, '0')}`,
    chapterId: CHAPTER_ID,
    islandNumber: START_ISLAND + seed.order - 1,
    order: seed.order,
    stage: stageForOrder(seed.order),
    title: seed.title,
    shortTitle: seed.shortTitle,
    description: seed.description,
    required: seed.required,
    authored: true,
    blocks: seed.blocks,
  };
}

export const chapter3LivingHorizon: CompassBookChapterDefinition = {
  id: CHAPTER_ID,
  order: 3,
  title: 'The Living Horizon',
  subtitle: 'The Life I Could Live',
  coreQuestion: 'What kind of ordinary life would genuinely fit me, not merely impress me?',
  visualMetaphor:
    'A panoramic future-life landscape: Sanctuary, Workshop, Gathering Place, Vital Path, Open Gate, Horizon.',
  outputFields: ['Desired Rhythm', 'Essential Scene', 'Price I Will Not Pay', 'Horizon statement'],
  islandRange: [41, 60],
  activities: SEEDS.map(buildActivity),
};
