/**
 * Chapter 1 — The Living Wheel (Islands 1–20).
 *
 * Core question: Where is my life moving, where is it stuck, and what could
 * improve several areas at once?
 *
 * Pure content. Block option ids for life areas are the canonical
 * `LifeWheelCategoryKey` values from
 * `src/features/life-wheel/lifeWheelTaxonomy.ts`. We intentionally do NOT import
 * the taxonomy here (it transitively pulls a .tsx module) — the labels below are
 * short display fallbacks; runtime surfaces resolve canonical labels/emoji from
 * the taxonomy. The ids are the contract that keeps the two aligned.
 *
 * Layout note: the chapter is sized for in-game answering at the Island Run
 * Wisdom stop (with Habit-stop overflow), so every island holds at most 4 input
 * blocks. The eight life areas are scored in two groups of four across paired
 * islands. The Living Wheel projector reads answers by questionId, so this
 * distribution does not affect it.
 */

import type {
  CompassBlockDefinition,
  CompassBlockOption,
  CompassBookActivityDefinition,
  CompassBookChapterDefinition,
  CompassChapterStageIndex,
} from '../types';
import { getCompassChapterMethodVersion } from '../types';

const CHAPTER_ID = 'living_wheel' as const;

/** Canonical Life Wheel area keys (= LifeWheelCategoryKey). Order matches taxonomy. */
export const LIFE_AREA_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'health_fitness', label: 'Health' },
  { id: 'spirituality_community', label: 'Mind' },
  { id: 'career_development', label: 'Work' },
  { id: 'finance_wealth', label: 'Money' },
  { id: 'love_relations', label: 'Love' },
  { id: 'family_friends', label: 'Connections' },
  { id: 'living_spaces', label: 'Home' },
  { id: 'fun_creativity', label: 'Fun' },
] as const;

/** Group A = the "core four"; Group B = the "life four". Used to keep each island ≤4 inputs. */
const GROUP_A: readonly CompassBlockOption[] = LIFE_AREA_OPTIONS.slice(0, 4);
const GROUP_B: readonly CompassBlockOption[] = LIFE_AREA_OPTIONS.slice(4, 8);

const EMOTION_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'joy', label: 'Joy' },
  { id: 'calm', label: 'Calm' },
  { id: 'pride', label: 'Pride' },
  { id: 'hope', label: 'Hope' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'restless', label: 'Restless' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'frustrated', label: 'Frustrated' },
  { id: 'sad', label: 'Sad' },
  { id: 'drained', label: 'Drained' },
  { id: 'numb', label: 'Numb' },
];

const MOMENTUM_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'rising', label: 'Rising' },
  { id: 'flat', label: 'Flat' },
  { id: 'declining', label: 'Declining' },
];

const CONFIDENCE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'tentative', label: 'Tentative — first impression' },
  { id: 'plausible', label: 'Plausible — some evidence' },
  { id: 'strong', label: 'Strong — repeated evidence' },
];

const REVIEW_TRIGGER_OPTIONS: readonly CompassBlockOption[] = [
  { id: '2_weeks', label: 'After 2 weeks of testing' },
  { id: '4_weeks', label: 'After 4 weeks' },
  { id: 'season_change', label: 'When this season changes' },
  { id: 'major_change', label: 'After a major life change' },
];

function evidence(questionId: string, prompt: string, placeholder: string): CompassBlockDefinition {
  return {
    questionId,
    type: 'short_text',
    prompt,
    required: true,
    placeholder,
    helpText: 'A private phrase is enough. Name what happened, not what it says about you.',
    maxLength: 180,
  };
}

function areaChoice(questionId: string, prompt: string): CompassBlockDefinition {
  return {
    questionId,
    type: 'single_choice',
    prompt,
    required: true,
    options: [...LIFE_AREA_OPTIONS, { id: 'no_match', label: 'No clear match' }],
  };
}

/** One 0–10 scale block per supplied life area (questionId = `${prefix}.${areaId}`). */
function perAreaScales(
  prefix: string,
  prompt: string,
  minLabel: string,
  maxLabel: string,
  areas: readonly CompassBlockOption[],
): CompassBlockDefinition[] {
  return areas.map((area) => ({
    questionId: `${prefix}.${area.id}`,
    type: 'scale' as const,
    prompt: `${prompt} — ${area.label}`,
    required: true,
    min: 0,
    max: 10,
    minLabel,
    maxLabel,
  }));
}

function perAreaEmotion(areas: readonly CompassBlockOption[]): CompassBlockDefinition[] {
  return areas.map((area) => ({
    questionId: `emotion.${area.id}`,
    type: 'emotion_choice' as const,
    prompt: `When you think about ${area.label}, what do you mostly feel?`,
    required: true,
    options: [...EMOTION_OPTIONS],
  }));
}

function perAreaMomentum(areas: readonly CompassBlockOption[]): CompassBlockDefinition[] {
  return areas.map((area) => ({
    questionId: `momentum.${area.id}`,
    type: 'single_choice' as const,
    prompt: `${area.label} is currently…`,
    required: true,
    options: [...MOMENTUM_OPTIONS],
  }));
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
  completionMessage?: string;
  required: boolean;
  blocks: CompassBlockDefinition[];
};

const SEEDS: ActivitySeed[] = [
  // Stage 1 — Reveal the wheel (1–4)
  {
    order: 1,
    title: 'A moment life worked',
    shortTitle: 'Strongest',
    description: 'Start with one recent scene. The label comes second.',
    required: true,
    blocks: [
      evidence('strongest_evidence', 'Recall a recent moment when life felt unusually steady or alive. What was happening?', 'e.g. Cooking with friends after a calm workday'),
      areaChoice('strongest_area', 'Which spoke does that moment most clearly belong to?'),
    ],
  },
  {
    order: 2,
    title: 'A moment of strain',
    shortTitle: 'Strained',
    required: true,
    blocks: [
      evidence('strained_evidence', 'Recall a recent moment when life felt stretched or costly. What happened?', 'e.g. I cancelled plans because work had emptied me'),
      areaChoice('strained_area', 'Which spoke carried most of that strain?'),
    ],
  },
  {
    order: 3,
    title: 'What keeps returning',
    shortTitle: 'Mental space',
    required: true,
    blocks: [
      evidence('mental_space_evidence', 'What thought, decision, or unfinished concern has repeatedly returned this week?', 'e.g. Whether I can afford to change roles'),
      areaChoice('mental_space_area', 'Which spoke is using that mental space?'),
    ],
  },
  {
    order: 4,
    title: 'The unopened door',
    shortTitle: 'Avoided',
    description: 'Avoidance can mean fear, fatigue, low priority, or poor timing. We will not assume which.',
    completionMessage: 'First-impression map complete. Next, all eight spokes get an equal scan.',
    required: true,
    blocks: [
      evidence('avoided_evidence', 'What small task, conversation, or decision have you repeatedly postponed?', 'e.g. Opening the pension statement'),
      areaChoice('avoided_area', 'Which spoke does that unopened door belong to?'),
    ],
  },

  // Stage 2 — Score now & good enough (5–8), four areas per island
  {
    order: 5,
    title: 'Current levels — core four',
    shortTitle: 'Current A',
    description: 'Score each area as it is now. Not every area needs to be a 10.',
    required: true,
    blocks: perAreaScales('current', 'How is this area right now', 'Struggling', 'Thriving', GROUP_A),
  },
  {
    order: 6,
    title: 'Current levels — life four',
    shortTitle: 'Current B',
    required: true,
    blocks: perAreaScales('current', 'How is this area right now', 'Struggling', 'Thriving', GROUP_B),
  },
  {
    order: 7,
    title: 'Good-enough — core four',
    shortTitle: 'Enough A',
    description: 'For this season, what level would honestly be good enough?',
    required: true,
    blocks: perAreaScales('good_enough', 'Good-enough level for this season', 'Low', 'High', GROUP_A),
  },
  {
    order: 8,
    title: 'Good-enough — life four',
    shortTitle: 'Enough B',
    required: true,
    completionMessage: 'The useful gap is now visible: not “perfect versus now,” but “good enough for this season versus now.”',
    blocks: perAreaScales('good_enough', 'Good-enough level for this season', 'Low', 'High', GROUP_B),
  },

  // Stage 3 — Minimum-safe (9–10) & emotional weather (11–12)
  {
    order: 9,
    title: 'Minimum-safe — core four',
    shortTitle: 'Minimum A',
    description: 'Below this level, the area becomes a real problem.',
    required: true,
    blocks: perAreaScales('minimum_safe', 'Minimum-safe level', 'Floor', 'Comfortable', GROUP_A),
  },
  {
    order: 10,
    title: 'Minimum-safe — life four',
    shortTitle: 'Minimum B',
    required: true,
    blocks: perAreaScales('minimum_safe', 'Minimum-safe level', 'Floor', 'Comfortable', GROUP_B),
  },
  {
    order: 11,
    title: 'Emotional weather — core four',
    shortTitle: 'Weather A',
    description: 'The feeling that colours each area.',
    required: true,
    blocks: perAreaEmotion(GROUP_A),
  },
  {
    order: 12,
    title: 'Emotional weather — life four',
    shortTitle: 'Weather B',
    required: true,
    completionMessage: 'Emotional weather added. It colours the map, but it does not define the territory.',
    blocks: perAreaEmotion(GROUP_B),
  },

  // Stage 4 — Momentum (13–14) & spillover (15–16)
  {
    order: 13,
    title: 'Momentum — core four',
    shortTitle: 'Momentum A',
    description: 'Which way each area is currently moving.',
    required: true,
    blocks: perAreaMomentum(GROUP_A),
  },
  {
    order: 14,
    title: 'Momentum — life four',
    shortTitle: 'Momentum B',
    required: true,
    blocks: perAreaMomentum(GROUP_B),
  },
  {
    order: 15,
    title: 'Spillover — core four',
    shortTitle: 'Spillover A',
    description: 'How strongly progress in each area lifts the others.',
    required: true,
    blocks: perAreaScales('spillover', 'When this improves, how much do other areas improve', 'Barely', 'A lot', GROUP_A),
  },
  {
    order: 16,
    title: 'Spillover — life four',
    shortTitle: 'Spillover B',
    required: true,
    completionMessage: 'Scan complete. The book can now offer mechanics as hypotheses for you to challenge.',
    blocks: perAreaScales('spillover', 'When this improves, how much do other areas improve', 'Barely', 'A lot', GROUP_B),
  },

  // Stage 5 — Mechanics & confirm (17–20)
  {
    order: 17,
    title: 'Pattern & Engine',
    shortTitle: 'Pattern',
    description: 'Predict first, then compare your answer with the pattern drawn by the wheel.',
    required: true,
    blocks: [
      {
        questionId: 'emotional_pattern',
        type: 'emotion_choice',
        prompt: 'Which feeling keeps recurring across your life lately?',
        required: true,
        options: [...EMOTION_OPTIONS],
      },
      areaChoice('candidate_engine', 'Engine hypothesis — which spoke seems to help several others when it is healthy?'),
      singleChoice('wheel_confidence', 'How much real-life evidence supports that reading?', CONFIDENCE_OPTIONS),
    ],
  },
  {
    order: 18,
    title: 'Brake & Fragile Spoke',
    shortTitle: 'Brake',
    required: true,
    blocks: [
      areaChoice('candidate_brake', 'Brake hypothesis — which strained spoke seems to tax other areas?'),
      areaChoice('candidate_fragile', 'Fragile Spoke hypothesis — which area most needs protection this season?'),
      {
        questionId: 'wheel_counterevidence',
        type: 'short_text',
        prompt: 'What fact does not fit this reading? (optional but useful)',
        required: false,
        placeholder: 'e.g. Work is strained, but it does not actually harm home life',
        maxLength: 180,
      },
    ],
  },
  {
    order: 19,
    title: 'Lever & next move',
    shortTitle: 'Lever',
    required: true,
    blocks: [
      areaChoice('candidate_lever', 'Lever hypothesis — where could a small experiment plausibly help more than one spoke?'),
      areaChoice('next_move_area', 'Which area will your next move focus on?'),
      {
        questionId: 'next_move',
        type: 'short_text',
        // Mid-chapter free-text is optional: the two area taps above carry the
        // required signal. Players who want to name the move still can, and the
        // finale statement (island 20) remains the one required line.
        required: false,
        prompt: 'Design a small test, not a life overhaul. What will you try? (optional)',
        placeholder: 'e.g. Walk 15 minutes after lunch on weekdays.',
        maxLength: 200,
      },
    ],
  },
  {
    order: 20,
    title: 'Confirm the wheel',
    shortTitle: 'Confirm',
    description: 'Preserve a dated working model. You are sealing the reading, not declaring permanent truth.',
    completionMessage: 'Wheel preserved. You now have a testable reading, a counterweight, and a reason to revisit it.',
    required: true,
    blocks: [
      {
        questionId: 'wheel_statement',
        type: 'short_text',
        prompt: 'Your Wheel statement — one sentence that captures this season.',
        required: true,
        placeholder: 'e.g. Steady the body, protect home, push gently on work.',
        maxLength: 200,
      },
      singleChoice('wheel_review_trigger', 'When should this reading be reviewed?', REVIEW_TRIGGER_OPTIONS),
      {
        questionId: 'wheel_review',
        type: 'review',
        prompt: 'Review the proposed Engine, Brake, Fragile Spoke and Lever before confirming.',
        required: false,
      },
      {
        questionId: 'wheel_confirm',
        type: 'confirmation',
        prompt: 'This reflects my life right now. Seal the Living Wheel.',
        required: true,
      },
    ],
  },
];

function buildActivity(seed: ActivitySeed): CompassBookActivityDefinition {
  return {
    id: `${CHAPTER_ID}.a${String(seed.order).padStart(2, '0')}`,
    chapterId: CHAPTER_ID,
    islandNumber: seed.order, // Chapter 1 occupies islands 1..20
    order: seed.order,
    stage: stageForOrder(seed.order),
    title: seed.title,
    shortTitle: seed.shortTitle,
    description: seed.description,
    completionMessage: seed.completionMessage,
    required: seed.required,
    authored: true,
    blocks: seed.blocks,
  };
}

export const chapter1LivingWheel: CompassBookChapterDefinition = {
  id: CHAPTER_ID,
  order: 1,
  title: 'The Living Wheel',
  coreQuestion:
    'Where is my life moving, where is it stuck, and what could improve several areas at once?',
  visualMetaphor: 'A mechanical/magical life wheel of the eight life areas with layered rings.',
  outputFields: [
    'Engine',
    'Brake',
    'Fragile Spoke',
    'Lever',
    'Current season',
    'Dominant emotional pattern',
    'Next move',
    'Wheel statement',
  ],
  islandRange: [1, 20],
  activities: SEEDS.map(buildActivity),
};

/** Re-exported so the curriculum version is visible at the chapter module boundary. */
export const CHAPTER1_CURRICULUM_VERSION = getCompassChapterMethodVersion(CHAPTER_ID);

function singleChoice(
  questionId: string,
  prompt: string,
  options: readonly CompassBlockOption[],
): CompassBlockDefinition {
  return { questionId, type: 'single_choice', prompt, required: true, options: [...options] };
}
