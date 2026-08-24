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

const CONFIDENCE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'tentative', label: 'Tentative — one or two examples' },
  { id: 'plausible', label: 'Plausible — a repeated pattern' },
  { id: 'strong', label: 'Strong — tested across different weeks' },
];

const PLAYBOOK_REVIEW_OPTIONS: readonly CompassBlockOption[] = [
  { id: '1_week', label: 'After one real week' },
  { id: '2_weeks', label: 'After two weeks' },
  { id: '4_weeks', label: 'After four weeks' },
  { id: 'after_disruption', label: 'After the next disruption or restart' },
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
    ...CONFIDENCE_OPTIONS,
    ...PLAYBOOK_REVIEW_OPTIONS,
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

const FLIGHT_STAGE_STORIES: Record<CompassChapterStageIndex, string> = {
  1: 'Mission briefing — study the journeys that flew and the ones that fell back to Earth.',
  2: 'Ignition deck — wire the start engine and the momentum thruster.',
  3: 'Reserve power — define what counts and keep a tiny engine for difficult days.',
  4: 'Flight controls — calibrate warning radar and shape the environment around the mission.',
  5: 'Navigation — plot recovery, protect what matters, and launch when the system is ready.',
};

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
  // Stage 1 — Study previous movement (101–103) + Start Engine (104)
  { order: 1, title: 'Something I sustained', shortTitle: 'Sustained', required: true,
    description: 'Recover a specific working journey before naming a pattern.',
    blocks: [
      shortText('sustained_effort', 'Name something you actually sustained', 'e.g. Morning walks for a year', true, 'player_habits'),
      shortText('sustained_evidence', 'What did an ordinary successful day look like?', 'e.g. Shoes by the door; walked after the first coffee', true),
    ] },
  { order: 2, title: 'Something I abandoned', shortTitle: 'Abandoned', required: true,
    blocks: [
      shortText('abandoned_effort', 'Name something you abandoned or repeatedly lost', 'e.g. A nightly journaling habit', true, 'player_habits'),
      shortText('abandoned_evidence', 'What usually happened just before it disappeared?', 'e.g. I left it until bed, when I was already exhausted', true),
    ] },
  { order: 3, title: 'What made the difference', shortTitle: 'Difference', required: true,
    blocks: [
      single('difference', 'Which difference best fits the two real journeys?', DIFFERENCE_OPTIONS),
      shortText('difference_evidence', 'Where can you see that difference in both examples?', 'e.g. The walk had a cue and no setup; journaling had neither', true),
    ] },
  { order: 4, title: 'My Start Engine', shortTitle: 'Start Engine', required: true,
    description: 'Choose a working hypothesis—not a permanent “type.”',
    completionMessage: 'Start Engine hypothesis installed. The next stage wires it to a real action.',
    blocks: [
      single('start_style', 'Across your examples, what most reliably lowers the resistance to starting?', START_STYLE_OPTIONS),
      single('start_style_confidence', 'How much evidence supports this Start Engine?', CONFIDENCE_OPTIONS),
    ] },

  // Stage 2 — Start cue, Momentum Loop, the habit (105–108)
  { order: 5, title: 'First small step', shortTitle: 'First step', required: true,
    blocks: [shortText('first_step', 'The smallest first step that gets you going', 'e.g. Put on shoes', true)] },
  { order: 6, title: 'Cue', shortTitle: 'Cue', required: true,
    blocks: [
      single('start_cue', 'Which existing moment will carry the cue?', CUE_OPTIONS),
      shortText('cue_detail', 'Complete the launch instruction: “After/at ___, I will ___.”', 'e.g. After my first coffee, I will open the document', true),
    ] },
  { order: 7, title: 'My Momentum Loop', shortTitle: 'Momentum', required: true,
    description: 'What keeps you going.',
    blocks: [
      single('momentum_signal', 'What has actually helped you stay engaged over time?', MOMENTUM_OPTIONS),
      shortText('momentum_evidence', 'Where have you seen this work before? (optional)', 'e.g. Watching the weekly total climb kept me returning', false),
    ] },
  { order: 8, title: 'The habit', shortTitle: 'The habit', required: true,
    description: 'One habit that moves your Primary Quest.',
    completionMessage: 'Ignition path assembled: cue, first move, sustaining signal, and real payload.',
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
    completionMessage: 'Reserve system online. A hard day can reduce the mission without erasing it.',
    blocks: [
      single('return_trigger', 'After a miss, when does the return begin?', RETURN_OPTIONS),
      shortText('return_plan', 'Write the no-debate return plan: “When ___, I return with ___.”', 'e.g. Next morning, I return with the five-minute version', true),
    ] },

  // Stage 4 — Warning Lights + Environment (113–116)
  { order: 13, title: 'Earliest warning light', shortTitle: 'Warning', required: true,
    description: 'Warning Lights — the first sign of drift.',
    blocks: [
      single('warning_light', 'What is the earliest observable sign the plan is becoming unhealthy or unrealistic?', WARNING_OPTIONS),
      shortText('warning_evidence', 'When did this signal appear before, and what followed?', 'e.g. I started cutting sleep, then avoided the work entirely', false),
    ] },
  { order: 14, title: 'Warning response', shortTitle: 'Response', required: true,
    blocks: [
      single('warning_response', 'When the signal appears, which gentle correction comes first?', WARNING_RESPONSE_OPTIONS),
      shortText('warning_plan', 'Complete: “If I notice ___, I will ___ before pushing harder.”', 'e.g. If I cut sleep, I reduce to Minimum Mode for three days', true),
    ] },
  { order: 15, title: 'Environment rule', shortTitle: 'Environment', required: true,
    description: 'Environment Rules — design the space.',
    blocks: [single('env_rule', 'Which environment rule helps most?', ENV_RULE_OPTIONS)] },
  { order: 16, title: 'One environment change', shortTitle: 'Env change', required: true,
    completionMessage: 'Flight controls calibrated. The plan now notices strain early and changes the environment before blaming willpower.',
    blocks: [shortText('env_detail', 'One concrete change to your environment', 'e.g. Lay clothes out the night before', true)] },

  // Stage 5 — Recovery, protect, weekly, principle (117–120)
  { order: 17, title: 'Recovery route', shortTitle: 'Recovery', required: true,
    description: 'Recovery Route — how you come back.',
    blocks: [
      single('recovery_route', 'After a real break, which route best fits the evidence?', RECOVERY_OPTIONS),
      shortText('recovery_first_step', 'What is the first visible step on that route?', 'e.g. Reopen the plan and choose one five-minute session', true),
    ] },
  { order: 18, title: 'Protected life area', shortTitle: 'Protect', required: true,
    blocks: [single('protected_area', 'Which life area must this habit never harm?', LIFE_AREA_OPTIONS)] },
  { order: 19, title: 'Weekly Compass Check', shortTitle: 'Weekly', required: true,
    blocks: [single('weekly_check', 'What is the key question for your weekly review?', WEEKLY_OPTIONS)] },
  { order: 20, title: 'Complete the Playbook', shortTitle: 'Confirm', required: true,
    description: 'Seal a testable flight manual for this season—not a permanent claim about your personality.',
    completionMessage: 'Playbook assembled. Seven systems are ready to be tested in real life, with recovery built in.',
    blocks: [
      shortText('operating_principle', 'Your current flight principle — one line on how you begin, reduce, and return.', 'e.g. Start after coffee, protect sleep, return with five minutes.', true),
      single('playbook_confidence', 'How confident are you in this working model?', CONFIDENCE_OPTIONS),
      single('playbook_review_point', 'When will you inspect the flight data and revise it?', PLAYBOOK_REVIEW_OPTIONS),
      { questionId: 'playbook_review', type: 'review', prompt: 'Review your Start Engine, Minimum Mode, Warning Lights and Recovery Route.', required: false },
      { questionId: 'playbook_confirm', type: 'confirmation', prompt: 'This is a useful model to test—not a fixed truth about me. Complete the Playbook.', required: true },
    ] },
];

function buildActivity(seed: ActivitySeed): CompassBookActivityDefinition {
  const stage = stageForOrder(seed.order);
  return {
    id: `${CHAPTER_ID}.a${String(seed.order).padStart(2, '0')}`,
    chapterId: CHAPTER_ID,
    islandNumber: START_ISLAND + seed.order - 1,
    order: seed.order,
    stage,
    title: seed.title,
    shortTitle: seed.shortTitle,
    description: seed.description
      ? `${FLIGHT_STAGE_STORIES[stage]} ${seed.description}`
      : FLIGHT_STAGE_STORIES[stage],
    completionMessage: seed.completionMessage,
    required: seed.required,
    authored: true,
    blocks: seed.blocks,
  };
}

export const chapter6PersonalPlaybook: CompassBookChapterDefinition = {
  id: CHAPTER_ID,
  order: 6,
  title: 'The Personal Playbook',
  subtitle: 'Mission: Break Orbit',
  coreQuestion: 'How do I begin, continue, adapt, recover, and stay oriented in real life?',
  visualMetaphor: 'A magical rocket cockpit assembled from seven practical, revisable flight systems.',
  outputFields: [
    'Start Engine',
    'Momentum Thruster',
    'Minimum Power',
    'Warning Radar',
    'Environment Shield',
    'Recovery Route',
    'Weekly Navigation',
    'Flight principle',
  ],
  islandRange: [101, 120],
  activities: SEEDS.map(buildActivity),
};
