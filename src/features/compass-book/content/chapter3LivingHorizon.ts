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

const CONFIDENCE_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'tentative', label: 'Tentative — mostly imagined' },
  { id: 'plausible', label: 'Plausible — supported by lived clues' },
  { id: 'strong', label: 'Strong — parts have been tested in real life' },
];

const REVIEW_TRIGGER_OPTIONS: readonly CompassBlockOption[] = [
  { id: 'three_months', label: 'In three months' },
  { id: 'responsibility_change', label: 'When responsibilities change' },
  { id: 'work_change', label: 'When work changes' },
  { id: 'home_relationship_change', label: 'When home or relationships change' },
  { id: 'health_change', label: 'When health or capacity changes' },
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
function evidence(questionId: string, prompt: string, placeholder: string): CompassBlockDefinition {
  return {
    questionId,
    type: 'short_text',
    prompt,
    required: false,
    placeholder,
    maxLength: 180,
    helpText: 'Optional · use a short private phrase. A lived clue is stronger than an idealised picture.',
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
  // Stage 1 — The ordinary good day (41–44)
  { order: 1, title: 'The ordinary morning', shortTitle: 'Morning', required: true,
    description: 'Start with an ordinary day that actually worked—not a holiday fantasy.',
    blocks: [
      evidence('morning_evidence', 'Recall a recent ordinary morning that fitted you unusually well. What made it work?', 'e.g. No rush, daylight, breakfast together and one quiet hour.'),
      single('morning', 'Which morning quality seems most important in that evidence?', MORNING_OPTIONS),
    ] },
  { order: 2, title: 'A meaningful ordinary daytime', shortTitle: 'Daytime', required: true,
    description: 'Essential Scene — the heart of your good day.',
    blocks: [
      evidence('essential_scene_evidence', 'When has an ordinary workday or care day felt meaningfully used? What were you actually doing?', 'e.g. Making something useful with long focus and one collaborative session.'),
      single('essential_scene', 'Which activity best names the essential scene?', SCENE_OPTIONS),
    ] },
  { order: 3, title: 'A rhythm that has worked before', shortTitle: 'Rhythm', required: true,
    description: 'Desired Rhythm.',
    blocks: [
      evidence('rhythm_evidence', 'Compare a period with too much structure and one with too little. What balance helped you function?', 'e.g. Fixed mornings and deadlines, open afternoons.'),
      single('rhythm', 'What degree of structure is the best current hypothesis?', RHYTHM_OPTIONS),
    ] },
  { order: 4, title: 'An evening that restores rather than compensates', shortTitle: 'Evening', required: true,
    blocks: [
      evidence('evening_evidence', 'What kind of ordinary evening leaves tomorrow easier—not merely today escaped?', 'e.g. Dinner with family, a walk and enough quiet before sleep.'),
      single('evening', 'Which evening quality is the closest fit?', EVENING_OPTIONS),
    ] },

  // Stage 2 — Place and people (45–48)
  { order: 5, title: 'An environment where I function', shortTitle: 'Environment', required: true,
    description: 'Sanctuary — where you live.',
    blocks: [
      evidence('environment_evidence', 'In which real places have you felt both more yourself and more able to handle ordinary responsibilities? What helped?', 'e.g. Walkable coast, familiar people and a quiet room.'),
      single('environment', 'Which environment is the strongest current hypothesis?', ENVIRONMENT_OPTIONS),
    ] },
  { order: 6, title: 'Rootedness as a trade-off', shortTitle: 'Rootedness', required: true,
    blocks: [
      evidence('rooted_tradeoff', 'What do you gain—and what do you lose—when you stay rooted or move often?', 'e.g. Roots deepen relationships; travel restores curiosity but fragments routine.'),
      single('rooted_mobile', 'Which balance best fits this season?', ROOTED_OPTIONS),
    ] },
  { order: 7, title: 'The social dose that restores', shortTitle: 'Social dose', required: true,
    description: 'Gathering Place — your people.',
    blocks: [
      evidence('social_intensity_evidence', 'Recall a week with too little connection and one with too much. What social dose left you most present?', 'e.g. Two close evenings and one group day; not constant availability.'),
      single('social_intensity', 'Which social pattern is the closest fit?', SOCIAL_OPTIONS),
    ] },
  { order: 8, title: 'Relationships that belong', shortTitle: 'Relationships', required: true,
    blocks: [
      evidence('relationships_evidence', 'Who needs reliable time and presence—not only good intentions—for this life to feel worthwhile?', 'e.g. Partner, two close friends and collaborators I trust.'),
      { ...multi('relationships', 'Which relationships need a protected place in the ordinary week?', RELATIONSHIP_OPTIONS), allowSelectAll: true },
    ] },

  // Stage 3 — Work that fits (49–52)
  { order: 9, title: 'Problems that hold me without consuming me', shortTitle: 'Work problems', required: true,
    description: 'Workshop — work that fits.',
    blocks: [
      evidence('work_problems_evidence', 'Which real problem have you willingly stayed with through difficulty—and still had energy afterward?', 'e.g. Untangling a system that confused everyone.'),
      single('work_problems', 'Which problem family best matches that evidence?', WORK_PROBLEM_OPTIONS),
    ] },
  { order: 10, title: 'A work mode visible in behaviour', shortTitle: 'Work mode', required: true,
    blocks: [
      evidence('work_mode_evidence', 'Across your better work, what do you repeatedly spend your effort doing?', 'e.g. Building a first version, then explaining it to others.'),
      single('work_mode', 'Which mode is most visible?', WORK_MODE_OPTIONS),
    ] },
  { order: 11, title: 'Depth and variety in practice', shortTitle: 'Depth & variety', required: true,
    blocks: [
      evidence('depth_variety_evidence', 'When did you have too much repetition or too much switching? What mix helped?', 'e.g. One deep project plus a few smaller conversations.'),
      single('depth_variety', 'Which balance is the best current fit?', DEPTH_OPTIONS),
    ] },
  { order: 12, title: 'What work makes possible', shortTitle: 'Enables', required: true,
    blocks: [
      single('work_enables', 'What should work make possible outside work?', ENABLES_OPTIONS),
      evidence('work_enables_tradeoff', 'What work benefit are you willing to have less of to protect this?', 'e.g. Less status and maximum income to protect time freedom.'),
    ] },

  // Stage 4 — Challenge and responsibility (53–55) + Enough (56)
  { order: 13, title: 'Responsibility I can carry repeatedly', shortTitle: 'Responsibility', required: true,
    description: 'Vital Path — challenge & responsibility.',
    blocks: [
      evidence('responsibility_evidence', 'What level of responsibility have you carried well without relying on permanent overextension?', 'e.g. Owning one team and outcome, not every decision.'),
      single('responsibility', 'What level is the strongest sustainable hypothesis?', RESPONSIBILITY_OPTIONS),
    ] },
  { order: 14, title: 'Challenge that strengthens rather than proves', shortTitle: 'Challenge', required: true,
    blocks: [
      evidence('challenge_evidence', 'Which difficult experience expanded you—and which merely depleted or impressed others?', 'e.g. Learning a craft strengthened me; public scale mostly fed proving.'),
      single('challenge', 'Which challenge is most worth carrying forward?', CHALLENGE_OPTIONS),
    ] },
  { order: 15, title: 'Depth, reach and their price', shortTitle: 'Depth or reach', required: true,
    blocks: [
      evidence('scale_mastery_tradeoff', 'If depth and reach conflict, which loss would you regret more in this season?', 'e.g. I would regret shallow work more than a smaller audience.'),
      single('scale_mastery', 'Which balance follows from that trade-off?', SCALE_OPTIONS),
    ] },
  { order: 16, title: 'Financial enough', shortTitle: 'Enough', required: true,
    description: 'Open Gate — your definition of enough.',
    blocks: [
      evidence('financial_enough_evidence', 'In your actual life, what must “enough” reliably cover—including buffer, care, health and chosen freedoms?', 'No exact number is required, but name the real obligations.'),
      single('financial_enough', 'Which level best describes that current threshold?', ENOUGH_OPTIONS),
    ] },

  // Stage 5 — Enough cont., anti-vision, horizon (57–60)
  { order: 17, title: 'Time & proving', shortTitle: 'Time', required: true,
    blocks: [
      single('time_freedom', 'How much time freedom do you want?', TIME_FREEDOM_OPTIONS),
      single('no_longer_prove', 'What do you no longer need to prove?', PROVE_OPTIONS),
      evidence('time_proving_tradeoff', 'What would you stop doing if you truly no longer had to prove that?', 'e.g. Accepting visible work that fragments every week.'),
    ] },
  { order: 18, title: 'Success that still fails', shortTitle: 'Anti-vision', required: true,
    description: 'The kind of success that would still feel like failure.',
    blocks: [
      evidence('anti_vision_evidence', 'Recall a smaller version you have already experienced or observed. What looked successful but felt wrong?', 'e.g. Praise rose while health, presence and honest work declined.'),
      single('anti_vision', 'Which anti-vision best names the pattern?', ANTI_VISION_OPTIONS),
    ] },
  { order: 19, title: 'Price I will not pay', shortTitle: 'Price', required: true,
    blocks: [
      evidence('price_boundary_evidence', 'When have you paid part of this price before, and what early sign should warn you next time?', 'e.g. Sleep shortened, patience vanished and I stopped calling people back.'),
      single('price_not_paid', 'Which price will you explicitly refuse in this season?', PRICE_OPTIONS),
    ] },
  { order: 20, title: 'Create the horizon', shortTitle: 'Confirm', required: true,
    description: 'Review your horizon and seal the chapter.',
    blocks: [
      {
        questionId: 'horizon_statement',
        type: 'short_text',
        prompt: 'Write a current Horizon statement describing an ordinary life worth testing—not a perfect future.',
        required: true,
        placeholder: 'e.g. A quiet coastal base, creative mornings, work that helps and still leaves time.',
        maxLength: 220,
      },
      single('horizon_confidence', 'How confident are you in this current life-design reading?', CONFIDENCE_OPTIONS, false),
      evidence('horizon_counterevidence', 'What does not fit, remains constrained, or may be idealised?', 'Optional: name one contradiction, obligation or unresolved trade-off.'),
      single('horizon_review_trigger', 'When should you review this Horizon?', REVIEW_TRIGGER_OPTIONS, false),
      { questionId: 'horizon_review', type: 'review', prompt: 'Review your Desired Rhythm, Essential Scene and the Price You Will Not Pay.', required: false },
      { questionId: 'horizon_confirm', type: 'confirmation', prompt: 'This is my best current reading of a life worth testing. Preserve the Horizon.', required: true },
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
