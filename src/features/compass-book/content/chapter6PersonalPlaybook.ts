/**
 * Chapter 6 — The Personal Playbook (Islands 101–120).
 *
 * Core question: How do I personally begin, continue, adapt, recover, and stay
 * oriented? Pure content. Seven systems (Start Engine, Momentum Loop, Minimum
 * Mode, Warning Lights, Environment Rules, Recovery Route, Weekly Compass Check)
 * plus a concrete habit design that powers a (player-approved) habit proposal —
 * it never creates a habit itself.
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

const CHAPTER_ID = 'personal_playbook' as const;
const START_ISLAND = 101;

const DIFFERENCE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'clear_why', label: 'A clear why' },
  { id: 'small_enough', label: 'It was small enough' },
  { id: 'good_environment', label: 'A good environment' },
  { id: 'accountability', label: 'Accountability' },
  { id: 'identity', label: 'It fit my identity' },
  { id: 'timing', label: 'Good timing' },
];

const START_STYLE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'clarity', label: 'Clarity starter' },
  { id: 'momentum', label: 'Momentum starter' },
  { id: 'meaning', label: 'Meaning starter' },
  { id: 'deadline', label: 'Deadline starter' },
  { id: 'social', label: 'Social starter' },
  { id: 'ritual', label: 'Ritual starter' },
  { id: 'curiosity', label: 'Curiosity starter' },
];

const CUE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'after_waking', label: 'After waking' },
  { id: 'after_meal', label: 'After a meal' },
  { id: 'after_work', label: 'After work' },
  { id: 'specific_time', label: 'At a set time' },
  { id: 'before_bed', label: 'Before bed' },
  { id: 'after_trigger', label: 'After an existing habit' },
];

const MOMENTUM_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'visible_progress', label: 'Visible progress' },
  { id: 'small_wins', label: 'Small wins' },
  { id: 'mastery', label: 'Mastery' },
  { id: 'variety', label: 'Variety' },
  { id: 'contribution', label: 'Contribution' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'accountability', label: 'Accountability' },
  { id: 'identity', label: 'Identity' },
];

const RETURN_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'next_morning', label: 'Next morning' },
  { id: 'next_session', label: 'Next session' },
  { id: 'after_two_misses', label: 'After two misses' },
  { id: 'weekly_review', label: 'At weekly review' },
];

const WARNING_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'skipping_minimum', label: 'Skipping the minimum' },
  { id: 'dreading_it', label: 'Dreading it' },
  { id: 'cutting_sleep', label: 'Cutting sleep' },
  { id: 'irritable', label: 'Getting irritable' },
  { id: 'avoiding', label: 'Avoiding it' },
  { id: 'numb', label: 'Going numb' },
];

const WARNING_RESPONSE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'pause', label: 'Pause briefly' },
  { id: 'reduce', label: 'Reduce the load' },
  { id: 'talk', label: 'Talk to someone' },
  { id: 'rest', label: 'Rest first' },
  { id: 'reassess', label: 'Reassess the plan' },
];

const ENV_RULE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'reveal', label: 'Reveal (make it visible)' },
  { id: 'prepare', label: 'Prepare (set it up)' },
  { id: 'protect', label: 'Protect (guard the time)' },
  { id: 'obstruct', label: 'Obstruct (add friction to distractions)' },
];

const RECOVERY_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'return', label: 'Return (same plan)' },
  { id: 'reduce', label: 'Reduce (smaller)' },
  { id: 'redesign', label: 'Redesign' },
  { id: 'pause', label: 'Pause' },
  { id: 'release', label: 'Release' },
];

const WEEKLY_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'what_moved', label: 'What moved?' },
  { id: 'what_stuck', label: 'What got stuck?' },
  { id: 'what_energised', label: 'What gave energy?' },
  { id: 'what_drained', label: 'What drained energy?' },
  { id: 'what_smaller', label: 'What should get smaller?' },
  { id: 'focus_next', label: 'What deserves focus next?' },
];

export const PLAYBOOK_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...DIFFERENCE_OPTIONS,
    ...START_STYLE_OPTIONS,
    ...CUE_OPTIONS,
    ...MOMENTUM_OPTIONS,
    ...RETURN_OPTIONS,
    ...WARNING_OPTIONS,
    ...WARNING_RESPONSE_OPTIONS,
    ...ENV_RULE_OPTIONS,
    ...RECOVERY_OPTIONS,
    ...WEEKLY_OPTIONS,
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
  // Stage 1 — Study previous movement (101–103) + Start Engine (104)
  { order: 1, title: 'Something I sustained', shortTitle: 'Sustained', required: true,
    description: 'Study what has worked before.',
    blocks: [shortText('sustained_effort', 'Name something you actually sustained', 'e.g. Morning walks for a year', true, 'player_habits')] },
  { order: 2, title: 'Something I abandoned', shortTitle: 'Abandoned', required: true,
    blocks: [shortText('abandoned_effort', 'Name something you abandoned', 'e.g. A nightly journaling habit', true, 'player_habits')] },
  { order: 3, title: 'What made the difference', shortTitle: 'Difference', required: true,
    blocks: [single('difference', 'What made the difference between them?', DIFFERENCE_OPTIONS)] },
  { order: 4, title: 'My Start Engine', shortTitle: 'Start Engine', required: true,
    description: 'What helps you begin.',
    blocks: [single('start_style', 'What helps you actually start?', START_STYLE_OPTIONS)] },

  // Stage 2 — Start cue, Momentum Loop, the habit (105–108)
  { order: 5, title: 'First small step', shortTitle: 'First step', required: true,
    blocks: [shortText('first_step', 'The smallest first step that gets you going', 'e.g. Put on shoes', true)] },
  { order: 6, title: 'Cue', shortTitle: 'Cue', required: true,
    blocks: [single('start_cue', 'When will this happen?', CUE_OPTIONS)] },
  { order: 7, title: 'My Momentum Loop', shortTitle: 'Momentum', required: true,
    description: 'What keeps you going.',
    blocks: [single('momentum_signal', 'What keeps you engaged over time?', MOMENTUM_OPTIONS)] },
  { order: 8, title: 'The habit', shortTitle: 'The habit', required: true,
    description: 'One habit that moves your Primary Quest.',
    blocks: [shortText('the_habit', 'The normal version of the habit', 'e.g. Write for 30 minutes', true, 'player_habits')] },

  // Stage 3 — Completion + Minimum Mode (109–112)
  { order: 9, title: 'What counts as done', shortTitle: 'Done', required: true,
    blocks: [shortText('completion_evidence', 'What clearly counts as done?', 'e.g. One paragraph saved', true)] },
  { order: 10, title: 'Small version', shortTitle: 'Small', required: true,
    description: 'Minimum Mode — for busy days.',
    blocks: [shortText('small_version', 'The small version (busy day)', 'e.g. Write for 5 minutes', true)] },
  { order: 11, title: 'Minimum version', shortTitle: 'Minimum', required: true,
    blocks: [shortText('minimum_version', 'The minimum version (hard day)', 'e.g. Open the doc, one sentence', true)] },
  { order: 12, title: 'Return trigger', shortTitle: 'Return', required: true,
    blocks: [single('return_trigger', 'After a miss, when do you return?', RETURN_OPTIONS)] },

  // Stage 4 — Warning Lights + Environment (113–116)
  { order: 13, title: 'Earliest warning light', shortTitle: 'Warning', required: true,
    description: 'Warning Lights — the first sign of drift.',
    blocks: [single('warning_light', 'What is the earliest sign you are slipping?', WARNING_OPTIONS)] },
  { order: 14, title: 'Warning response', shortTitle: 'Response', required: true,
    blocks: [single('warning_response', 'When you see it, what do you do?', WARNING_RESPONSE_OPTIONS)] },
  { order: 15, title: 'Environment rule', shortTitle: 'Environment', required: true,
    description: 'Environment Rules — design the space.',
    blocks: [single('env_rule', 'Which environment rule helps most?', ENV_RULE_OPTIONS)] },
  { order: 16, title: 'One environment change', shortTitle: 'Env change', required: true,
    blocks: [shortText('env_detail', 'One concrete change to your environment', 'e.g. Lay clothes out the night before', true)] },

  // Stage 5 — Recovery, protect, weekly, principle (117–120)
  { order: 17, title: 'Recovery route', shortTitle: 'Recovery', required: true,
    description: 'Recovery Route — how you come back.',
    blocks: [single('recovery_route', 'After a real break, how do you come back?', RECOVERY_OPTIONS)] },
  { order: 18, title: 'Protected life area', shortTitle: 'Protect', required: true,
    blocks: [single('protected_area', 'Which life area must this habit never harm?', LIFE_AREA_OPTIONS)] },
  { order: 19, title: 'Weekly Compass Check', shortTitle: 'Weekly', required: true,
    blocks: [single('weekly_check', 'What is the key question for your weekly review?', WEEKLY_OPTIONS)] },
  { order: 20, title: 'Complete the Playbook', shortTitle: 'Confirm', required: true,
    description: 'Confirm your operating principle and seal the book.',
    blocks: [
      shortText('operating_principle', 'Your operating principle — one line on how you keep moving.', 'e.g. Start tiny, protect sleep, return the next morning.', true),
      { questionId: 'playbook_review', type: 'review', prompt: 'Review your Start Engine, Minimum Mode, Warning Lights and Recovery Route.', required: false },
      { questionId: 'playbook_confirm', type: 'confirmation', prompt: 'This is how I personally keep moving. Complete the Playbook.', required: true },
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

export const chapter6PersonalPlaybook: CompassBookChapterDefinition = {
  id: CHAPTER_ID,
  order: 6,
  title: 'The Personal Playbook',
  coreQuestion: 'How do I personally begin, continue, adapt, recover, and stay oriented?',
  visualMetaphor: 'A magical-mechanical operating system / personal control panel.',
  outputFields: [
    'Start Engine',
    'Momentum Loop',
    'Minimum Mode',
    'Warning Lights',
    'Environment Rules',
    'Recovery Route',
    'Weekly Compass Check',
    'Operating principle',
  ],
  islandRange: [101, 120],
  activities: SEEDS.map(buildActivity),
};
