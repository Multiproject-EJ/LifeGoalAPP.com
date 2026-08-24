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

export const DOMAIN_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'technology', label: 'Technology' },
  { id: 'ai_data', label: 'AI, data & automation' },
  { id: 'engineering', label: 'Engineering & invention' },
  { id: 'art', label: 'Art & design' },
  { id: 'music_audio', label: 'Music & audio' },
  { id: 'film_photography', label: 'Film & photography' },
  { id: 'science', label: 'Science' },
  { id: 'people', label: 'People & psychology' },
  { id: 'relationships', label: 'Relationships & family life' },
  { id: 'education', label: 'Education & teaching' },
  { id: 'business', label: 'Business' },
  { id: 'finance', label: 'Finance & investing' },
  { id: 'leadership', label: 'Leadership & organisations' },
  { id: 'law_policy', label: 'Law, policy & public service' },
  { id: 'community', label: 'Community & social impact' },
  { id: 'nature', label: 'Nature' },
  { id: 'environment', label: 'Environment & climate' },
  { id: 'animals', label: 'Animals & wildlife' },
  { id: 'health', label: 'Health' },
  { id: 'sport_movement', label: 'Sport & movement' },
  { id: 'writing', label: 'Writing & story' },
  { id: 'games', label: 'Games & play' },
  { id: 'craft', label: 'Craft & making' },
  { id: 'food_hospitality', label: 'Food & hospitality' },
  { id: 'architecture_spaces', label: 'Architecture & spaces' },
  { id: 'fashion_beauty', label: 'Fashion & beauty' },
  { id: 'travel_culture', label: 'Travel & cultures' },
  { id: 'history_philosophy', label: 'History & philosophy' },
  { id: 'spirituality', label: 'Spirituality & meaning' },
  { id: 'languages', label: 'Languages & communication' },
  { id: 'events_experiences', label: 'Events & experiences' },
  { id: 'something_else', label: 'Something else or a mix not listed' },
];

const PROBLEM_SCENE_SPRITE = '/assets/compass-book/ikigai/attention-problem-scenarios-v1.png';

function problemScene(
  id: string,
  label: string,
  scenarioTitle: string,
  description: string,
  column: number,
  row: number,
  alt: string,
): CompassBlockOption {
  return {
    id,
    label,
    scenarioTitle,
    description,
    visual: {
      kind: 'sprite',
      src: PROBLEM_SCENE_SPRITE,
      column,
      row,
      columns: 4,
      rows: 2,
      alt,
    },
  };
}

const PROBLEM_OPTIONS: readonly CompassBlockOption[] = [
  problemScene(
    'inefficiency',
    'Inefficiency',
    'A process wastes everyone’s time',
    'The same work keeps circling instead of reaching what matters.',
    0,
    0,
    'A person repeatedly carries the same blank tokens around a tangled looping process.',
  ),
  problemScene(
    'injustice',
    'Injustice',
    'Someone faces an unfair barrier',
    'Two people need the same thing, but only one gets a clear path.',
    1,
    0,
    'Two people approach the same fountain while an arbitrary barrier blocks only one path.',
  ),
  problemScene(
    'confusion',
    'Confusion',
    'Information leaves people lost',
    'The pieces and directions conflict instead of creating clarity.',
    2,
    0,
    'A person studies mismatched map pieces and many contradictory arrows.',
  ),
  problemScene(
    'suffering',
    'Suffering',
    'Someone carries too much alone',
    'Pain or strain is visible, and support could make a real difference.',
    3,
    0,
    'An overwhelmed person carries a heavy burden while a gentle helping hand reaches toward them.',
  ),
  problemScene(
    'ugliness',
    'Neglect & poor design',
    'A shared place feels neglected',
    'The space is uncomfortable, broken, or arranged without care for people.',
    0,
    1,
    'A neglected shared room has broken seating, a leak, clutter, and one small cared-for corner.',
  ),
  problemScene(
    'waste',
    'Waste',
    'Useful things are thrown away',
    'Food, materials, or repairable objects are discarded without purpose.',
    1,
    1,
    'Useful food, materials, and repairable objects flow needlessly into an overflowing disposal chute.',
  ),
  problemScene(
    'ignorance',
    'Blocked knowledge',
    'People cannot reach useful knowledge',
    'An explanation exists, but access or understanding is locked away.',
    2,
    1,
    'A curious person stands before a locked barrier with a glowing library beyond it.',
  ),
  problemScene(
    'disconnection',
    'Disconnection',
    'People are cut off from one another',
    'They are close enough to see, but the bridges between them are missing.',
    3,
    1,
    'Several people sit in separate transparent compartments connected only by unfinished bridges.',
  ),
  {
    id: 'not_sure',
    label: 'I don’t know yet',
    description: 'Keep scanning. Later questions may reveal the pattern more clearly.',
    visual: {
      kind: 'symbol',
      symbol: '⌖',
      alt: 'A brass scope searching several possible directions.',
    },
    selectionMessage: 'Still scanning. Uncertainty is useful data; the next scenes can give you more clues.',
  },
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

const CONFIDENCE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'tentative', label: 'Tentative — one clue' },
  { id: 'plausible', label: 'Plausible — a repeating pattern' },
  { id: 'strong', label: 'Strong — tested in real situations' },
];

const REVIEW_TRIGGER_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'after_trial', label: 'Immediately after the first trial' },
  { id: 'three_trials', label: 'After three small trials' },
  { id: 'three_months', label: 'In three months' },
  { id: 'circumstances_change', label: 'When circumstances materially change' },
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
function multi(questionId: string, prompt: string, options: readonly CompassBlockOption[], required = true): CompassBlockDefinition {
  return { questionId, type: 'multi_choice', prompt, required, options: [...options] };
}
function ranking(questionId: string, prompt: string, options: readonly CompassBlockOption[]): CompassBlockDefinition {
  return { questionId, type: 'ranking', prompt, required: true, options: [...options] };
}
function shortText(questionId: string, prompt: string, placeholder: string, required = true): CompassBlockDefinition {
  return { questionId, type: 'short_text', prompt, required, placeholder, maxLength: 120 };
}
function evidence(questionId: string, prompt: string, placeholder: string): CompassBlockDefinition {
  return {
    ...shortText(questionId, prompt, placeholder, false),
    maxLength: 180,
    helpText: 'Optional · a short private phrase is enough. Concrete evidence is more useful than a polished story.',
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
  // Stage 1 — Follow the Spark (61–64)
  { order: 1, title: 'Build your interest field', shortTitle: 'Interest field', required: true,
    description: 'Curiosity — capture broadly first, then distinguish desire, behaviour and priority.',
    blocks: [
      {
        ...multi(
          'repeated_interest',
          'What subjects, activities, problems, worlds, or forms of making do you return to without needing external pressure? Select every one that genuinely applies.',
          DOMAIN_OPTIONS,
        ),
        allowSelectAll: true,
        minSelections: 3,
        helpText: 'There is no virtue in choosing fewer. This first pass is an inclusive inventory, not a commitment.',
      },
      {
        ...ranking(
          'interest_preference_ranking',
          'Order your selected interests from most drawn to → still liked, but less than those above.',
          DOMAIN_OPTIONS,
        ),
        optionsFromQuestionId: 'repeated_interest',
        helpText: 'This is a relative preference order. The bottom does not mean dislike.',
      },
      {
        ...ranking(
          'interest_time_ranking',
          'Now order the same interests by where your discretionary attention actually goes: most time → least time.',
          DOMAIN_OPTIONS,
        ),
        optionsFromQuestionId: 'repeated_interest',
        helpText: 'Use real behaviour from recent months. Obligations can explain a gap; they do not erase the interest.',
      },
      {
        ...multi(
          'interest_priorities',
          'After comparing desire and behaviour, which 3–5 interests deserve to travel forward into this chapter?',
          DOMAIN_OPTIONS,
        ),
        optionsFromQuestionId: 'repeated_interest',
        minSelections: 3,
        maxSelections: 5,
        completionMessage: 'Priority field locked in. These are candidates for exploration—not a permanent identity.',
        helpText: 'A low-time interest can still belong when circumstances—not lack of interest—explain the gap.',
      },
    ] },
  { order: 2, title: 'Which scene pulls your attention?', shortTitle: 'Situation pull', required: true,
    description: 'Look first; interpret second. Notice which situation your eyes return to or makes you want to step in.',
    blocks: [
      {
        ...single(
          'attention_problem',
          'Which situation most makes you want to understand it, repair it, or help? Choose the pull you notice first.',
          PROBLEM_OPTIONS,
        ),
        helpText: 'Do not solve this intellectually. Compare the scenes and notice which one keeps drawing you back. “I don’t know yet” is a complete answer.',
        completionMessage: 'Scene marked. This is a clue to investigate—not a permanent purpose or personality label.',
      },
      shortText(
        'attention_problem_evidence',
        'Optional: what part of that scene pulled you—what did you want to fix, understand, protect, or change?',
        'e.g. The arbitrary barrier bothered me more than the broken process.',
        false,
      ),
    ] },
  { order: 3, title: 'Explored without permission', shortTitle: 'Explored freely', required: true,
    blocks: [
      shortText('explored_freely_evidence', 'What did you actually read, watch, practise, build, discuss or investigate without being required to?', 'e.g. Built three prototypes and kept notes on what worked.', false),
      {
        ...single('explored_freely', 'Which priority interest has the clearest evidence of self-directed exploration?', DOMAIN_OPTIONS),
        optionsFromQuestionId: 'interest_priorities',
      },
    ] },
  { order: 4, title: 'Set a Spark hypothesis', shortTitle: 'Spark hypothesis', required: true,
    blocks: [
      {
        ...single('spark_pick', 'Which priority interest is the strongest Spark hypothesis for this season?', DOMAIN_OPTIONS),
        optionsFromQuestionId: 'interest_priorities',
      },
      shortText('spark_reason', 'What evidence makes it worth carrying forward—and what uncertainty remains?', 'e.g. I return to it and make things, but I have not tested the daily work.', false),
    ] },

  // Stage 2 — Find the Gift (65–68)
  { order: 5, title: 'What people actually rely on', shortTitle: 'Relied on', required: true,
    description: 'Capability — what you are good at.',
    blocks: [
      evidence('demonstrated_strength_evidence', 'Recall two situations where someone relied on you. What did you do that helped?', 'e.g. Turned a messy discussion into a decision and clear next steps.'),
      single('demonstrated_strength', 'Which capability best names the repeated behaviour?', CAPABILITY_OPTIONS),
    ] },
  { order: 6, title: 'A capability that is growing', shortTitle: 'Growing capability', required: true,
    blocks: [
      evidence('emerging_strength_evidence', 'What can you do now that was meaningfully harder a year ago?', 'e.g. Explain technical choices to non-technical partners.'),
      single('emerging_strength', 'Which capability seems to be growing?', CAPABILITY_OPTIONS),
    ] },
  { order: 7, title: 'A capability without enough room', shortTitle: 'Underused', required: true,
    blocks: [
      evidence('underused_strength_evidence', 'When did you last use a strength that your current circumstances rarely ask for?', 'e.g. Facilitated a workshop and felt unusually useful.'),
      single('underused_strength', 'Which capability appears underused right now?', CAPABILITY_OPTIONS),
    ] },
  { order: 8, title: 'Set a Gift hypothesis', shortTitle: 'Gift hypothesis', required: true,
    blocks: [
      single('gift_pick', 'Which capability is most worth deliberately developing in this season?', CAPABILITY_OPTIONS),
      single('gift_confidence', 'How confident is this Gift hypothesis?', CONFIDENCE_OPTIONS, false),
      evidence('gift_counterevidence', 'What evidence does not fit—or suggests a different capability?', 'e.g. I am praised for explaining, but I avoid doing it repeatedly.'),
    ] },

  // Stage 3 — Find the Need (69–72)
  { order: 9, title: 'People whose reality I understand', shortTitle: 'People understood', required: true,
    description: 'Contribution — who and what you serve.',
    blocks: [
      evidence('people_understood_evidence', 'Whose problems have you heard closely, lived near, or helped with more than once?', 'e.g. New managers trying to lead without becoming performative.'),
      single('people_understood', 'Which group is the closest current match?', PEOPLE_OPTIONS),
    ] },
  { order: 10, title: 'A problem that survives contact', shortTitle: 'Problem cared for', required: true,
    blocks: [
      evidence('problem_cared_evidence', 'What problem have you continued to care about after seeing its boring, difficult or political parts?', 'e.g. Access to good teaching even when systems resist change.'),
      single('problem_cared', 'Which cause most closely names it?', CAUSE_OPTIONS),
    ] },
  { order: 11, title: 'A change worth helping test', shortTitle: 'Transformation', required: true,
    blocks: [
      evidence('transformation_evidence', 'Recall one real person or situation. What change would have made a meaningful difference?', 'e.g. From overwhelmed and guessing to clear enough to take one step.'),
      single('transformation', 'Which transformation is the closest pattern?', TRANSFORM_OPTIONS),
    ] },
  { order: 12, title: 'Set a contribution hypothesis', shortTitle: 'Contribution', required: true,
    blocks: [
      single('need_pick', 'Which cause is most worth carrying forward as a contribution hypothesis?', CAUSE_OPTIONS),
      single('need_confidence', 'How confident are you that this is service—not only projection or admiration?', CONFIDENCE_OPTIONS, false),
      evidence('need_counterevidence', 'What alternative cause or explanation might fit the evidence?', 'e.g. I may care because it mirrors my own story, not because I understand the need broadly.'),
    ] },

  // Stage 4 — Test viability (73–75) + willingness start (76)
  { order: 13, title: 'Evidence of practical value', shortTitle: 'Practical value', required: true,
    description: 'Viability — practical value.',
    blocks: [
      evidence('income_evidence', 'What real signal suggests someone allocates money, time, access or opportunity to this kind of value?', 'e.g. Three organisations already pay for adjacent work.'),
      single('income_potential', 'Given the evidence—not optimism alone—how viable does this currently look?', LEVEL3_OPTIONS),
    ] },
  { order: 14, title: 'Access, experience and distance', shortTitle: 'Access', required: true,
    blocks: [
      evidence('access_evidence', 'What access, credibility, experience or relationships do you already have—and what is conspicuously missing?', 'e.g. Strong product experience, little access to educators.'),
      single('access_experience', 'How much usable access or experience do you currently have?', LEVEL3_OPTIONS),
    ] },
  { order: 15, title: 'Fit with the ordinary life', shortTitle: 'Horizon fit', required: true,
    blocks: [
      evidence('horizon_fit_evidence', 'Picture the repeated weekly work, not the title. Where does it support or conflict with your Living Horizon?', 'e.g. The work fits; the travel and evening calls do not.'),
      single('horizon_fit', 'How strong is the current fit with the life you designed in Chapter III?', FIT_OPTIONS),
    ] },
  { order: 16, title: 'Willingness for the process', shortTitle: 'Process', required: true,
    description: 'Willingness — do you want the work, or only the outcome?',
    blocks: [
      evidence('process_evidence', 'What is one repetitive, frustrating or unglamorous part you have actually experienced?', 'e.g. Recruiting participants and following up repeatedly.'),
      single('process_tolerance', 'How do you feel about doing that kind of daily process repeatedly?', TOLERANCE_OPTIONS),
    ] },

  // Stage 5 — Willingness, paths, trial (77–80)
  { order: 17, title: 'The beginner cost', shortTitle: 'Beginner cost', required: true,
    blocks: [
      evidence('beginner_cost_evidence', 'What status, speed, comfort or certainty would you temporarily give up to learn this?', 'e.g. Being visibly average while I learn to facilitate.'),
      single('beginner_willingness', 'Given that real cost, how willing are you to be a beginner?', BEGINNER_OPTIONS),
    ] },
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
      evidence('trial_failure_signal', 'What result would make you revise or stop this path rather than rationalise it?', 'e.g. I consistently dread the delivery even when participants benefit.'),
    ] },
  { order: 20, title: 'Illuminate the constellation', shortTitle: 'Confirm', required: true,
    description: 'Review your map and seal the chapter.',
    blocks: [
      shortText('ikigai_statement', 'Your Ikigai statement — one line on the direction worth testing.', 'e.g. Help beginners learn design, tested through small workshops.', true),
      single('ikigai_confidence', 'How confident are you in this direction before the trial?', CONFIDENCE_OPTIONS, false),
      evidence('ikigai_counterevidence', 'What does not yet fit this constellation?', 'Optional: name one contradiction, missing force or attractive alternative.'),
      single('ikigai_review_trigger', 'When will you review this reading?', REVIEW_TRIGGER_OPTIONS, false),
      { questionId: 'ikigai_review', type: 'review', prompt: 'Review your Spark, Gift, Need and chosen Trial — and any Mirage warning.', required: false },
      { questionId: 'ikigai_confirm', type: 'confirmation', prompt: 'This is my best current direction to test—not a permanent calling. Preserve the constellation.', required: true },
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
