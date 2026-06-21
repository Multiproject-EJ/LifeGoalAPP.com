/**
 * Chapter 1 — The Living Wheel (Islands 1–20).
 *
 * Core question: Where is my life moving, where is it stuck, and what could
 * improve several areas at once?
 *
 * Pure content definition — no React. Block option ids for life areas are the
 * canonical `LifeWheelCategoryKey` values from
 * `src/features/life-wheel/lifeWheelTaxonomy.ts`. We intentionally do NOT import
 * the taxonomy here (it transitively pulls a .tsx module) — the labels below are
 * short display fallbacks; runtime surfaces resolve canonical labels/emoji from
 * the taxonomy. The ids are the contract that keeps the two aligned.
 */

import type {
  CompassBlockDefinition,
  CompassBlockOption,
  CompassBookActivityDefinition,
  CompassBookChapterDefinition,
  CompassChapterStageIndex,
} from '../types';
import { COMPASS_CURRICULUM_VERSION } from '../types';

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

function areaChoice(questionId: string, prompt: string, required = true): CompassBlockDefinition {
  return { questionId, type: 'single_choice', prompt, required, options: [...LIFE_AREA_OPTIONS] };
}

function areaMultiChoice(questionId: string, prompt: string, required = true): CompassBlockDefinition {
  return { questionId, type: 'multi_choice', prompt, required, options: [...LIFE_AREA_OPTIONS] };
}

/** One 0–10 scale block per life area, e.g. for current/good-enough/minimum scoring. */
function perAreaScales(
  prefix: string,
  prompt: string,
  minLabel: string,
  maxLabel: string,
): CompassBlockDefinition[] {
  return LIFE_AREA_OPTIONS.map((area) => ({
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
  // Stage 1 — Reveal the wheel (1–4)
  {
    order: 1,
    title: 'Your strongest area',
    shortTitle: 'Strongest',
    description: 'Reveal the wheel by naming where life already works.',
    required: true,
    blocks: [areaChoice('strongest_area', 'Which part of life feels most alive right now?')],
  },
  {
    order: 2,
    title: 'Your most strained area',
    shortTitle: 'Strained',
    required: true,
    blocks: [areaChoice('strained_area', 'Which part of life feels most strained?')],
  },
  {
    order: 3,
    title: 'Most mental space',
    shortTitle: 'Mental space',
    required: true,
    blocks: [areaChoice('mental_space_area', 'Which area takes up the most of your mental space?')],
  },
  {
    order: 4,
    title: 'What you avoid',
    shortTitle: 'Avoided',
    required: true,
    blocks: [areaChoice('avoided_area', 'Which area are you quietly avoiding?')],
  },

  // Stage 2 — Score and define good enough (5–8)
  {
    order: 5,
    title: 'Current levels',
    shortTitle: 'Current',
    description: 'Score each area as it is now. Not every area needs to be a 10.',
    required: true,
    blocks: perAreaScales('current', 'How is this area right now', 'Struggling', 'Thriving'),
  },
  {
    order: 6,
    title: 'Good-enough levels',
    shortTitle: 'Good enough',
    description: 'For this season, what level would honestly be good enough?',
    required: true,
    blocks: perAreaScales('good_enough', 'Good-enough level for this season', 'Low', 'High'),
  },
  {
    order: 7,
    title: 'Minimum-safe levels',
    shortTitle: 'Minimum',
    description: 'Below this level, the area becomes a real problem.',
    required: true,
    blocks: perAreaScales('minimum_safe', 'Minimum-safe level', 'Floor', 'Comfortable'),
  },
  {
    order: 8,
    title: 'Desired levels',
    shortTitle: 'Desired',
    description: 'Where you would love this area to be, eventually.',
    required: false,
    blocks: perAreaScales('desired', 'Desired level (later)', 'Modest', 'Ideal'),
  },

  // Stage 3 — Emotional weather (9–12)
  {
    order: 9,
    title: 'Emotional weather',
    shortTitle: 'Weather',
    description: 'The feeling that colours each area.',
    required: true,
    blocks: LIFE_AREA_OPTIONS.map((area) => ({
      questionId: `emotion.${area.id}`,
      type: 'emotion_choice' as const,
      prompt: `When you think about ${area.label}, what do you mostly feel?`,
      required: true,
      options: [...EMOTION_OPTIONS],
    })),
  },
  {
    order: 10,
    title: 'What energises you',
    shortTitle: 'Energy',
    required: true,
    blocks: [areaChoice('energising_area', 'Which area most energises you when it goes well?')],
  },
  {
    order: 11,
    title: 'What protects or warns',
    shortTitle: 'Warning',
    required: true,
    blocks: [
      areaChoice('warning_area', "Which area's discomfort is usually a useful warning for you?"),
    ],
  },
  {
    order: 12,
    title: 'Recurring emotional pattern',
    shortTitle: 'Pattern',
    required: true,
    blocks: [
      {
        questionId: 'emotional_pattern',
        type: 'emotion_choice',
        prompt: 'Which feeling keeps recurring across your life lately?',
        required: true,
        options: [...EMOTION_OPTIONS],
      },
      {
        questionId: 'emotional_pattern_note',
        type: 'reflection',
        prompt: 'Optional: where does that feeling show up most?',
        required: false,
        placeholder: 'A sentence is plenty.',
        maxLength: 280,
      },
    ],
  },

  // Stage 4 — Mechanics and spillover (13–16)
  {
    order: 13,
    title: 'Momentum',
    shortTitle: 'Momentum',
    description: 'Which way each area is currently moving.',
    required: true,
    blocks: LIFE_AREA_OPTIONS.map((area) => ({
      questionId: `momentum.${area.id}`,
      type: 'single_choice' as const,
      prompt: `${area.label} is currently…`,
      required: true,
      options: [...MOMENTUM_OPTIONS],
    })),
  },
  {
    order: 14,
    title: 'Spillover',
    shortTitle: 'Spillover',
    description: 'How strongly progress in each area lifts the others.',
    required: true,
    blocks: perAreaScales(
      'spillover',
      'When this area improves, how much do other areas improve too',
      'Barely',
      'A lot',
    ),
  },
  {
    order: 15,
    title: 'Over- and under-investment',
    shortTitle: 'Investment',
    required: true,
    blocks: [
      areaMultiChoice('overinvested', 'Which areas currently get more attention than they need?', false),
      areaMultiChoice('underinvested', 'Which areas get less attention than they need?', false),
    ],
  },
  {
    order: 16,
    title: 'Name the mechanics',
    shortTitle: 'Mechanics',
    description: 'A first guess at the wheel’s moving parts. You can revise these at the end.',
    required: true,
    blocks: [
      areaChoice('candidate_engine', 'Engine — which area most powers the rest of your life?'),
      areaChoice('candidate_brake', 'Brake — which area most holds you back?'),
      areaChoice('candidate_fragile', 'Fragile Spoke — which area is most at risk if ignored?'),
      areaChoice('candidate_lever', 'Lever — the smallest change that would lift several areas?'),
    ],
  },

  // Stage 5 — Create movement & confirm (17–20)
  {
    order: 17,
    title: 'What to protect',
    shortTitle: 'Protect',
    required: true,
    blocks: [areaMultiChoice('protect_areas', 'Which areas should you protect, not optimise?')],
  },
  {
    order: 18,
    title: 'What to accept',
    shortTitle: 'Accept',
    required: true,
    blocks: [
      areaChoice('accept_area', 'Which area needs acceptance more than effort right now?'),
      {
        questionId: 'accept_note',
        type: 'reflection',
        prompt: 'Optional: what would acceptance look like here?',
        required: false,
        placeholder: 'A sentence is plenty.',
        maxLength: 280,
      },
    ],
  },
  {
    order: 19,
    title: 'One high-leverage next move',
    shortTitle: 'Next move',
    required: true,
    blocks: [
      areaChoice('next_move_area', 'Which area will your next move focus on?'),
      {
        questionId: 'next_move',
        type: 'short_text',
        prompt: 'In one line, what is the single next move?',
        required: true,
        placeholder: 'e.g. Walk 15 minutes after lunch on weekdays.',
        maxLength: 200,
      },
    ],
  },
  {
    order: 20,
    title: 'Confirm the wheel',
    shortTitle: 'Confirm',
    description: 'Review the projected wheel and seal the chapter.',
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
export const CHAPTER1_CURRICULUM_VERSION = COMPASS_CURRICULUM_VERSION;
