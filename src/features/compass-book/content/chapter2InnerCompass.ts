/**
 * Chapter 2 — The Inner Compass (Islands 21–40).
 *
 * Core question: What truly guides me, what gives me life, what do I need, and
 * what pulls me off course?
 *
 * Pure content. Four directions: North = values, East = energy/life spark,
 * South = needs, West = drift/shadow. Option ids are stable; labels here are the
 * display source of truth for this chapter (resolved by the graphic/projector
 * via INNER_COMPASS_LABELS).
 */

import type {
  CompassBlockDefinition,
  CompassBlockOption,
  CompassBookActivityDefinition,
  CompassBookChapterDefinition,
  CompassChapterStageIndex,
} from '../types';

const CHAPTER_ID = 'inner_compass' as const;
const START_ISLAND = 21;

export const VALUE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'freedom', label: 'Freedom' },
  { id: 'growth', label: 'Growth' },
  { id: 'connection', label: 'Connection' },
  { id: 'honesty', label: 'Honesty' },
  { id: 'security', label: 'Security' },
  { id: 'creativity', label: 'Creativity' },
  { id: 'impact', label: 'Impact' },
  { id: 'mastery', label: 'Mastery' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'kindness', label: 'Kindness' },
  { id: 'justice', label: 'Justice' },
  { id: 'faith', label: 'Faith' },
];

export const ENERGY_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'creating', label: 'Creating something' },
  { id: 'learning', label: 'Learning something' },
  { id: 'helping', label: 'Helping someone' },
  { id: 'leading', label: 'Leading a group' },
  { id: 'building', label: 'Building something' },
  { id: 'exploring', label: 'Exploring somewhere' },
  { id: 'connecting', label: 'Connecting deeply' },
  { id: 'performing', label: 'Performing / competing' },
];

export const SEEKING_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'mastery', label: 'Mastery' },
  { id: 'connection', label: 'Connection' },
  { id: 'novelty', label: 'Novelty' },
  { id: 'recognition', label: 'Recognition' },
  { id: 'calm', label: 'Calm' },
  { id: 'impact', label: 'Impact' },
  { id: 'freedom', label: 'Freedom' },
  { id: 'meaning', label: 'Meaning' },
];

export const NEED_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'safety', label: 'Safety' },
  { id: 'autonomy', label: 'Autonomy' },
  { id: 'belonging', label: 'Belonging' },
  { id: 'rest', label: 'Rest' },
  { id: 'challenge', label: 'Challenge' },
  { id: 'clarity', label: 'Clarity' },
  { id: 'recognition', label: 'Recognition' },
  { id: 'novelty', label: 'Novelty' },
  { id: 'meaning', label: 'Meaning' },
];

export const STRENGTH_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'empathy', label: 'Empathy' },
  { id: 'stability', label: 'Stability' },
  { id: 'ambition', label: 'Ambition' },
  { id: 'independence', label: 'Independence' },
  { id: 'discipline', label: 'Discipline' },
  { id: 'curiosity', label: 'Curiosity' },
  { id: 'optimism', label: 'Optimism' },
  { id: 'decisiveness', label: 'Decisiveness' },
];

export const SHADOW_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'people_pleasing', label: 'People-pleasing' },
  { id: 'stagnation', label: 'Stagnation' },
  { id: 'overextension', label: 'Overextension' },
  { id: 'isolation', label: 'Isolation' },
  { id: 'rigidity', label: 'Rigidity' },
  { id: 'scattered', label: 'Scatteredness' },
  { id: 'denial', label: 'Denial' },
  { id: 'impatience', label: 'Impatience' },
];

export const COUNTERBALANCE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'boundaries', label: 'Boundaries' },
  { id: 'activation', label: 'Activation' },
  { id: 'sufficiency', label: 'Sufficiency' },
  { id: 'receiving_support', label: 'Receiving support' },
  { id: 'flexibility', label: 'Flexibility' },
  { id: 'focus', label: 'Focus' },
  { id: 'realism', label: 'Realism' },
  { id: 'patience', label: 'Patience' },
];

export const DRIFT_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'comparison', label: 'Comparison' },
  { id: 'overcommitment', label: 'Overcommitment' },
  { id: 'fear_of_judgment', label: 'Fear of judgment' },
  { id: 'distraction', label: 'Distraction' },
  { id: 'perfectionism', label: 'Perfectionism' },
  { id: 'burnout', label: 'Burnout' },
  { id: 'avoidance', label: 'Avoidance' },
  { id: 'self_doubt', label: 'Self-doubt' },
];

const ALIGNMENT_SIGNAL_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'energised', label: 'Energised' },
  { id: 'present', label: 'Present' },
  { id: 'proud', label: 'Proud' },
  { id: 'clear', label: 'Clear' },
  { id: 'generous', label: 'Generous' },
  { id: 'calm', label: 'Calm' },
];

/** Combined id → label map for projector/graphic resolution. Later pools win on
 * id collisions, which is fine because colliding ids share a label. */
export const INNER_COMPASS_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...VALUE_OPTIONS,
    ...ENERGY_OPTIONS,
    ...SEEKING_OPTIONS,
    ...NEED_OPTIONS,
    ...STRENGTH_OPTIONS,
    ...SHADOW_OPTIONS,
    ...COUNTERBALANCE_OPTIONS,
    ...DRIFT_OPTIONS,
    ...ALIGNMENT_SIGNAL_OPTIONS,
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
  // Stage 1 — Moments that reveal me (21–24)
  { order: 1, title: 'Most alive moment', shortTitle: 'Most alive', required: true,
    description: 'East — what gives you life and energy.',
    blocks: [single('alive_context', 'When you felt most alive, what were you doing?', ENERGY_OPTIONS)] },
  { order: 2, title: 'Proud of my behaviour', shortTitle: 'Proud', required: true,
    blocks: [single('proud_value', 'Think of a time you were proud of how you acted. Which value did it honour?', VALUE_OPTIONS)] },
  { order: 3, title: 'Felt unlike myself', shortTitle: 'Unlike me', required: true,
    blocks: [single('unlike_self', 'When you felt unlike yourself, what had taken over?', SHADOW_OPTIONS)] },
  { order: 4, title: 'What I keep seeking', shortTitle: 'Seeking', required: true,
    blocks: [single('seeking', 'What experience do you keep reaching for?', SEEKING_OPTIONS)] },

  // Stage 2 — Values in action (25–28)
  { order: 5, title: 'Protect without recognition', shortTitle: 'Protect', required: true,
    blocks: [single('protected_value', 'What would you protect even if no one ever noticed?', VALUE_OPTIONS)] },
  { order: 6, title: "Won't trade for success", shortTitle: 'Non-negotiable', required: true,
    description: 'North — your core values. Choose up to three.',
    blocks: [multi('core_values', 'Which values would you never trade for success?', VALUE_OPTIONS)] },
  { order: 7, title: 'Shows in my behaviour', shortTitle: 'In behaviour', required: true,
    blocks: [single('behavioral_value', 'Which value actually shows up in how you live right now?', VALUE_OPTIONS)] },
  { order: 8, title: 'Currently missing', shortTitle: 'Missing', required: true,
    blocks: [single('missing_value', 'Which value you care about feels missing lately?', VALUE_OPTIONS)] },

  // Stage 3 — Needs (29–32)
  { order: 9, title: 'Foundational needs', shortTitle: 'Foundations', required: true,
    description: 'South — what you need to function well.',
    blocks: [multi('foundational_needs', 'Which of these do you most need to function?',
      NEED_OPTIONS.filter((n) => ['safety', 'autonomy', 'belonging', 'rest'].includes(n.id)))] },
  { order: 10, title: 'Growth needs', shortTitle: 'Growth needs', required: true,
    blocks: [multi('growth_needs', 'Which of these help you grow?',
      NEED_OPTIONS.filter((n) => ['challenge', 'clarity', 'recognition', 'novelty', 'meaning'].includes(n.id)))] },
  { order: 11, title: 'Most neglected need', shortTitle: 'Neglected', required: true,
    blocks: [single('neglected_need', 'Which need is most neglected right now?', NEED_OPTIONS)] },
  { order: 12, title: 'Non-negotiable need', shortTitle: 'Essential', required: true,
    blocks: [single('essential_need', 'Which need is truly non-negotiable for you?', NEED_OPTIONS)] },

  // Stage 4 — Strength and shadow (33–36)
  { order: 13, title: 'Primary strength', shortTitle: 'Strength', required: true,
    blocks: [single('strength', 'What is your most natural strength?', STRENGTH_OPTIONS)] },
  { order: 14, title: 'When strength overextends', shortTitle: 'Overused', required: true,
    blocks: [single('overuse', 'When that strength is overused, what does it become?', SHADOW_OPTIONS)] },
  { order: 15, title: 'Shadow pattern', shortTitle: 'Shadow', required: true,
    description: 'West — what pulls you off course.',
    blocks: [single('shadow', 'What recurring shadow pattern do you fall into?', SHADOW_OPTIONS)] },
  { order: 16, title: 'Missing counterbalance', shortTitle: 'Counterbalance', required: true,
    blocks: [single('counterbalance', 'What counterbalance would help you most?', COUNTERBALANCE_OPTIONS)] },

  // Stage 5 — Alignment, drift, set the compass (37–40)
  { order: 17, title: 'Signs of alignment', shortTitle: 'Alignment', required: true,
    blocks: [multi('alignment_signals', 'How do you know when you are aligned?', ALIGNMENT_SIGNAL_OPTIONS)] },
  { order: 18, title: 'What pulls me off course', shortTitle: 'Drift', required: true,
    blocks: [single('drift_cause', 'What most often pulls you off your own direction?', DRIFT_OPTIONS)] },
  { order: 19, title: 'Boundary I need', shortTitle: 'Boundary', required: true,
    blocks: [
      {
        questionId: 'guardian_boundary',
        type: 'short_text',
        prompt: 'What boundary would protect your direction? (one line)',
        required: true,
        placeholder: 'e.g. No new commitments until the current one ships.',
        maxLength: 200,
      },
    ] },
  { order: 20, title: 'Set the compass', shortTitle: 'Confirm', required: true,
    description: 'Review your compass and seal the chapter.',
    blocks: [
      {
        questionId: 'compass_statement',
        type: 'short_text',
        prompt: 'Your Compass statement — one sentence on what guides you.',
        required: true,
        placeholder: 'e.g. Create freely, protect rest, return to honesty.',
        maxLength: 200,
      },
      { questionId: 'compass_review', type: 'review', prompt: 'Review True North, Life Spark, Shadow Pull and your Guardian Boundary.', required: false },
      { questionId: 'compass_confirm', type: 'confirmation', prompt: 'This reflects what guides me. Set the Inner Compass.', required: true },
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

export const chapter2InnerCompass: CompassBookChapterDefinition = {
  id: CHAPTER_ID,
  order: 2,
  title: 'The Inner Compass',
  coreQuestion:
    'What truly guides me, what gives me life, what do I need, and what pulls me off course?',
  visualMetaphor:
    'A four-direction compass: North = values, East = energy, South = needs, West = drift.',
  outputFields: ['True North', 'Life Spark', 'Shadow Pull', 'Guardian Boundary', 'Compass statement'],
  islandRange: [21, 40],
  activities: SEEDS.map(buildActivity),
};
