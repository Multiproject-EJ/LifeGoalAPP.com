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

const CONFIDENCE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'tentative', label: 'Tentative — one clue' },
  { id: 'plausible', label: 'Plausible — a repeating pattern' },
  { id: 'strong', label: 'Strong — tested across situations' },
];

const MISSING_REASON_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'circumstances', label: 'Circumstances leave little room for it' },
  { id: 'outranked', label: 'Another value currently outranks it' },
  { id: 'aspirational', label: 'It may be more aspirational than lived' },
  { id: 'combination', label: 'A combination of these' },
  { id: 'not_sure', label: 'I am not sure yet' },
];

const ESSENTIAL_NEED_CONTEXT_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'recurring', label: 'It recurs across seasons' },
  { id: 'recovery', label: 'It may be a temporary recovery need' },
  { id: 'depends', label: 'It depends on the situation' },
  { id: 'not_sure', label: 'I am not sure yet' },
];

const REVIEW_TRIGGER_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'three_months', label: 'In three months' },
  { id: 'work_change', label: 'When work changes' },
  { id: 'health_change', label: 'When health changes' },
  { id: 'relationship_change', label: 'When a relationship changes' },
  { id: 'home_change', label: 'When home or responsibilities change' },
  { id: 'season_change', label: 'At the next life-season change' },
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

function evidence(questionId: string, prompt: string, placeholder: string): CompassBlockDefinition {
  return {
    questionId,
    type: 'short_text',
    prompt,
    required: false,
    placeholder,
    maxLength: 180,
    helpText: 'Optional · a short private phrase is enough. This helps ground the pattern in evidence.',
  };
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
    blocks: [
      evidence('alive_evidence', 'Recall one recent moment when you felt unusually alive or absorbed. What was happening?', 'e.g. Sketching the solution with two friends after dinner.'),
      single('alive_context', 'What part of that moment seems most important?', ENERGY_OPTIONS),
    ] },
  { order: 2, title: 'A choice I respect', shortTitle: 'A choice I respect', required: true,
    blocks: [
      evidence('proud_evidence', 'Recall a time you respected how you acted, especially if it was inconvenient. What did you choose?', 'e.g. I told the difficult truth and accepted the delay.'),
      single('proud_value', 'Which value might that action have expressed?', VALUE_OPTIONS),
    ] },
  { order: 3, title: 'A moment I lost myself', shortTitle: 'Lost myself', required: true,
    blocks: [
      evidence('unlike_trigger', 'Recall a specific moment when you acted unlike the person you wanted to be. What pressure or trigger was present?', 'e.g. Public criticism when I was already exhausted.'),
      single('unlike_self', 'What response took over?', SHADOW_OPTIONS),
    ] },
  { order: 4, title: 'What I repeatedly move toward', shortTitle: 'Move toward', required: true,
    blocks: [
      evidence('seeking_evidence', 'Across the last year, what have you repeatedly made time for, returned to, or missed when it disappeared?', 'e.g. Long conversations where we make sense of hard things.'),
      single('seeking', 'What might you have been seeking through it?', SEEKING_OPTIONS),
    ] },

  // Stage 2 — Values in action (25–28)
  { order: 5, title: 'What I protected at a cost', shortTitle: 'Protected', required: true,
    blocks: [
      evidence('protected_tradeoff', 'When did protecting something important cost you approval, comfort, time, money, or opportunity?', 'e.g. I declined the promotion to stay present for my family.'),
      single('protected_value', 'What were you protecting?', VALUE_OPTIONS),
    ] },
  { order: 6, title: 'Values I claim — and their cost', shortTitle: 'Values at a cost', required: true,
    description: 'North — candidate values, tested against trade-offs.',
    blocks: [
      { ...multi('core_values', 'Choose up to three values that seem most important in this season.', VALUE_OPTIONS), maxSelections: 3 },
      evidence('core_values_tradeoff', 'If two of these conflict, which one usually wins in your actual behaviour?', 'e.g. Honesty usually wins over comfort.'),
      evidence('core_values_counterevidence', 'Which choice has the least evidence in your recent life?', 'It is okay if one sounds more aspirational than lived.'),
    ] },
  { order: 7, title: 'The value visible this week', shortTitle: 'Visible this week', required: true,
    blocks: [
      evidence('behavioral_evidence', 'What did you spend time, attention, or courage on this week?', 'e.g. I made space to coach a teammate through a setback.'),
      single('behavioral_value', 'Which value is most visible in that behaviour?', VALUE_OPTIONS),
    ] },
  { order: 8, title: 'A value missing from my life', shortTitle: 'Missing value', required: true,
    blocks: [
      single('missing_value', 'Which value matters but has little room in your current season?', VALUE_OPTIONS),
      single('missing_reason', 'What is the most plausible reason it is missing?', MISSING_REASON_OPTIONS, false),
    ] },

  // Stage 3 — Needs (29–32)
  { order: 9, title: 'What I need to function', shortTitle: 'Function steadily', required: true,
    description: 'South — what you need to function well.',
    blocks: [
      evidence('functioning_evidence', 'Think of a period when you functioned steadily. What was reliably present?', 'e.g. Enough sleep, clear ownership and unhurried mornings.'),
      multi('foundational_needs', 'Which conditions seem most necessary for steady functioning?', NEED_OPTIONS.filter((n) => ['safety', 'autonomy', 'belonging', 'rest'].includes(n.id))),
    ] },
  { order: 10, title: 'What helps me grow', shortTitle: 'Growth conditions', required: true,
    blocks: [
      evidence('growth_evidence', 'Think of a period of genuine growth. What helped without destabilising the rest of your life?', 'e.g. A hard project with clear feedback and protected evenings.'),
      multi('growth_needs', 'Which conditions seem to have supported that growth?', NEED_OPTIONS.filter((n) => ['challenge', 'clarity', 'recognition', 'novelty', 'meaning'].includes(n.id))),
    ] },
  { order: 11, title: 'The absence that shows first', shortTitle: 'First absence', required: true,
    blocks: [
      evidence('early_need_signal', 'When your functioning begins to deteriorate, what is the earliest observable sign?', 'e.g. I reread simple messages and postpone replying.'),
      single('neglected_need', 'Which missing need most often sits beneath that early sign?', NEED_OPTIONS),
    ] },
  { order: 12, title: 'The need worth designing around', shortTitle: 'Design around', required: true,
    blocks: [
      single('essential_need', 'Which need repeatedly proves costly to ignore?', NEED_OPTIONS),
      single('essential_need_context', 'How stable does this need seem?', ESSENTIAL_NEED_CONTEXT_OPTIONS, false),
      single('essential_need_confidence', 'How confident are you in this reading?', CONFIDENCE_OPTIONS, false),
    ] },

  // Stage 4 — Strength and shadow (33–36)
  { order: 13, title: 'What others repeatedly rely on', shortTitle: 'Relied on', required: true,
    blocks: [
      evidence('strength_evidence', 'Name two situations in which someone relied on you. What did you actually do?', 'e.g. I steadied a tense meeting and helped a friend choose a next step.'),
      single('strength', 'Which strength might connect those situations?', STRENGTH_OPTIONS),
    ] },
  { order: 14, title: 'When the strength overshoots', shortTitle: 'Overshoot', required: true,
    blocks: [
      evidence('overuse_sequence', 'Under pressure, what does too much of that strength look like — and what short-term problem does it solve?', 'e.g. I take control so uncertainty disappears for a moment.'),
      single('overuse', 'Which overused pattern is the closest fit?', SHADOW_OPTIONS),
    ] },
  { order: 15, title: 'My recurring drift loop', shortTitle: 'Drift loop', required: true,
    description: 'West — what pulls you off course.',
    blocks: [
      evidence('shadow_loop', 'Complete the loop: trigger → automatic response → short-term relief → later cost.', 'e.g. Criticism → overwork → feel in control → exhaustion and distance.'),
      single('shadow', 'Which recurring drift pattern best names that loop?', SHADOW_OPTIONS),
    ] },
  { order: 16, title: 'A counterbalance with evidence', shortTitle: 'Counterbalance', required: true,
    blocks: [
      evidence('counterbalance_evidence', 'What has actually helped interrupt this pattern before?', 'e.g. Saying the limit aloud to someone before I overcommit.'),
      single('counterbalance', 'Which counterbalance is the most plausible next support?', COUNTERBALANCE_OPTIONS),
    ] },

  // Stage 5 — Alignment, drift, set the compass (37–40)
  { order: 17, title: 'How alignment appears in behaviour', shortTitle: 'Alignment', required: true,
    blocks: [
      evidence('alignment_evidence', 'During a reasonably aligned week, what would another person notice you doing differently?', 'e.g. I finish one meaningful thing, ask better questions and leave on time.'),
      multi('alignment_signals', 'Which signals tend to accompany that behaviour?', ALIGNMENT_SIGNAL_OPTIONS),
    ] },
  { order: 18, title: 'The situation that pulls me off course', shortTitle: 'Drift trigger', required: true,
    blocks: [
      evidence('drift_episode', 'Recall the last occurrence. What happened immediately before the drift?', 'e.g. I saw someone else announce a result and abandoned my own plan.'),
      single('drift_cause', 'What is the most likely pull in that episode?', DRIFT_OPTIONS),
    ] },
  { order: 19, title: 'A boundary as a testable rule', shortTitle: 'Boundary test', required: true,
    blocks: [
      {
        questionId: 'guardian_boundary',
        type: 'short_text',
        prompt: 'When [recurring situation], I will [specific protective action], because it protects [value or need].',
        required: false,
        placeholder: 'e.g. When a new request arrives, I will wait overnight before agreeing, because it protects rest.',
        maxLength: 200,
        helpText: 'Optional · write it as a small rule you can actually test.',
      },
      evidence('boundary_failure', 'What is most likely to make this boundary fail?', 'e.g. Wanting to prove I am useful in the moment.'),
    ] },
  { order: 20, title: 'Set the compass', shortTitle: 'Confirm', required: true,
    description: 'Review your compass and seal the chapter.',
    blocks: [
      {
        questionId: 'compass_statement',
        type: 'short_text',
        prompt: 'Write a current Compass statement combining direction, need, drift and return.',
        required: true,
        placeholder: 'e.g. Create honestly, protect rest, and return to one meaningful commitment when comparison scatters me.',
        maxLength: 200,
      },
      single('compass_confidence', 'How confident are you in this current reading?', CONFIDENCE_OPTIONS, false),
      evidence('compass_counterevidence', 'What does not yet fit this reading?', 'Optional: name one contradiction or unresolved part.'),
      single('compass_review_trigger', 'When should you review this reading?', REVIEW_TRIGGER_OPTIONS, false),
      { questionId: 'compass_review', type: 'review', prompt: 'Review True North, Life Spark, Shadow Pull and your Guardian Boundary.', required: false },
      { questionId: 'compass_confirm', type: 'confirmation', prompt: 'This is my best current reading. Preserve it in the Inner Compass.', required: true },
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
