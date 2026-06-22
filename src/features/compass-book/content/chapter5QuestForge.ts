/**
 * Chapter 5 — The Quest Forge (Islands 81–100).
 *
 * Core question: Which possibilities deserve commitment now, and what must I
 * intentionally not carry? Pure content. Produces a Primary Quest and the
 * structured material for a (player-approved) goal proposal — it never creates a
 * goal itself.
 */

import type {
  CompassBlockDefinition,
  CompassBlockOption,
  CompassBookActivityDefinition,
  CompassBookChapterDefinition,
  CompassChapterStageIndex,
  CompassPickSource,
} from '../types';
import { LIFE_AREA_OPTIONS } from './chapter1LivingWheel';

const CHAPTER_ID = 'quest_forge' as const;
const START_ISLAND = 81;

const MOTIVE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'desire', label: 'Desire' },
  { id: 'duty', label: 'Duty' },
  { id: 'fear', label: 'Fear' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'guilt', label: 'Guilt' },
  { id: 'curiosity', label: 'Curiosity' },
];

const YESNO_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'unsure', label: 'Unsure' },
];

const PROCESS_OUTCOME_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'process', label: 'The process' },
  { id: 'outcome', label: 'The outcome' },
  { id: 'both', label: 'Both' },
];

const FIT_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'strong', label: 'Strong' },
  { id: 'partial', label: 'Partial' },
  { id: 'poor', label: 'Poor' },
];

const PROTECT_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'protects', label: 'Protects it' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'threatens', label: 'Threatens it' },
];

const RESOURCE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'have', label: 'I have them' },
  { id: 'partial', label: 'Partly' },
  { id: 'lacking', label: 'Lacking' },
];

const CONTROL_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'high', label: 'Mostly me' },
  { id: 'medium', label: 'Shared' },
  { id: 'low', label: 'Mostly external' },
];

const READINESS_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'ready_now', label: 'Ready now' },
  { id: 'begin_small', label: 'Begin small' },
  { id: 'prepare_first', label: 'Prepare first' },
];

const TIMING_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'now', label: 'Now' },
  { id: 'soon', label: 'Soon' },
  { id: 'later', label: 'Later' },
  { id: 'revisit', label: 'Revisit' },
];

const OPPORTUNITY_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'time', label: 'Time' },
  { id: 'money', label: 'Money' },
  { id: 'energy', label: 'Energy' },
  { id: 'attention', label: 'Attention' },
  { id: 'identity', label: 'Identity' },
];

const COST_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'time', label: 'Time' },
  { id: 'money', label: 'Money' },
  { id: 'comfort', label: 'Comfort' },
  { id: 'certainty', label: 'Certainty' },
  { id: 'approval', label: 'Approval' },
];

export const REVIEW_POINT_WEEKS: Record<string, number> = {
  '2_weeks': 2,
  '4_weeks': 4,
  '8_weeks': 8,
  '12_weeks': 12,
};

const REVIEW_POINT_OPTIONS: readonly CompassBlockOption[] = [
  { id: '2_weeks', label: 'In 2 weeks' },
  { id: '4_weeks', label: 'In 4 weeks' },
  { id: '8_weeks', label: 'In 8 weeks' },
  { id: '12_weeks', label: 'In 12 weeks' },
];

const QUEST_REF_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'quest_a', label: 'First quest' },
  { id: 'quest_b', label: 'Second quest' },
  { id: 'quest_c', label: 'Third quest' },
];

const QUEST_REF_NONE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'none', label: 'None' },
  ...QUEST_REF_OPTIONS,
];

export const QUEST_FORGE_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...MOTIVE_OPTIONS,
    ...YESNO_OPTIONS,
    ...PROCESS_OUTCOME_OPTIONS,
    ...FIT_OPTIONS,
    ...PROTECT_OPTIONS,
    ...RESOURCE_OPTIONS,
    ...CONTROL_OPTIONS,
    ...READINESS_OPTIONS,
    ...TIMING_OPTIONS,
    ...OPPORTUNITY_OPTIONS,
    ...COST_OPTIONS,
    ...REVIEW_POINT_OPTIONS,
    ...QUEST_REF_NONE_OPTIONS,
    ...LIFE_AREA_OPTIONS,
  ].map((option) => [option.id, option.label]),
);

function single(questionId: string, prompt: string, options: readonly CompassBlockOption[], required = true): CompassBlockDefinition {
  return { questionId, type: 'single_choice', prompt, required, options: [...options] };
}
function shortText(
  questionId: string,
  prompt: string,
  placeholder: string,
  required = true,
  pickFrom?: CompassPickSource,
): CompassBlockDefinition {
  return { questionId, type: 'short_text', prompt, required, placeholder, maxLength: 140, pickFrom };
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
  // Stage 1 — Gather raw material (81–84)
  { order: 1, title: 'Candidate quest', shortTitle: 'Quest A', required: true,
    description: 'Gather the goals you are considering for this season.',
    blocks: [shortText('quest_a', 'A goal you are considering', 'e.g. Launch a small course', true, 'player_goals')] },
  { order: 2, title: 'Another candidate', shortTitle: 'Quest B', required: false,
    blocks: [shortText('quest_b', 'Another goal (optional)', 'e.g. Run a half marathon', false, 'player_goals')] },
  { order: 3, title: 'A third candidate', shortTitle: 'Quest C', required: false,
    blocks: [shortText('quest_c', 'A third goal (optional)', 'e.g. Save a 6-month buffer', false, 'player_goals')] },
  { order: 4, title: 'Which pulls most', shortTitle: 'Primary', required: true,
    description: 'Your Primary Quest — one main commitment.',
    blocks: [single('primary_candidate', 'Which one deserves the most of you right now?', QUEST_REF_OPTIONS)] },

  // Stage 2 — Test motive (85–88)
  { order: 5, title: 'Why I want it', shortTitle: 'Motive', required: true,
    blocks: [single('motive', 'What is the honest driver?', MOTIVE_OPTIONS)] },
  { order: 6, title: 'Without recognition', shortTitle: 'Recognition', required: true,
    blocks: [single('without_recognition', 'Would you still want it if no one ever knew?', YESNO_OPTIONS)] },
  { order: 7, title: 'Process or outcome', shortTitle: 'Process', required: true,
    blocks: [single('process_outcome', 'Do you want the process, or only the outcome?', PROCESS_OUTCOME_OPTIONS)] },
  { order: 8, title: 'How solid is the drive', shortTitle: 'Drive', required: true,
    blocks: [single('drive_check', 'How solid does this motivation feel?', FIT_OPTIONS)] },

  // Stage 3 — Test alignment & impact (89–92)
  { order: 9, title: 'Fit with my values', shortTitle: 'Values fit', required: true,
    description: 'Compare against your Inner Compass and Horizon.',
    blocks: [single('values_fit', 'Fit with your values (Chapter 2)?', FIT_OPTIONS)] },
  { order: 10, title: 'Fit with my horizon', shortTitle: 'Horizon fit', required: true,
    blocks: [single('horizon_fit', 'Fit with the life you designed (Chapter 3)?', FIT_OPTIONS)] },
  { order: 11, title: 'Life-area impact', shortTitle: 'Impact', required: true,
    blocks: [single('wheel_impact', 'Which life area would it most improve?', LIFE_AREA_OPTIONS)] },
  { order: 12, title: 'Protect or threaten', shortTitle: 'Protect', required: true,
    blocks: [single('protected_check', 'Does it protect or threaten what already works?', PROTECT_OPTIONS)] },

  // Stage 4 — Test reality (93–95) + readiness (96)
  { order: 13, title: 'Resources', shortTitle: 'Resources', required: true,
    blocks: [single('resources', 'Do you have the resources to start?', RESOURCE_OPTIONS)] },
  { order: 14, title: 'Biggest obstacle', shortTitle: 'Obstacle', required: true,
    blocks: [shortText('obstacle', 'What is the single biggest obstacle?', 'e.g. Not enough evening time', true)] },
  { order: 15, title: 'Controllability', shortTitle: 'Control', required: true,
    blocks: [single('controllability', 'How much of this is within your control?', CONTROL_OPTIONS)] },
  { order: 16, title: 'Readiness', shortTitle: 'Readiness', required: true,
    blocks: [single('readiness', 'How ready are you, really?', READINESS_OPTIONS)] },

  // Stage 5 — Timing, cost, portfolio, crest (97–100)
  { order: 17, title: 'Timing & opportunity cost', shortTitle: 'Timing', required: true,
    blocks: [
      single('timing', 'When should this begin?', TIMING_OPTIONS),
      single('opportunity_cost', 'If you choose this, what gets less of you?', OPPORTUNITY_OPTIONS),
    ] },
  { order: 18, title: 'The quest portfolio', shortTitle: 'Portfolio', required: true,
    description: 'Decide what supports the Primary Quest, and what to release.',
    blocks: [
      single('support_quest', 'Which other quest best supports the primary one?', QUEST_REF_NONE_OPTIONS),
      single('release_quest', 'Which quest will you consciously release for now?', QUEST_REF_NONE_OPTIONS),
    ] },
  { order: 19, title: 'The accepted cost', shortTitle: 'Cost', required: true,
    blocks: [
      single('accepted_cost', 'What cost do you accept to pursue this?', COST_OPTIONS),
      shortText('protected_flame', 'What will you protect no matter what? (Protected Flame)', 'e.g. Sleep and weekends with family', true),
    ] },
  { order: 20, title: 'Forge the crest', shortTitle: 'Confirm', required: true,
    description: 'Forge your Quest Crest and seal the chapter.',
    blocks: [
      shortText('calling', 'Why this quest matters (your Calling)', 'e.g. To build work that helps and lasts', true),
      shortText('first_milestone', 'The first milestone', 'e.g. Publish the first lesson', true),
      shortText('success_evidence', 'How will you know it is working?', 'e.g. 10 people complete it', true),
      single('review_point', 'When will you review this quest?', REVIEW_POINT_OPTIONS),
      { questionId: 'forge_review', type: 'review', prompt: 'Review your Primary Quest, Calling, First Milestone and accepted cost.', required: false },
      { questionId: 'forge_confirm', type: 'confirmation', prompt: 'This is my Primary Quest for this season. Forge the crest.', required: true },
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

export const chapter5QuestForge: CompassBookChapterDefinition = {
  id: CHAPTER_ID,
  order: 5,
  title: 'The Quest Forge',
  coreQuestion:
    'Which possibilities deserve commitment now, and what must I intentionally not carry?',
  visualMetaphor: 'A forge chamber with a central Quest Crest, a maintenance ring and a Not-Now vault.',
  outputFields: ['Calling', 'First Milestone', 'Protected Flame', 'Cost Accepted', 'Primary Quest', 'Review point'],
  islandRange: [81, 100],
  activities: SEEDS.map(buildActivity),
};
