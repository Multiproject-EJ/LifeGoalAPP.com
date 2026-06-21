/**
 * Chapter 4 — The Ikigai Map (Islands 61–80).
 *
 * Core question: Which possible directions have enough alignment to deserve a
 * real-world test? Pure content. A constellation of five forces: Curiosity,
 * Capability, Contribution, Viability, Willingness. Option ids are stable;
 * labels here are the display source of truth (resolved via IKIGAI_LABELS).
 */

import type {
  CompassBlockDefinition,
  CompassBlockOption,
  CompassBookActivityDefinition,
  CompassBookChapterDefinition,
  CompassChapterStageIndex,
} from '../types';

const CHAPTER_ID = 'ikigai_map' as const;
const START_ISLAND = 61;

const DOMAIN_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'technology', label: 'Technology' },
  { id: 'art', label: 'Art & design' },
  { id: 'science', label: 'Science' },
  { id: 'people', label: 'People & psychology' },
  { id: 'business', label: 'Business' },
  { id: 'nature', label: 'Nature' },
  { id: 'health', label: 'Health' },
  { id: 'writing', label: 'Writing & story' },
  { id: 'games', label: 'Games & play' },
  { id: 'craft', label: 'Craft & making' },
];

const PROBLEM_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'inefficiency', label: 'Inefficiency' },
  { id: 'injustice', label: 'Injustice' },
  { id: 'confusion', label: 'Confusion' },
  { id: 'suffering', label: 'Suffering' },
  { id: 'ugliness', label: 'Ugliness' },
  { id: 'waste', label: 'Waste' },
  { id: 'ignorance', label: 'Ignorance' },
  { id: 'disconnection', label: 'Disconnection' },
];

const CAPABILITY_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'communication', label: 'Communication' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'creativity', label: 'Creativity' },
  { id: 'organization', label: 'Organisation' },
  { id: 'empathy', label: 'Empathy' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'building', label: 'Building' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'craft', label: 'Craft' },
];

const PEOPLE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'beginners', label: 'Beginners' },
  { id: 'builders', label: 'Builders' },
  { id: 'strugglers', label: 'Those struggling' },
  { id: 'dreamers', label: 'Dreamers' },
  { id: 'leaders', label: 'Leaders' },
  { id: 'children', label: 'Children' },
  { id: 'elders', label: 'Elders' },
  { id: 'outsiders', label: 'Outsiders' },
];

const CAUSE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'education', label: 'Education' },
  { id: 'health', label: 'Health' },
  { id: 'environment', label: 'Environment' },
  { id: 'poverty', label: 'Poverty' },
  { id: 'creativity', label: 'Creativity' },
  { id: 'technology', label: 'Technology' },
  { id: 'community', label: 'Community' },
  { id: 'justice', label: 'Justice' },
];

const TRANSFORM_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'confused_to_clear', label: 'Confused → clear' },
  { id: 'stuck_to_moving', label: 'Stuck → moving' },
  { id: 'weak_to_strong', label: 'Weak → strong' },
  { id: 'alone_to_connected', label: 'Alone → connected' },
  { id: 'lost_to_purposeful', label: 'Lost → purposeful' },
  { id: 'unwell_to_healthy', label: 'Unwell → healthy' },
];

const LEVEL3_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'low', label: 'Low' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'high', label: 'High' },
];

const FIT_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'poor', label: 'Poor fit' },
  { id: 'partial', label: 'Partial fit' },
  { id: 'strong', label: 'Strong fit' },
];

const TOLERANCE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'love_process', label: 'I love the process' },
  { id: 'tolerate', label: 'I can tolerate it' },
  { id: 'dislike', label: 'I dislike the daily work' },
];

const BEGINNER_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'eager', label: 'Eager to be a beginner' },
  { id: 'willing', label: 'Willing' },
  { id: 'reluctant', label: 'Reluctant' },
];

const CLASSIFICATION_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'core', label: 'Core path' },
  { id: 'experimental', label: 'Experimental path' },
  { id: 'supporting', label: 'Supporting path' },
  { id: 'practical', label: 'Practical path' },
  { id: 'passion', label: 'Passion path' },
  { id: 'mirage', label: 'Mirage path' },
];

const TRIAL_CHOICE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'path_a', label: 'First path' },
  { id: 'path_b', label: 'Second path' },
  { id: 'path_c', label: 'Third path' },
];

export const IKIGAI_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...DOMAIN_OPTIONS,
    ...PROBLEM_OPTIONS,
    ...CAPABILITY_OPTIONS,
    ...PEOPLE_OPTIONS,
    ...CAUSE_OPTIONS,
    ...TRANSFORM_OPTIONS,
    ...LEVEL3_OPTIONS,
    ...FIT_OPTIONS,
    ...TOLERANCE_OPTIONS,
    ...BEGINNER_OPTIONS,
    ...CLASSIFICATION_OPTIONS,
    ...TRIAL_CHOICE_OPTIONS,
  ].map((option) => [option.id, option.label]),
);

function single(questionId: string, prompt: string, options: readonly CompassBlockOption[], required = true): CompassBlockDefinition {
  return { questionId, type: 'single_choice', prompt, required, options: [...options] };
}
function shortText(questionId: string, prompt: string, placeholder: string, required = true): CompassBlockDefinition {
  return { questionId, type: 'short_text', prompt, required, placeholder, maxLength: 120 };
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
  // Stage 1 — Follow the Spark (61–64)
  { order: 1, title: 'Repeated interest', shortTitle: 'Interest', required: true,
    description: 'Curiosity — what you keep returning to.',
    blocks: [single('repeated_interest', 'What do you keep coming back to, with no external pressure?', DOMAIN_OPTIONS)] },
  { order: 2, title: 'Problem that holds attention', shortTitle: 'Problem', required: true,
    blocks: [single('attention_problem', 'Which kind of problem holds your attention?', PROBLEM_OPTIONS)] },
  { order: 3, title: 'Explored freely', shortTitle: 'Explored', required: true,
    blocks: [single('explored_freely', 'What have you explored just because you wanted to?', DOMAIN_OPTIONS)] },
  { order: 4, title: 'Your Spark', shortTitle: 'Spark', required: true,
    blocks: [single('spark_pick', 'Of these, which is your strongest Spark?', DOMAIN_OPTIONS)] },

  // Stage 2 — Find the Gift (65–68)
  { order: 5, title: 'Demonstrated strength', shortTitle: 'Demonstrated', required: true,
    description: 'Capability — what you are good at.',
    blocks: [single('demonstrated_strength', 'What have others repeatedly relied on you for?', CAPABILITY_OPTIONS)] },
  { order: 6, title: 'Emerging strength', shortTitle: 'Emerging', required: true,
    blocks: [single('emerging_strength', 'What are you growing into?', CAPABILITY_OPTIONS)] },
  { order: 7, title: 'Underused strength', shortTitle: 'Underused', required: true,
    blocks: [single('underused_strength', 'What strength do you underuse right now?', CAPABILITY_OPTIONS)] },
  { order: 8, title: 'Your Gift', shortTitle: 'Gift', required: true,
    blocks: [single('gift_pick', 'Which capability could become exceptional?', CAPABILITY_OPTIONS)] },

  // Stage 3 — Find the Need (69–72)
  { order: 9, title: 'People I understand', shortTitle: 'People', required: true,
    description: 'Contribution — who and what you serve.',
    blocks: [single('people_understood', 'Which people do you understand best?', PEOPLE_OPTIONS)] },
  { order: 10, title: 'Problem I care about', shortTitle: 'Care', required: true,
    blocks: [single('problem_cared', 'Which problem do you genuinely care about?', CAUSE_OPTIONS)] },
  { order: 11, title: 'Transformation worth helping', shortTitle: 'Transform', required: true,
    blocks: [single('transformation', 'Which transformation is worth helping create?', TRANSFORM_OPTIONS)] },
  { order: 12, title: 'Your Need', shortTitle: 'Need', required: true,
    blocks: [single('need_pick', 'Which cause is your strongest Need to serve?', CAUSE_OPTIONS)] },

  // Stage 4 — Test viability (73–75) + willingness start (76)
  { order: 13, title: 'Income & opportunity', shortTitle: 'Income', required: true,
    description: 'Viability — practical value.',
    blocks: [single('income_potential', 'Realistic income / opportunity here?', LEVEL3_OPTIONS)] },
  { order: 14, title: 'Access & experience', shortTitle: 'Access', required: true,
    blocks: [single('access_experience', 'How much access or experience do you have?', LEVEL3_OPTIONS)] },
  { order: 15, title: 'Fit with my horizon', shortTitle: 'Fit', required: true,
    blocks: [single('horizon_fit', 'How well does this fit the life you designed (Chapter 3)?', FIT_OPTIONS)] },
  { order: 16, title: 'Tolerance for the process', shortTitle: 'Process', required: true,
    description: 'Willingness — do you want the work, or only the outcome?',
    blocks: [single('process_tolerance', 'How do you feel about the daily, repetitive work?', TOLERANCE_OPTIONS)] },

  // Stage 5 — Willingness, paths, trial (77–80)
  { order: 17, title: 'Willing to be a beginner', shortTitle: 'Beginner', required: true,
    blocks: [single('beginner_willingness', 'Are you willing to be a beginner again?', BEGINNER_OPTIONS)] },
  { order: 18, title: 'Generate three paths', shortTitle: 'Three paths', required: true,
    description: 'Name three distinct directions these forces could combine into.',
    blocks: [
      shortText('path_a', 'First candidate path', 'e.g. Teaching design to beginners', true),
      shortText('path_b', 'Second candidate path (optional)', 'e.g. Building health tools', false),
      shortText('path_c', 'Third candidate path (optional)', 'e.g. Writing about systems', false),
    ] },
  { order: 19, title: 'Choose the Trial', shortTitle: 'Trial', required: true,
    blocks: [
      single('trial_choice', 'Which path deserves a small real-world test first?', TRIAL_CHOICE_OPTIONS),
      single('path_type', 'How would you classify it for now?', CLASSIFICATION_OPTIONS),
      shortText('trial_experiment', 'What is the smallest experiment to test it?', 'e.g. Run one free workshop', true),
    ] },
  { order: 20, title: 'Illuminate the constellation', shortTitle: 'Confirm', required: true,
    description: 'Review your map and seal the chapter.',
    blocks: [
      shortText('ikigai_statement', 'Your Ikigai statement — one line on the direction worth testing.', 'e.g. Help beginners learn design, tested through small workshops.', true),
      { questionId: 'ikigai_review', type: 'review', prompt: 'Review your Spark, Gift, Need and chosen Trial — and any Mirage warning.', required: false },
      { questionId: 'ikigai_confirm', type: 'confirmation', prompt: 'This is a direction worth testing. Illuminate the constellation.', required: true },
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

export const chapter4IkigaiMap: CompassBookChapterDefinition = {
  id: CHAPTER_ID,
  order: 4,
  title: 'The Ikigai Map',
  coreQuestion: 'Which possible directions have enough alignment to deserve a real-world test?',
  visualMetaphor:
    'A constellation map (not a four-circle Venn) of five forces: Curiosity, Capability, Contribution, Viability, Willingness.',
  outputFields: ['Spark', 'Gift', 'Need', 'Trial', 'Mirage warning', 'Chosen experiment'],
  islandRange: [61, 80],
  activities: SEEDS.map(buildActivity),
};
