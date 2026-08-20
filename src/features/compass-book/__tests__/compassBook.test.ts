/**
 * Compass Book foundation tests. Pure logic only — no Supabase/React.
 * Run via `npm run test:compass-book`.
 */

import {
  COMPASS_BOOK_ACTIVITIES,
  COMPASS_BOOK_CHAPTERS,
  validateCompassCurriculum,
  getActivityDefinition,
  getActivityForIsland,
  getChapterActivities,
} from '../content/compassBookCurriculum';
import {
  getUnlockedActivityCount,
  isActivityUnlocked,
  getChapterIdForIsland,
  getChapterActivityIndexForIsland,
  getCurrentChapterId,
} from '../logic/unlock';
import {
  computeChapterProgress,
  isActivityComplete,
  areRequiredBlocksAnswered,
  isAnswerValuePresent,
} from '../logic/progress';
import { parseAnswers, upsertAnswer } from '../services/compassBookSerialization';
import {
  projectLivingWheel,
  buildLivingWheelAreas,
} from '../logic/projectors/livingWheelProjector';
import { projectInnerCompass } from '../logic/projectors/innerCompassProjector';
import { projectLivingHorizon } from '../logic/projectors/livingHorizonProjector';
import { projectIkigaiMap } from '../logic/projectors/ikigaiMapProjector';
import { buildQuestLeapProposalFromIkigai } from '../logic/questLeap';
import { projectQuestForge } from '../logic/projectors/questForgeProjector';
import { buildGoalProposalFromQuestForge, describeGoalProposal } from '../logic/goalBridge';
import { projectPersonalPlaybook } from '../logic/projectors/personalPlaybookProjector';
import { buildHabitProposalFromPlaybook, describeHabitIntent } from '../logic/habitBridge';
import { calculatePersonalPlaybookMission } from '../logic/personalPlaybookMission';
import { getChapterConfirmedOutput } from '../logic/projectors';
import {
  applyHelpToValue,
  buildCompassHelpRequest,
  parseCompassHelpResponse,
} from '../services/compassAiCore';
import {
  EMPTY_COMPASS_PLAYER_DATA,
  MAX_PICK_OPTIONS,
  normalizePlayerOptions,
  optionsForPickSource,
  pickSourceNoun,
} from '../logic/playerOptions';
import {
  WISDOM_STOP_MAX_INPUTS,
  getIslandFragment,
  isFragmentSlotComplete,
  isIslandFragmentComplete,
  splitIslandInputs,
} from '../logic/islandFragment';
import {
  SHADOW_HINT_QUESTION_IDS,
  VALUE_HINT_QUESTION_IDS,
  SUGGESTED_SHADOW_OPTION_BY_ARCHETYPE,
  SUGGESTED_VALUES_BY_ARCHETYPE,
  buildShadowBridgeData,
  coercePersonalityScores,
} from '../logic/shadowBridge';
import { SHADOW_OPTIONS, VALUE_OPTIONS, chapter2InnerCompass } from '../content/chapter2InnerCompass';
import { ARCHETYPE_DECK } from '../../identity/archetypes/archetypeDeck';
import { COMPASS_BOOK_CHAPTER_IDS } from '../types';
import {
  COMPASS_BOOK_PAGE_IDS,
  chapterHeadline,
  chapterNumeral,
  isChapterPage,
  summarizeCompassReading,
} from '../logic/reading';
import { DEMO_ISLAND_NUMBER, buildDemoChapterStates, demoValueForBlock } from '../content/demoBook';
import {
  buildCompassIllumination,
  getCompassSignalIdForChapter,
  scoreCompassIllumination,
} from '../logic/compassIllumination';
import { buildWisdomCompassInsight } from '../logic/wisdomCompassInsight';
import {
  TURN_MAX_MS,
  TURN_MIN_MS,
  pageIndex,
  turnClassName,
  turnDirection,
  turnDistance,
  turnDurationMs,
} from '../logic/pageTurn';
import {
  parseCompassBookPresentationMode,
  resolveCompassBookPresentation,
} from '../logic/presentation';
import type {
  CompassAnswerRecord,
  CompassAnswerValue,
  CompassBlockDefinition,
  CompassBookChapterId,
  CompassChapterState,
} from '../types';
import type { Json as DbJson } from '../../../lib/database.types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function makeAnswer(
  activityId: string,
  questionId: string,
  value: CompassAnswerRecord['value'],
  confirmed = true,
): CompassAnswerRecord {
  const now = new Date().toISOString();
  return {
    activityId,
    questionId,
    value,
    sourceMode: 'fixed_guided',
    curriculumVersion: 'v1',
    answeredAt: now,
    updatedAt: now,
    confirmed,
  };
}

function testCurriculum(): void {
  const result = validateCompassCurriculum();
  assert(result.ok, `curriculum should validate: ${result.errors.join('; ')}`);
  assert(COMPASS_BOOK_CHAPTERS.length === 6, 'should have exactly six chapters');
  for (const chapter of COMPASS_BOOK_CHAPTERS) {
    assert(chapter.activities.length === 20, `${chapter.id} should have 20 activities`);
  }
  assert(COMPASS_BOOK_ACTIVITIES.length === 120, 'should have 120 total activities');

  const islands = new Set(COMPASS_BOOK_ACTIVITIES.map((a) => a.islandNumber));
  assert(islands.size === 120, 'islands should be unique and cover 120 slots');
  for (let i = 1; i <= 120; i += 1) {
    assert(islands.has(i), `island ${i} should be covered`);
  }
  const ids = new Set(COMPASS_BOOK_ACTIVITIES.map((a) => a.id));
  assert(ids.size === 120, 'activity ids should be unique');

  // Every activity has at least one block; chapter 1 is fully authored.
  assert(
    COMPASS_BOOK_ACTIVITIES.every((a) => a.blocks.length > 0),
    'every activity must have blocks',
  );
  assert(
    getChapterActivities('living_wheel').every((a) => a.authored),
    'chapter 1 activities should be authored',
  );

  // getActivityForIsland resolves the right chapter/order.
  assert(getActivityForIsland(1)?.chapterId === 'living_wheel', 'island 1 → living_wheel');
  assert(getActivityForIsland(21)?.chapterId === 'inner_compass', 'island 21 → inner_compass');
  assert(getActivityForIsland(120)?.chapterId === 'personal_playbook', 'island 120 → personal_playbook');
  assert(getActivityForIsland(0) === null, 'island 0 → no activity');
  assert(getActivityForIsland(121) === null, 'island 121 → no activity');
}

function testUnlock(): void {
  assert(getUnlockedActivityCount({ currentIslandNumber: 1 }) === 1, 'island 1 unlocks 1');
  assert(getUnlockedActivityCount({ currentIslandNumber: 20 }) === 20, 'island 20 unlocks 20');
  assert(getUnlockedActivityCount({ currentIslandNumber: 21 }) === 21, 'island 21 unlocks 21');
  assert(getUnlockedActivityCount({ currentIslandNumber: 40 }) === 40, 'island 40 unlocks 40');
  assert(getUnlockedActivityCount({ currentIslandNumber: 60 }) === 60, 'island 60 unlocks 60');
  assert(getUnlockedActivityCount({ currentIslandNumber: 80 }) === 80, 'island 80 unlocks 80');
  assert(getUnlockedActivityCount({ currentIslandNumber: 100 }) === 100, 'island 100 unlocks 100');
  assert(getUnlockedActivityCount({ currentIslandNumber: 120 }) === 120, 'island 120 unlocks 120');

  // Out of range.
  assert(getUnlockedActivityCount({ currentIslandNumber: 0 }) === 0, 'island 0 unlocks nothing');
  assert(getUnlockedActivityCount({ currentIslandNumber: -5 }) === 0, 'negative unlocks nothing');
  assert(getUnlockedActivityCount({ currentIslandNumber: 999 }) === 120, 'over-120 caps at 120');
  assert(getUnlockedActivityCount({ currentIslandNumber: Number.NaN }) === 0, 'NaN unlocks nothing');

  // Returning player / cycle index.
  assert(
    getUnlockedActivityCount({ currentIslandNumber: 3, cycleIndex: 1 }) === 120,
    'cycleIndex > 0 unlocks all 120',
  );

  // Unlock does not equal completion.
  assert(isActivityUnlocked(21, { currentIslandNumber: 25 }), 'activity 21 unlocked at island 25');
  assert(!isActivityUnlocked(26, { currentIslandNumber: 25 }), 'activity 26 locked at island 25');

  // Chapter mapping.
  assert(getChapterIdForIsland(1) === 'living_wheel', 'island 1 chapter');
  assert(getChapterIdForIsland(40) === 'inner_compass', 'island 40 chapter');
  assert(getChapterActivityIndexForIsland(21) === 1, 'island 21 is activity 1 of its chapter');
  assert(getChapterActivityIndexForIsland(40) === 20, 'island 40 is activity 20 of its chapter');
  assert(getCurrentChapterId({ currentIslandNumber: 0 }) === 'living_wheel', 'pre-start → chapter 1');
}

function testProgress(): void {
  const activities = getChapterActivities('living_wheel');
  const a1 = activities[0];

  // Locked when island not reached.
  const lockedProgress = computeChapterProgress('living_wheel', null, { currentIslandNumber: 0 });
  assert(lockedProgress.status === 'locked', 'no unlock → chapter locked');
  assert(lockedProgress.activities[0].status === 'locked', 'activity 1 locked at island 0');
  assert(lockedProgress.nextActivityId === null, 'no next when fully locked');

  // Unlocked, nothing answered.
  const unlockedProgress = computeChapterProgress('living_wheel', null, { currentIslandNumber: 20 });
  assert(unlockedProgress.status === 'unlocked', 'island 20 → chapter unlocked');
  assert(unlockedProgress.activities[0].status === 'unlocked', 'activity 1 unlocked');
  assert(unlockedProgress.nextActivityId === a1.id, 'next is activity 1');

  // Started but not confirmed.
  const startedState: CompassChapterState = baseState([
    makeAnswer(a1.id, 'strongest_area', { kind: 'choice', optionId: 'health_fitness' }, false),
  ]);
  const startedProgress = computeChapterProgress('living_wheel', startedState, {
    currentIslandNumber: 20,
  });
  assert(startedProgress.activities[0].status === 'answered', 'value present but unconfirmed → answered');
  assert(!isActivityComplete(a1, startedState.answers), 'unconfirmed answer is not complete');
  assert(startedProgress.status === 'in_progress', 'any answers → chapter in_progress');

  // Complete activity (required block confirmed).
  const completeState: CompassChapterState = baseState([
    makeAnswer(a1.id, 'strongest_area', { kind: 'choice', optionId: 'health_fitness' }, true),
  ]);
  assert(isActivityComplete(a1, completeState.answers), 'confirmed required answer → complete');
  const completeProgress = computeChapterProgress('living_wheel', completeState, {
    currentIslandNumber: 20,
  });
  assert(completeProgress.activities[0].status === 'complete', 'activity 1 complete');
  assert(completeProgress.completedCount === 1, 'one activity complete');
  assert(completeProgress.stageReached === 1, 'stage 1 reached');
  assert(completeProgress.status === 'in_progress', 'chapter not complete without confirmedOutput');

  // Chapter completes only via confirmedOutput snapshot.
  const sealedState: CompassChapterState = {
    ...completeState,
    confirmedOutput: { wheelStatement: 'Steady the body.' } as unknown as DbJson,
    confirmedAt: new Date().toISOString(),
  };
  const sealedProgress = computeChapterProgress('living_wheel', sealedState, {
    currentIslandNumber: 20,
  });
  assert(sealedProgress.status === 'complete', 'confirmedOutput → chapter complete');
}

function testAnswerParsing(): void {
  // Valid round-trip-ish parse.
  const valid: unknown[] = [
    {
      activityId: 'living_wheel.a01',
      questionId: 'strongest_area',
      value: { kind: 'choice', optionId: 'health_fitness' },
      sourceMode: 'fixed_guided',
      curriculumVersion: 'v1',
      answeredAt: '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
      confirmed: true,
    },
    // Malformed entries that must be dropped:
    null,
    'nope',
    { activityId: 'x' }, // missing questionId/value
    { activityId: 'x', questionId: 'y' }, // missing value
  ];
  const parsed = parseAnswers(valid as unknown as DbJson);
  assert(parsed.length === 1, 'malformed answer entries should be dropped');
  assert(parsed[0].questionId === 'strongest_area', 'valid answer survives parse');

  // Non-array JSON → empty.
  assert(parseAnswers({ not: 'an array' } as unknown as DbJson).length === 0, 'object → no answers');
  assert(parseAnswers(null).length === 0, 'null → no answers');

  // Upsert add then edit.
  const first = makeAnswer('living_wheel.a01', 'strongest_area', {
    kind: 'choice',
    optionId: 'health_fitness',
  });
  let answers = upsertAnswer([], first);
  assert(answers.length === 1, 'upsert adds new answer');
  const edited = makeAnswer('living_wheel.a01', 'strongest_area', {
    kind: 'choice',
    optionId: 'career_development',
  });
  answers = upsertAnswer(answers, edited);
  assert(answers.length === 1, 'upsert replaces same question in place');
  assert(
    answers[0].value.kind === 'choice' && answers[0].value.optionId === 'career_development',
    'edit updates value',
  );
  assert(answers[0].answeredAt === first.answeredAt, 'original answeredAt preserved on edit');
}

function baseState(answers: CompassAnswerRecord[]): CompassChapterState {
  return {
    chapterId: 'living_wheel',
    contentVersion: 'v1',
    status: 'in_progress',
    answers,
    draftOutput: null,
    confirmedOutput: null,
    completedActivityIds: [],
    confirmedAt: null,
  };
}

function testGuidedFlowAnswering(): void {
  // Single required choice.
  const a1 = getActivityDefinition('living_wheel.a01');
  assert(a1 !== null, 'a01 should exist');
  assert(!areRequiredBlocksAnswered(a1!, {}), 'a01 empty draft is not satisfied');
  assert(
    areRequiredBlocksAnswered(a1!, {
      strongest_area: { kind: 'choice', optionId: 'health_fitness' },
    }),
    'a01 satisfied once the choice is set',
  );

  // Value presence edges.
  assert(!isAnswerValuePresent(undefined), 'undefined value not present');
  assert(!isAnswerValuePresent({ kind: 'text', text: '   ' }), 'whitespace text not present');
  assert(isAnswerValuePresent({ kind: 'scale', value: 0 }), 'scale 0 is a present value');

  // Per-area scale activity (4 areas per island after the Chapter 1 rebalance).
  const a5 = getActivityDefinition('living_wheel.a05');
  assert(a5 !== null && a5.blocks.length === 4, 'a05 has 4 scale blocks (core four)');
  const partial: Record<string, CompassAnswerValue | undefined> = {};
  a5!.blocks.slice(0, 2).forEach((b) => {
    partial[b.questionId] = { kind: 'scale', value: 5 };
  });
  assert(!areRequiredBlocksAnswered(a5!, partial), 'a05 with 2/4 scales is not satisfied');
  const full: Record<string, CompassAnswerValue | undefined> = {};
  a5!.blocks.forEach((b) => {
    full[b.questionId] = { kind: 'scale', value: 5 };
  });
  assert(areRequiredBlocksAnswered(a5!, full), 'a05 with all 4 scales is satisfied');
  assert(
    getChapterActivities('living_wheel').every((act) => act.blocks.length <= 4),
    'no Living Wheel island exceeds 4 input blocks (Wisdom + Habit-overflow budget)',
  );

  // Multi-block activity (Lever choice + next-move area + OPTIONAL free-text).
  // The two required taps satisfy the island; the mid-chapter next_move line is
  // optional so it never gates completion (only the finale statement is required).
  const a19 = getActivityDefinition('living_wheel.a19');
  assert(a19 !== null, 'a19 should exist');
  assert(
    areRequiredBlocksAnswered(a19!, {
      candidate_lever: { kind: 'choice', optionId: 'health_fitness' },
      next_move_area: { kind: 'choice', optionId: 'health_fitness' },
    }),
    'a19 satisfied by the two required area taps (free-text is optional)',
  );
  assert(
    !areRequiredBlocksAnswered(a19!, {
      candidate_lever: { kind: 'choice', optionId: 'health_fitness' },
    }),
    'a19 still needs both required taps',
  );
  assert(
    areRequiredBlocksAnswered(a19!, {
      candidate_lever: { kind: 'choice', optionId: 'health_fitness' },
      next_move_area: { kind: 'choice', optionId: 'health_fitness' },
      next_move: { kind: 'text', text: 'Walk after lunch' },
    }),
    'a19 also satisfied when the optional next_move text is supplied',
  );

  // Save/resume parity: the hook upserts confirmed answers then recomputes
  // completion exactly this way.
  let answers: CompassAnswerRecord[] = [];
  answers = upsertAnswer(
    answers,
    makeAnswer('living_wheel.a01', 'strongest_area', { kind: 'choice', optionId: 'health_fitness' }),
  );
  const completed = getChapterActivities('living_wheel')
    .filter((activity) => isActivityComplete(activity, answers))
    .map((activity) => activity.id);
  assert(completed.length === 1 && completed[0] === 'living_wheel.a01', 'only a01 complete after save');
}

function scale(activityId: string, questionId: string, value: number): CompassAnswerRecord {
  return makeAnswer(activityId, questionId, { kind: 'scale', value });
}
function choice(activityId: string, questionId: string, optionId: string): CompassAnswerRecord {
  return makeAnswer(activityId, questionId, { kind: 'choice', optionId });
}
function emotion(activityId: string, questionId: string, optionId: string): CompassAnswerRecord {
  return makeAnswer(activityId, questionId, { kind: 'emotion', optionId });
}

function testLivingWheelProjector(): void {
  const answers: CompassAnswerRecord[] = [
    // health: strong + influential + rising + positive
    scale('living_wheel.a05', 'current.health_fitness', 8),
    scale('living_wheel.a06', 'good_enough.health_fitness', 7),
    scale('living_wheel.a07', 'minimum_safe.health_fitness', 4),
    scale('living_wheel.a14', 'spillover.health_fitness', 9),
    choice('living_wheel.a13', 'momentum.health_fitness', 'rising'),
    emotion('living_wheel.a09', 'emotion.health_fitness', 'joy'),
    // finance: low + influential + declining + negative + below safe
    scale('living_wheel.a05', 'current.finance_wealth', 3),
    scale('living_wheel.a06', 'good_enough.finance_wealth', 7),
    scale('living_wheel.a07', 'minimum_safe.finance_wealth', 5),
    scale('living_wheel.a14', 'spillover.finance_wealth', 8),
    choice('living_wheel.a13', 'momentum.finance_wealth', 'declining'),
    emotion('living_wheel.a09', 'emotion.finance_wealth', 'anxious'),
    // career: middling
    scale('living_wheel.a05', 'current.career_development', 6),
    scale('living_wheel.a06', 'good_enough.career_development', 8),
    scale('living_wheel.a07', 'minimum_safe.career_development', 4),
    scale('living_wheel.a14', 'spillover.career_development', 5),
    choice('living_wheel.a13', 'momentum.career_development', 'flat'),
    emotion('living_wheel.a09', 'emotion.career_development', 'calm'),
    emotion('living_wheel.a12', 'emotional_pattern', 'restless'),
    choice('living_wheel.a19', 'next_move_area', 'finance_wealth'),
    makeAnswer('living_wheel.a19', 'next_move', { kind: 'text', text: 'Track spending weekly' }),
    makeAnswer('living_wheel.a20', 'wheel_statement', { kind: 'text', text: 'Steady the body, mend money' }),
  ];

  const out = projectLivingWheel(answers);
  assert(out.engineAreaId === 'health_fitness', 'engine = highest spillover+current (health)');
  assert(out.brakeAreaId === 'finance_wealth', 'brake = low + influential + negative (finance)');
  assert(out.fragileAreaId === 'finance_wealth', 'fragile = below safe + declining (finance)');
  assert(out.leverAreaId === 'finance_wealth', 'lever = high spillover x action gap (finance)');
  assert(out.season === 'Steady tending', 'season balanced → steady tending');
  assert(out.emotionalPattern === 'restless', 'explicit emotional pattern wins');
  assert(out.nextMove?.text === 'Track spending weekly', 'next move text passes through');
  assert(out.wheelStatement === 'Steady the body, mend money', 'wheel statement passes through');

  const health = out.areas.find((a) => a.areaId === 'health_fitness');
  assert(health?.actionGap === -1, 'action gap = goodEnough − current (7 − 8 = −1)');

  // Player candidate overrides the derived suggestion.
  const withCandidate = [
    ...answers,
    choice('living_wheel.a16', 'candidate_engine', 'career_development'),
  ];
  assert(
    projectLivingWheel(withCandidate).engineAreaId === 'career_development',
    'explicit candidate engine wins over derivation',
  );
  assert(
    projectLivingWheel([
      choice('living_wheel.a17', 'candidate_engine', 'no_match'),
    ]).engineAreaId === null,
    'no clear match is a valid answer but never becomes a fake life-area id',
  );

  // Empty answers → graceful nulls.
  const empty = projectLivingWheel([]);
  assert(empty.engineAreaId === null && empty.season === null, 'empty answers yield null outputs');
  assert(buildLivingWheelAreas([]).length === 8, 'adapter always returns 8 areas');

  // Registry produces a JSON snapshot for sealing.
  const snapshot = getChapterConfirmedOutput('living_wheel', answers);
  assert(snapshot !== null, 'living_wheel has a projector snapshot');
  // Every chapter now has a registered projector (returns a snapshot, not null).
  for (const id of COMPASS_BOOK_CHAPTER_IDS) {
    assert(getChapterConfirmedOutput(id, []) !== null, `chapter ${id} has a projector`);
  }
}

function testInnerCompassProjector(): void {
  // Chapter 2 is fully authored (regression against the reserved-stub form).
  assert(
    getChapterActivities('inner_compass').every((a) => a.authored),
    'chapter 2 activities are authored',
  );
  assert(
    getChapterActivities('inner_compass').every((a) => a.islandNumber >= 21 && a.islandNumber <= 40),
    'chapter 2 covers islands 21–40',
  );

  const answers: CompassAnswerRecord[] = [
    choice('inner_compass.a01', 'alive_context', 'creating'),
    makeAnswer('inner_compass.a06', 'core_values', { kind: 'multi_choice', optionIds: ['freedom', 'growth', 'honesty'] }),
    choice('inner_compass.a07', 'behavioral_value', 'growth'),
    choice('inner_compass.a12', 'essential_need', 'autonomy'),
    choice('inner_compass.a11', 'neglected_need', 'rest'),
    choice('inner_compass.a13', 'strength', 'empathy'),
    choice('inner_compass.a15', 'shadow', 'people_pleasing'),
    choice('inner_compass.a16', 'counterbalance', 'boundaries'),
    choice('inner_compass.a18', 'drift_cause', 'comparison'),
    makeAnswer('inner_compass.a19', 'guardian_boundary', { kind: 'text', text: 'Protect mornings for deep work' }),
    makeAnswer('inner_compass.a20', 'compass_statement', { kind: 'text', text: 'Create freely, protect rest' }),
  ];
  const out = projectInnerCompass(answers);
  assert(out.trueNorthValueId === 'growth', 'true north = behavioral value');
  assert(out.lifeSparkId === 'creating', 'life spark = alive context');
  assert(out.essentialNeedId === 'autonomy', 'essential need wins over neglected');
  assert(out.shadowPullId === 'people_pleasing', 'shadow pull from shadow answer');
  assert(out.counterbalanceId === 'boundaries', 'counterbalance passes through');
  assert(out.guardianBoundary === 'Protect mornings for deep work', 'guardian boundary text');
  assert(out.coreValueIds.length === 3, 'core values captured');

  // Fallbacks + empty.
  const fallback = projectInnerCompass([
    choice('inner_compass.a05', 'protected_value', 'kindness'),
    choice('inner_compass.a11', 'neglected_need', 'rest'),
  ]);
  assert(fallback.trueNorthValueId === 'kindness', 'true north falls back to protected value');
  assert(fallback.essentialNeedId === 'rest', 'essential need falls back to neglected');
  assert(projectInnerCompass([]).trueNorthValueId === null, 'empty → null true north');

  assert(getChapterConfirmedOutput('inner_compass', answers) !== null, 'inner_compass has a projector');
}

function testLivingHorizonProjector(): void {
  assert(
    getChapterActivities('living_horizon').every((a) => a.authored),
    'chapter 3 activities are authored',
  );
  assert(
    getChapterActivities('living_horizon').every((a) => a.islandNumber >= 41 && a.islandNumber <= 60),
    'chapter 3 covers islands 41–60',
  );

  const answers: CompassAnswerRecord[] = [
    choice('living_horizon.a02', 'essential_scene', 'creating'),
    choice('living_horizon.a03', 'rhythm', 'mostly_free'),
    choice('living_horizon.a05', 'environment', 'coast'),
    choice('living_horizon.a07', 'social_intensity', 'small_circle'),
    choice('living_horizon.a10', 'work_mode', 'create'),
    choice('living_horizon.a14', 'challenge', 'mastery'),
    choice('living_horizon.a16', 'financial_enough', 'comfortable'),
    choice('living_horizon.a18', 'anti_vision', 'rich_but_empty'),
    choice('living_horizon.a19', 'price_not_paid', 'health'),
    makeAnswer('living_horizon.a08', 'relationships', { kind: 'multi_choice', optionIds: ['partner', 'close_friends'] }),
    makeAnswer('living_horizon.a20', 'horizon_statement', { kind: 'text', text: 'Coastal, creative, unhurried' }),
  ];
  const out = projectLivingHorizon(answers);
  assert(out.essentialSceneId === 'creating', 'essential scene mapped');
  assert(out.desiredRhythmId === 'mostly_free', 'desired rhythm mapped');
  assert(out.environmentId === 'coast', 'environment (Sanctuary) mapped');
  assert(out.workModeId === 'create', 'work mode (Workshop) mapped');
  assert(out.priceNotPaidId === 'health', 'price not paid mapped');
  assert(out.relationshipIds.length === 2, 'relationships captured');
  assert(out.horizonStatement === 'Coastal, creative, unhurried', 'horizon statement passes through');
  assert(projectLivingHorizon([]).essentialSceneId === null, 'empty → null');
  assert(getChapterConfirmedOutput('living_horizon', answers) !== null, 'living_horizon has a projector');
}

function testIkigaiMapProjector(): void {
  assert(
    getChapterActivities('ikigai_map').every((a) => a.authored),
    'chapter 4 activities are authored',
  );
  assert(
    getChapterActivities('ikigai_map').every((a) => a.islandNumber >= 61 && a.islandNumber <= 80),
    'chapter 4 covers islands 61–80',
  );

  const base: CompassAnswerRecord[] = [
    choice('ikigai_map.a04', 'spark_pick', 'writing'),
    choice('ikigai_map.a08', 'gift_pick', 'teaching'),
    choice('ikigai_map.a12', 'need_pick', 'education'),
    choice('ikigai_map.a13', 'income_potential', 'moderate'),
    choice('ikigai_map.a15', 'horizon_fit', 'strong'),
    makeAnswer('ikigai_map.a18', 'path_a', { kind: 'text', text: 'Teach writing to beginners' }),
    makeAnswer('ikigai_map.a18', 'path_b', { kind: 'text', text: 'Edit indie authors' }),
    choice('ikigai_map.a19', 'trial_choice', 'path_a'),
    makeAnswer('ikigai_map.a19', 'trial_experiment', { kind: 'text', text: 'Run one free workshop' }),
    choice('ikigai_map.a19', 'path_type', 'experimental'),
  ];

  // Willing → no mirage.
  const willing = projectIkigaiMap([
    ...base,
    choice('ikigai_map.a16', 'process_tolerance', 'love_process'),
    choice('ikigai_map.a17', 'beginner_willingness', 'eager'),
  ]);
  assert(willing.sparkId === 'writing', 'spark mapped');
  assert(willing.giftId === 'teaching', 'gift mapped');
  assert(willing.needId === 'education', 'need mapped');
  assert(willing.paths.length === 2, 'paths collected');
  assert(willing.trialPath === 'Teach writing to beginners', 'trial resolves to chosen path text');
  assert(willing.mirageWarning === false, 'willing player has no mirage warning');

  // Disliking the process → mirage warning.
  const mirage = projectIkigaiMap([
    ...base,
    choice('ikigai_map.a16', 'process_tolerance', 'dislike'),
    choice('ikigai_map.a17', 'beginner_willingness', 'eager'),
  ]);
  assert(mirage.mirageWarning === true, 'disliking the daily work raises a mirage warning');

  // Quest Leap proposal (architecture seam): proposes from the chosen trial.
  const proposal = buildQuestLeapProposalFromIkigai(willing);
  assert(proposal !== null, 'quest leap proposal built from a chosen trial');
  assert(proposal!.action === 'Run one free workshop', 'proposal action = trial experiment');
  assert(proposal!.durationType === 'three_days', 'default leap duration');
  assert(proposal!.evidenceQuestions.length === 3, 'proposal carries evidence questions');
  assert(buildQuestLeapProposalFromIkigai(projectIkigaiMap([])) === null, 'no trial → no proposal');

  assert(getChapterConfirmedOutput('ikigai_map', base) !== null, 'ikigai_map has a projector');
}

function testQuestForgeAndGoalBridge(): void {
  assert(
    getChapterActivities('quest_forge').every((a) => a.authored),
    'chapter 5 activities are authored',
  );
  assert(
    getChapterActivities('quest_forge').every((a) => a.islandNumber >= 81 && a.islandNumber <= 100),
    'chapter 5 covers islands 81–100',
  );

  const answers: CompassAnswerRecord[] = [
    makeAnswer('quest_forge.a01', 'quest_a', { kind: 'text', text: 'Launch a small course' }),
    makeAnswer('quest_forge.a02', 'quest_b', { kind: 'text', text: 'Run a half marathon' }),
    choice('quest_forge.a04', 'primary_candidate', 'quest_a'),
    choice('quest_forge.a11', 'wheel_impact', 'career_development'),
    choice('quest_forge.a18', 'support_quest', 'quest_b'),
    choice('quest_forge.a18', 'release_quest', 'none'),
    choice('quest_forge.a19', 'accepted_cost', 'comfort'),
    makeAnswer('quest_forge.a19', 'protected_flame', { kind: 'text', text: 'Family weekends' }),
    makeAnswer('quest_forge.a20', 'calling', { kind: 'text', text: 'Help people learn' }),
    makeAnswer('quest_forge.a20', 'first_milestone', { kind: 'text', text: 'Publish lesson 1' }),
    makeAnswer('quest_forge.a20', 'success_evidence', { kind: 'text', text: '10 finishers' }),
    choice('quest_forge.a20', 'review_point', '4_weeks'),
  ];

  const out = projectQuestForge(answers);
  assert(out.primaryQuestTitle === 'Launch a small course', 'primary quest resolves from primary_candidate');
  assert(out.supportingQuestTitle === 'Run a half marathon', 'supporting quest resolves');
  assert(out.releasedQuestTitle === null, 'released quest = none → null');
  assert(out.wheelImpactAreaId === 'career_development', 'wheel impact mapped to canonical area key');

  // Goal proposal builder is PURE — proposes only, never creates.
  const proposal = buildGoalProposalFromQuestForge(out, new Date('2026-06-21T00:00:00Z'));
  assert(proposal !== null, 'goal proposal built from a primary quest');
  assert(proposal!.title === 'Launch a small course', 'proposal title = primary quest');
  assert(proposal!.lifeWheelCategory === 'career_development', 'proposal carries canonical life area');
  assert(proposal!.reviewDate === '2026-07-19', 'review date = +4 weeks (deterministic)');
  assert(proposal!.originChapterId === 'quest_forge', 'provenance retained');
  assert(describeGoalProposal(proposal!).includes('Quest Forge'), 'description carries provenance');

  // No primary quest → no proposal (the bridge renders nothing, creates nothing).
  assert(buildGoalProposalFromQuestForge(projectQuestForge([])) === null, 'no primary quest → no proposal');

  // Default (typed text) → no existing-goal link → the bridge creates a new goal.
  assert(out.primaryQuestSourceGoalId === null, 'typed primary quest has no source goal id');
  assert(proposal!.existingGoalId === null, 'typed primary quest → proposal creates new');

  // Picked from an existing goal → the source id flows through to the proposal so
  // the bridge updates that goal instead of creating a duplicate.
  const pickedAnswers: CompassAnswerRecord[] = [
    makeAnswer('quest_forge.a01', 'quest_a', {
      kind: 'text',
      text: 'Launch a small course',
      sourceRef: { kind: 'goal', id: 'goal-123' },
    }),
    choice('quest_forge.a04', 'primary_candidate', 'quest_a'),
  ];
  const pickedOut = projectQuestForge(pickedAnswers);
  assert(pickedOut.primaryQuestSourceGoalId === 'goal-123', 'primary quest source goal id resolved from picked slot');
  assert(
    buildGoalProposalFromQuestForge(pickedOut)!.existingGoalId === 'goal-123',
    'picked primary quest → proposal updates the existing goal',
  );
  // A habit-kind sourceRef must NOT be read as a goal id.
  const wrongKind = projectQuestForge([
    makeAnswer('quest_forge.a01', 'quest_a', {
      kind: 'text',
      text: 'A goal',
      sourceRef: { kind: 'habit', id: 'habit-9' },
    }),
    choice('quest_forge.a04', 'primary_candidate', 'quest_a'),
  ]);
  assert(wrongKind.primaryQuestSourceGoalId === null, 'habit sourceRef is not treated as a goal id');

  assert(getChapterConfirmedOutput('quest_forge', answers) !== null, 'quest_forge has a projector');
}

function testPersonalPlaybookAndHabitBridge(): void {
  assert(
    getChapterActivities('personal_playbook').every((a) => a.authored),
    'chapter 6 activities are authored',
  );
  assert(
    getChapterActivities('personal_playbook').every((a) => a.islandNumber >= 101 && a.islandNumber <= 120),
    'chapter 6 covers islands 101–120',
  );

  const answers: CompassAnswerRecord[] = [
    choice('personal_playbook.a04', 'start_style', 'ritual'),
    choice('personal_playbook.a06', 'start_cue', 'after_waking'),
    choice('personal_playbook.a07', 'momentum_signal', 'small_wins'),
    makeAnswer('personal_playbook.a08', 'the_habit', { kind: 'text', text: 'Write for 30 minutes' }),
    makeAnswer('personal_playbook.a09', 'completion_evidence', { kind: 'text', text: 'One paragraph saved' }),
    makeAnswer('personal_playbook.a10', 'small_version', { kind: 'text', text: 'Write for 5 minutes' }),
    makeAnswer('personal_playbook.a11', 'minimum_version', { kind: 'text', text: 'Open the doc' }),
    choice('personal_playbook.a15', 'env_rule', 'prepare'),
    makeAnswer('personal_playbook.a16', 'env_detail', { kind: 'text', text: 'Open the doc the night before' }),
    choice('personal_playbook.a17', 'recovery_route', 'reduce'),
    choice('personal_playbook.a18', 'protected_area', 'health_fitness'),
    makeAnswer('personal_playbook.a20', 'operating_principle', { kind: 'text', text: 'Start tiny, protect sleep' }),
  ];

  const out = projectPersonalPlaybook(answers);
  assert(out.startEngineId === 'ritual', 'start engine mapped');
  assert(out.habitNormal === 'Write for 30 minutes', 'habit normal version mapped');
  assert(out.protectedAreaId === 'health_fitness', 'protected area = canonical key');

  // Habit proposal builder is PURE — proposes only, never creates.
  const proposal = buildHabitProposalFromPlaybook(out);
  assert(proposal !== null, 'habit proposal built from a named habit');
  assert(proposal!.normalVersion === 'Write for 30 minutes', 'proposal normal version');
  assert(proposal!.smallVersion === 'Write for 5 minutes', 'proposal small version');
  assert(proposal!.cue === 'After waking', 'cue resolved to label');
  assert(proposal!.environmentRule === 'Prepare (set it up): Open the doc the night before', 'env rule composed');
  assert(proposal!.protectedAreaId === 'health_fitness', 'protected area carried');
  assert(describeHabitIntent(proposal!).includes('Personal Playbook'), 'intent carries provenance');
  assert(describeHabitIntent(proposal!).includes('Minimum: Open the doc'), 'intent carries minimum mode');

  // No habit named → no proposal (the bridge renders nothing, creates nothing).
  assert(buildHabitProposalFromPlaybook(projectPersonalPlaybook([])) === null, 'no habit → no proposal');

  // Default (typed habit) → no existing-habit link → the bridge creates a new habit.
  assert(out.habitSourceId === null, 'typed habit has no source habit id');
  assert(proposal!.existingHabitId === null, 'typed habit → proposal creates new');

  // Picked from an existing habit → the source id flows through to the proposal.
  const pickedOut = projectPersonalPlaybook([
    makeAnswer('personal_playbook.a08', 'the_habit', {
      kind: 'text',
      text: 'Write for 30 minutes',
      sourceRef: { kind: 'habit', id: 'habit-77' },
    }),
  ]);
  assert(pickedOut.habitSourceId === 'habit-77', 'habit source id resolved from picked habit');
  assert(
    buildHabitProposalFromPlaybook(pickedOut)!.existingHabitId === 'habit-77',
    'picked habit → proposal updates the existing habit',
  );

  const missionStart = Date.parse('2026-07-01T09:00:00.000Z');
  const timedAnswer = (
    activityId: string,
    answeredAt: string,
  ): CompassAnswerRecord => ({
    ...makeAnswer(activityId, 'mission_test', { kind: 'text', text: 'ready' }),
    answeredAt,
    updatedAt: answeredAt,
  });
  const launchInTime = calculatePersonalPlaybookMission({
    systemReady: [true, true, true, true, true, true, true],
    answers: [
      timedAnswer('personal_playbook.a01', new Date(missionStart).toISOString()),
      timedAnswer('personal_playbook.a20', new Date(missionStart + 6 * 24 * 60 * 60 * 1000).toISOString()),
    ],
    nowMs: missionStart + 6 * 24 * 60 * 60 * 1000,
  });
  assert(launchInTime.launched, 'seven ready systems inside seven days launch the rocket');

  const launchTooLate = calculatePersonalPlaybookMission({
    systemReady: [true, true, true, true, true, true, true],
    answers: [
      timedAnswer('personal_playbook.a01', new Date(missionStart).toISOString()),
      timedAnswer('personal_playbook.a20', new Date(missionStart + 8 * 24 * 60 * 60 * 1000).toISOString()),
    ],
    nowMs: missionStart + 8 * 24 * 60 * 60 * 1000,
  });
  assert(!launchTooLate.launched, 'finishing after the seven-day window does not fake a launch');
  assert(launchTooLate.readyCount === 7, 'missing the launch window never deletes completed systems');
}

function testCompassAiCore(): void {
  const choiceBlock: CompassBlockDefinition = {
    questionId: 'q1',
    type: 'single_choice',
    prompt: 'Pick one',
    required: true,
    options: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
  };
  const textBlock: CompassBlockDefinition = {
    questionId: 'q2',
    type: 'short_text',
    prompt: 'Say something',
    required: true,
  };

  // Privacy: request carries only this question — no other answers/fields.
  const req = buildCompassHelpRequest('living_wheel', choiceBlock, '  ');
  assert(req.questionId === 'q1' && req.prompt === 'Pick one', 'request carries the block');
  assert(req.options?.length === 2, 'request carries the block options');
  assert(req.currentDraft === undefined, 'blank draft is omitted');
  assert(!('answers' in (req as Record<string, unknown>)), 'request never includes other answers');

  // Defensive parsing — never throws, handles every bad case.
  assert(parseCompassHelpResponse(null) === null, 'null → null');
  assert(parseCompassHelpResponse('not json') === null, 'string → null');
  assert(parseCompassHelpResponse({}) === null, 'empty object → null');
  assert(parseCompassHelpResponse({ suggestion: '' }) === null, 'empty suggestion + nothing → null');
  const valid = parseCompassHelpResponse({ suggestion: 'One possibility…' });
  assert(valid?.suggestion === 'One possibility…', 'valid suggestion parsed');
  const partial = parseCompassHelpResponse({ recommendedOptionIds: ['a', 5, ''] });
  assert(partial !== null && partial.recommendedOptionIds?.length === 1, 'non-string option ids filtered');
  assert(partial !== null && partial.suggestion.length > 0, 'partial gets a default suggestion');

  // Apply mapping — proposes only; rejects invalid ids; never throws.
  const applied = applyHelpToValue(choiceBlock, { suggestion: 's', recommendedOptionIds: ['b'] });
  assert(applied?.kind === 'choice' && applied.optionId === 'b', 'valid recommendation → choice value');
  assert(
    applyHelpToValue(choiceBlock, { suggestion: 's', recommendedOptionIds: ['zzz'] }) === null,
    'invalid option id → no value (never auto-applies junk)',
  );
  const textApplied = applyHelpToValue(textBlock, { suggestion: 's', draftText: 'A draft' });
  assert(textApplied?.kind === 'text' && textApplied.text === 'A draft', 'draftText → text value');
  assert(applyHelpToValue(textBlock, { suggestion: 's' }) === null, 'no draftText → no text value');
}

function testIslandFragment(): void {
  // Island 19 (living_wheel.a19): two required area taps + one optional free-text.
  // All answerable inputs stay in Wisdom; Habit is reserved for real-world action.
  const f19 = getIslandFragment(19);
  assert(f19 !== null, 'island 19 has a fragment');
  assert(f19!.activityId === 'living_wheel.a19', 'fragment maps to the island activity');
  assert(f19!.inputs.length === 3, 'island 19 has three answerable inputs');
  assert(f19!.wisdom.length === 3, 'all three compact inputs remain together in Wisdom');
  assert(f19!.wisdom.length <= WISDOM_STOP_MAX_INPUTS, 'Wisdom stays within its four-input quality gate');
  assert(f19!.wisdom.some((b) => b.questionId === 'next_move'), 'optional free-text remains in Wisdom');
  assert(f19!.habitOverflow.length === 0, 'Habit never receives Compass overflow');

  // Slice completeness: Wisdom needs both required taps; retired overflow is empty.
  assert(!isFragmentSlotComplete(f19!, 'wisdom', {}), 'empty wisdom slice is incomplete');
  assert(
    !isFragmentSlotComplete(f19!, 'wisdom', {
      candidate_lever: { kind: 'choice', optionId: 'health_fitness' },
    }),
    'one of two required taps is still incomplete',
  );
  const bothTaps = {
    candidate_lever: { kind: 'choice', optionId: 'health_fitness' } as CompassAnswerValue,
    next_move_area: { kind: 'choice', optionId: 'health_fitness' } as CompassAnswerValue,
  };
  assert(isFragmentSlotComplete(f19!, 'wisdom', bothTaps), 'both required taps complete the wisdom slice');
  assert(isFragmentSlotComplete(f19!, 'habit_overflow', {}), 'optional overflow slice is complete when empty');

  // Whole-island gating: only required inputs gate; the optional next_move does not.
  assert(!isIslandFragmentComplete(19, {}), 'island 19 incomplete with no answers');
  assert(isIslandFragmentComplete(19, bothTaps), 'island 19 complete once required taps are answered');

  // Seal island (living_wheel.a20): the confirmation/review blocks are excluded;
  // only the finale statement remains an answerable input.
  const f20 = getIslandFragment(20);
  assert(f20 !== null && f20.inputs.length === 1, 'seal island exposes only the finale statement input');
  assert(
    f20!.inputs[0].questionId === 'wheel_statement',
    'seal island input is the statement (confirmation/review excluded)',
  );

  // No activity for the island → no fragment, and gating is trivially satisfied.
  assert(getIslandFragment(999) === null, 'out-of-range island has no fragment');
  assert(isIslandFragmentComplete(999, {}), 'no fragment → trivially complete (never blocks a stop)');

  // splitIslandInputs is a pure answerable-input selector.
  const a20 = getActivityDefinition('living_wheel.a20');
  const split = splitIslandInputs(a20!);
  assert(split.inputs.every((b) => b.type !== 'review' && b.type !== 'confirmation'), 'split excludes non-input blocks');
  assert(split.habitOverflow.length === 0, 'split never routes reflection into Habit');
}

function testPlayerOptionPickers(): void {
  // Normalization: trim labels, drop blank/idless, de-dupe by id (first wins).
  const normalized = normalizePlayerOptions([
    { id: 'g1', label: '  Launch a course  ' },
    { id: 'g2', label: '' },
    { id: '', label: 'No id' },
    { id: 'g1', label: 'Duplicate id, ignored' },
    { id: 'g3', label: 'Run a half marathon' },
  ]);
  assert(normalized.length === 2, 'blank label, missing id, and duplicate id are dropped');
  assert(normalized[0].id === 'g1' && normalized[0].label === 'Launch a course', 'label trimmed; first id wins');
  assert(normalized[1].id === 'g3', 'order preserved');

  // Cap: never floods a fragment with more than MAX_PICK_OPTIONS chips.
  const many = Array.from({ length: MAX_PICK_OPTIONS + 5 }, (_, i) => ({
    id: `g${i}`,
    label: `Goal ${i}`,
  }));
  assert(normalizePlayerOptions(many).length === MAX_PICK_OPTIONS, 'option list is capped');

  // Source selection + noun.
  const data = {
    goals: normalizePlayerOptions([{ id: 'g1', label: 'A goal' }]),
    habits: normalizePlayerOptions([{ id: 'h1', label: 'A habit' }]),
  };
  assert(optionsForPickSource(data, 'player_goals')[0].id === 'g1', 'goals source resolves goals');
  assert(optionsForPickSource(data, 'player_habits')[0].id === 'h1', 'habits source resolves habits');
  assert(pickSourceNoun('player_goals') === 'goals', 'goals noun');
  assert(pickSourceNoun('player_habits') === 'habits', 'habits noun');

  // Empty data → empty options (picker renders nothing, falls back to text).
  assert(optionsForPickSource(EMPTY_COMPASS_PLAYER_DATA, 'player_goals').length === 0, 'empty data → no goal chips');
  assert(optionsForPickSource(EMPTY_COMPASS_PLAYER_DATA, 'player_habits').length === 0, 'empty data → no habit chips');

  // Content wiring: the goal/habit "name it" prompts declare a pick source, and
  // they stay text blocks so projectors/bridges are unaffected.
  const questA = getActivityDefinition('quest_forge.a01')?.blocks.find((b) => b.questionId === 'quest_a');
  assert(questA?.type === 'short_text' && questA.pickFrom === 'player_goals', 'quest_a picks from goals, stays text');
  const theHabit = getActivityDefinition('personal_playbook.a08')?.blocks.find((b) => b.questionId === 'the_habit');
  assert(theHabit?.type === 'short_text' && theHabit.pickFrom === 'player_habits', 'the_habit picks from habits, stays text');
}

function testShadowBridge(): void {
  const shadowOptionIds = new Set(SHADOW_OPTIONS.map((option) => option.id));

  // The mapping must cover every archetype exactly, with valid Chapter-2 option ids.
  const deckIds = new Set(ARCHETYPE_DECK.map((card) => card.id));
  const mappedIds = Object.keys(SUGGESTED_SHADOW_OPTION_BY_ARCHETYPE);
  assert(mappedIds.length === ARCHETYPE_DECK.length, 'shadow mapping covers whole deck');
  for (const [archetypeId, optionId] of Object.entries(SUGGESTED_SHADOW_OPTION_BY_ARCHETYPE)) {
    assert(deckIds.has(archetypeId), `mapping references real archetype: ${archetypeId}`);
    assert(shadowOptionIds.has(optionId), `mapping targets real shadow option: ${optionId}`);
  }

  // Every hint question id must exist in Chapter 2 as a single_choice over SHADOW_OPTIONS.
  const chapterBlocks = chapter2InnerCompass.activities.flatMap((activity) => activity.blocks);
  for (const questionId of SHADOW_HINT_QUESTION_IDS) {
    const block = chapterBlocks.find((entry) => entry.questionId === questionId);
    assert(!!block, `hint question exists in chapter 2: ${questionId}`);
    assert(block!.type === 'single_choice', `hint question is single choice: ${questionId}`);
    assert(
      (block!.options ?? []).every((option) => shadowOptionIds.has(option.id)),
      `hint question uses shadow options: ${questionId}`,
    );
  }

  // A leader-shaped profile: dominant differs from shadow, suggestion is valid.
  const scores = coercePersonalityScores(
    {
      openness: 45,
      conscientiousness: 85,
      extraversion: 90,
      agreeableness: 40,
      emotional_stability: 75,
    },
    { regulation_style: 80, stress_response: 70, identity_sensitivity: 40, cognitive_entry: 60 },
  );
  const bridge = buildShadowBridgeData(scores);
  assert(bridge.dominantId !== bridge.shadowId, 'dominant and shadow differ');
  assert(deckIds.has(bridge.dominantId), 'dominant is a real card');
  assert(deckIds.has(bridge.shadowId), 'shadow is a real card');
  assert(bridge.dominantStressBehavior.length > 0, 'dominant stress behaviour present');
  assert(bridge.shadowGift.length > 0, 'shadow gift present');
  assert(
    bridge.suggestedShadowOptionId !== null && shadowOptionIds.has(bridge.suggestedShadowOptionId),
    'suggestion resolves to a shadow option',
  );

  // Pre-fix records stored phantom 0s for HEXACO axes; coercion must pin them
  // to neutral so old records don't bias the recomputed hand.
  const legacy = coercePersonalityScores(
    { openness: 45, conscientiousness: 85, extraversion: 90, agreeableness: 40, emotional_stability: 75 },
    {
      regulation_style: 80,
      stress_response: 70,
      identity_sensitivity: 40,
      cognitive_entry: 60,
      honesty_humility: 0,
      emotionality: 0,
    },
  );
  assert(legacy.axes.honesty_humility === 50, 'legacy phantom honesty_humility pinned to neutral');
  assert(legacy.axes.emotionality === 50, 'legacy phantom emotionality pinned to neutral');
  const legacyBridge = buildShadowBridgeData(legacy);
  assert(legacyBridge.shadowId === bridge.shadowId, 'legacy record yields same shadow as clean record');

  // Values bridge: the mapping covers the whole deck with valid VALUE_OPTIONS ids,
  // core_values is a real multi_choice question, and a hand yields deduped suggestions.
  const valueOptionIds = new Set(VALUE_OPTIONS.map((option) => option.id));
  assert(
    Object.keys(SUGGESTED_VALUES_BY_ARCHETYPE).length === ARCHETYPE_DECK.length,
    'value mapping covers whole deck',
  );
  for (const [archetypeId, valueIds] of Object.entries(SUGGESTED_VALUES_BY_ARCHETYPE)) {
    assert(deckIds.has(archetypeId), `value mapping references real archetype: ${archetypeId}`);
    assert(valueIds.length > 0, `value mapping has values: ${archetypeId}`);
    for (const valueId of valueIds) {
      assert(valueOptionIds.has(valueId), `value mapping targets real value option: ${valueId}`);
    }
  }
  for (const questionId of VALUE_HINT_QUESTION_IDS) {
    const block = chapterBlocks.find((entry) => entry.questionId === questionId);
    assert(!!block, `value hint question exists in chapter 2: ${questionId}`);
    assert(block!.type === 'multi_choice', `value hint question is multi choice: ${questionId}`);
    assert(
      (block!.options ?? []).every((option) => valueOptionIds.has(option.id)),
      `value hint question uses value options: ${questionId}`,
    );
  }
  assert(bridge.suggestedValueIds.length > 0, 'bridge produces value suggestions');
  assert(
    bridge.suggestedValueIds.every((id) => valueOptionIds.has(id)),
    'suggested values are real options',
  );
  assert(
    new Set(bridge.suggestedValueIds).size === bridge.suggestedValueIds.length,
    'suggested values are deduped',
  );
}

function testReading(): void {
  const activities = getChapterActivities('living_wheel');
  const sealActivity = activities[activities.length - 1];

  const emptyProgress = (chapterId: CompassBookChapterId) =>
    computeChapterProgress(chapterId, null, { currentIslandNumber: 0 });

  // Page ids: the Reading leads, then the six chapters in canonical order,
  // then the Quest Ledger closes the book.
  assert(COMPASS_BOOK_PAGE_IDS[0] === 'reading', 'the Reading is the first page');
  assert(
    COMPASS_BOOK_PAGE_IDS.length === COMPASS_BOOK_CHAPTER_IDS.length + 2,
    'eight pages: the Reading, six chapters, and the Quest Ledger',
  );
  assert(
    COMPASS_BOOK_PAGE_IDS[COMPASS_BOOK_PAGE_IDS.length - 1] === 'quest_ledger',
    'the Quest Ledger is the last page',
  );
  assert(!isChapterPage('reading'), 'the Reading is not a chapter page');
  assert(!isChapterPage('quest_ledger'), 'the Quest Ledger is not a chapter page');
  assert(isChapterPage('living_wheel'), 'a chapter id is a chapter page');

  assert(chapterNumeral(1) === 'I', 'chapter 1 is I');
  assert(chapterNumeral(6) === 'VI', 'chapter 6 is VI');

  // Nothing reached: every row is present and "ahead" — locked never means hidden.
  const untouched = summarizeCompassReading({
    getProgress: emptyProgress,
    getChapterState: () => null,
  });
  assert(untouched.rows.length === 6, 'the Reading always lists all six chapters');
  assert(
    untouched.rows.every((row) => row.status === 'ahead'),
    'island 0 → every chapter reads as ahead',
  );
  assert(
    untouched.rows.every((row) => row.headline === null && row.promise.length > 0),
    'an unwritten row still carries the chapter promise',
  );
  assert(untouched.fragmentsTotal === 120, 'the book totals 120 fragments');
  assert(untouched.fragmentsWritten === 0, 'nothing written yet');
  assert(untouched.fragmentsOpen === 0, 'nothing unlocked at island 0');
  assert(untouched.writtenRows.length === 0, 'no written rows yet');
  assert(untouched.openCount === 0, 'nothing answerable at island 0');
  assert(untouched.focusChapterId === null, 'no focus when nothing is open');
  assert(
    untouched.rows[0].unlockIsland === 1 && untouched.rows[5].unlockIsland === 101,
    'rows carry the island that opens them',
  );

  // A written statement becomes the row headline, in the player's own words.
  const stateWithStatement = baseState([
    makeAnswer(sealActivity.id, 'wheel_statement', {
      kind: 'text',
      text: '  Steady on health, easing off work.  ',
    }),
  ]);
  assert(
    chapterHeadline('living_wheel', stateWithStatement) === 'Steady on health, easing off work.',
    'headline is the trimmed wheel statement',
  );
  assert(chapterHeadline('living_wheel', null) === null, 'no state → no headline');
  assert(
    chapterHeadline('living_wheel', baseState([])) === null,
    'no answers → no headline',
  );
  assert(
    chapterHeadline('living_wheel', baseState([
      makeAnswer(sealActivity.id, 'wheel_statement', { kind: 'text', text: '   ' }),
    ])) === null,
    'a blank statement is not a headline',
  );

  // Reaching islands opens chapters and moves the focus forward.
  const reached = summarizeCompassReading({
    getProgress: (chapterId) =>
      computeChapterProgress(
        chapterId,
        chapterId === 'living_wheel' ? stateWithStatement : null,
        { currentIslandNumber: 25 },
      ),
    getChapterState: (chapterId) => (chapterId === 'living_wheel' ? stateWithStatement : null),
  });
  assert(reached.openCount === 2, 'island 25 opens chapters I and II');
  assert(reached.fragmentsOpen === 25, 'island 25 → 25 fragments answerable (20 + 5)');
  assert(reached.rows[0].unlockedCount === 20 && reached.rows[1].unlockedCount === 5,
    'per-row unlocked counts follow island position');
  assert(reached.rows[0].status === 'charting', 'answered chapter reads as charting');
  assert(reached.rows[2].status === 'ahead', 'chapter III is still ahead at island 25');
  assert(reached.focusChapterId === 'living_wheel', 'focus is the first unfinished open chapter');
  assert(reached.writtenRows.length === 1, 'one chapter carries a written line');
  assert(reached.rows[0].headline === 'Steady on health, easing off work.', 'row shows the line');

  // A sealed chapter reads as sealed regardless of how many fragments are done.
  const sealed: CompassChapterState = { ...stateWithStatement, confirmedOutput: {} };
  const sealedSummary = summarizeCompassReading({
    getProgress: (chapterId) =>
      computeChapterProgress(chapterId, chapterId === 'living_wheel' ? sealed : null, {
        currentIslandNumber: 25,
      }),
    getChapterState: (chapterId) => (chapterId === 'living_wheel' ? sealed : null),
  });
  assert(sealedSummary.rows[0].status === 'sealed', 'confirmed output → sealed row');
  assert(sealedSummary.sealedCount === 1, 'one chapter sealed');
  assert(
    sealedSummary.focusChapterId === 'inner_compass',
    'focus skips a sealed chapter for the next open one',
  );
}

function testPageTurn(): void {
  // Page order: the Reading, then the six chapters.
  assert(pageIndex('reading') === 0, 'the Reading is page 0');
  assert(pageIndex('living_wheel') === 1, 'chapter I is page 1');
  assert(pageIndex('personal_playbook') === 6, 'chapter VI is page 6');
  assert(pageIndex('quest_ledger') === 7, 'the Quest Ledger is page 7');
  assert(turnDirection('personal_playbook', 'quest_ledger') === 'forward', 'VI → Ledger turns forward');
  assert(turnDirection('quest_ledger', 'reading') === 'back', 'Ledger → Reading turns back');
  assert(turnDistance('reading', 'quest_ledger') === 7, 'Reading → Ledger crosses seven sheets');

  // Opening the book is not a turn — the cover owns that moment.
  assert(turnDirection(null, 'reading') === 'none', 'first render does not turn');
  assert(turnDirection(null, 'quest_forge') === 'none', 'deep link does not turn');

  // Direction follows page order, not which page is "more important".
  assert(turnDirection('reading', 'living_wheel') === 'forward', 'Reading → I turns forward');
  assert(turnDirection('living_wheel', 'personal_playbook') === 'forward', 'I → VI turns forward');
  assert(turnDirection('personal_playbook', 'reading') === 'back', 'VI → Reading turns back');
  assert(turnDirection('inner_compass', 'living_wheel') === 'back', 'II → I turns back');
  assert(turnDirection('ikigai_map', 'ikigai_map') === 'none', 'same page does not turn');

  assert(turnClassName('forward') === 'compass-book__page--turn-forward', 'forward class');
  assert(turnClassName('back') === 'compass-book__page--turn-back', 'back class');
  assert(turnClassName('none') === null, 'no class when there is no turn');

  // Distance drives duration, clamped so navigation never feels slow.
  assert(turnDistance(null, 'living_wheel') === 0, 'no distance without an origin');
  assert(turnDistance('reading', 'living_wheel') === 1, 'adjacent pages are one apart');
  assert(turnDistance('living_wheel', 'personal_playbook') === 5, 'I → VI crosses five sheets');
  assert(turnDistance('personal_playbook', 'living_wheel') === 5, 'distance is unsigned');

  assert(turnDurationMs(0) === 0, 'no turn takes no time');
  assert(turnDurationMs(1) === TURN_MIN_MS, 'a single-page turn uses the base duration');
  assert(
    turnDurationMs(5) > TURN_MIN_MS && turnDurationMs(5) <= TURN_MAX_MS,
    'a longer jump takes longer, within the cap',
  );
  assert(turnDurationMs(99) === TURN_MAX_MS, 'duration is capped');
}

function testDemoBook(): void {
  const states = buildDemoChapterStates();

  // Default shape: five chapters written, three sealed, chapter VI untouched so
  // the "not reached yet" treatment is still visible in the demo.
  assert(Object.keys(states).length === 5, 'demo writes five chapters by default');
  assert(states.personal_playbook === undefined, 'chapter VI stays unwritten');

  const sealed = Object.values(states).filter((s) => s && s.confirmedOutput != null);
  assert(sealed.length === 4, 'demo seals four chapters');
  assert(states.quest_forge?.confirmedOutput != null, 'the Quest Forge is sealed');
  assert(states.ikigai_map?.confirmedOutput == null, 'a half-written chapter remains');

  // Every generated answer must point at a question that really exists, or the
  // projectors silently produce nothing. This is the guard that keeps demo data
  // honest when the curriculum changes.
  for (const chapterId of COMPASS_BOOK_CHAPTER_IDS) {
    const state = states[chapterId];
    if (!state) continue;
    const activities = getChapterActivities(chapterId);
    const known = new Map(activities.map((a) => [a.id, new Set(a.blocks.map((b) => b.questionId))]));
    for (const answer of state.answers) {
      const blocks = known.get(answer.activityId);
      assert(!!blocks, `demo answer targets a real activity: ${answer.activityId}`);
      assert(
        blocks!.has(answer.questionId),
        `demo answer targets a real question: ${answer.activityId}/${answer.questionId}`,
      );
      assert(isAnswerValuePresent(answer.value), `demo answer carries a value: ${answer.questionId}`);
    }
    assert(state.contentVersion === 'v1', 'demo state uses the current curriculum version');
  }

  // Choice answers must reference real option ids, not invented ones.
  for (const chapter of COMPASS_BOOK_CHAPTERS) {
    for (const activity of chapter.activities) {
      for (const block of activity.blocks) {
        const value = demoValueForBlock(block);
        if (!value) continue;
        const optionIds = new Set((block.options ?? []).map((o) => o.id));
        if (value.kind === 'choice' || value.kind === 'emotion') {
          assert(optionIds.has(value.optionId), `demo picks a real option: ${block.questionId}`);
        }
        if (value.kind === 'multi_choice' || value.kind === 'ranking') {
          const ids = value.kind === 'multi_choice' ? value.optionIds : value.orderedOptionIds;
          assert(ids.length > 0, `demo multi/ranking is non-empty: ${block.questionId}`);
          assert(
            ids.every((id) => optionIds.has(id)),
            `demo multi/ranking uses real options: ${block.questionId}`,
          );
        }
        if (value.kind === 'scale') {
          const min = block.min ?? 0;
          const max = block.max ?? 10;
          assert(
            value.value >= min && value.value <= max,
            `demo scale is in range: ${block.questionId}`,
          );
        }
        if (value.kind === 'text') {
          assert(value.text.trim().length > 0, `demo text is non-empty: ${block.questionId}`);
        }
      }
    }
  }

  // The demo must actually make the book say something — a filled book whose
  // Reading is still blank would defeat the entire purpose.
  const summary = summarizeCompassReading({
    getProgress: (chapterId) =>
      computeChapterProgress(chapterId, states[chapterId] ?? null, {
        currentIslandNumber: DEMO_ISLAND_NUMBER,
      }),
    getChapterState: (chapterId) => states[chapterId] ?? null,
  });
  assert(summary.fragmentsWritten > 40, 'demo fills a substantial part of the book');
  assert(summary.sealedCount === 4, 'demo reading reports four sealed chapters');
  assert(summary.writtenRows.length >= 4, 'demo produces real headlines to show');
  assert(
    summary.rows[0].headline ===
      'This is a season of rebuilding my health so everything else stops leaking.',
    'the curated wheel statement reaches the Reading',
  );
  assert(
    summary.rows.some((row) => row.status === 'ahead'),
    'demo still shows an unreached chapter',
  );

  // The Quest Forge goal bridge should have something to propose.
  const forge = states.quest_forge;
  assert(!!forge, 'demo writes the Quest Forge');
  const proposal = buildGoalProposalFromQuestForge(projectQuestForge(forge!.answers));
  assert(proposal?.title === 'Run a 10k without stopping', 'demo drives the goal bridge');
  // The bridge card is the demo's showcase — it must not render near-empty.
  assert(!!proposal?.whyItMatters, 'goal proposal carries the Calling');
  assert(!!proposal?.firstMilestone, 'goal proposal carries the first milestone');
  assert(!!proposal?.successEvidence, 'goal proposal carries success evidence');
  assert(!!proposal?.protectedBoundary, 'goal proposal carries the Protected Flame');

  // Determinism: two builds must be identical, so reviews are reproducible.
  assert(
    JSON.stringify(buildDemoChapterStates()) === JSON.stringify(states),
    'demo data is deterministic',
  );
}

function testWisdomCompassUsefulness(): void {
  assert(scoreCompassIllumination(0, 40) === 0, 'an untouched signal is open potential');
  assert(scoreCompassIllumination(1, 40) === 1, 'the first answer creates a visible first clue');
  assert(scoreCompassIllumination(20, 40) === 2, 'half-complete is taking shape');
  assert(scoreCompassIllumination(30, 40) === 3, 'substantial progress is a clear path');
  assert(scoreCompassIllumination(34, 40) === 4, '85% completion is a strong signal');

  const signals = buildCompassIllumination({
    living_wheel: { completed: 1, total: 20 },
    inner_compass: { completed: 0, total: 20 },
    living_horizon: { completed: 20, total: 20 },
    ikigai_map: { completed: 20, total: 20 },
    quest_forge: { completed: 10, total: 20 },
    personal_playbook: { completed: 0, total: 20 },
  });
  assert(signals.length === 4, 'the player sees four kind Compass signals');
  assert(signals.find((signal) => signal.id === 'know')?.score === 1, 'Know combines chapters I and II');
  assert(signals.find((signal) => signal.id === 'choose')?.score === 4, 'Choose combines chapters III and IV');
  assert(signals.find((signal) => signal.id === 'act')?.score === 2, 'Act reads Quest Forge');
  assert(signals.find((signal) => signal.id === 'sustain')?.stateLabel === 'Open potential', 'zero is opportunity language');

  let testedActivities = 0;
  for (const chapter of COMPASS_BOOK_CHAPTERS) {
    const signalId = getCompassSignalIdForChapter(chapter.id);
    assert(['know', 'choose', 'act', 'sustain'].includes(signalId), `${chapter.id} maps to a signal`);
    for (const activity of chapter.activities) {
      const answerable = activity.blocks.filter((block) => !['review', 'confirmation'].includes(block.type));
      assert(answerable.length > 0, `${activity.id} has at least one meaningful player input`);
      assert(
        answerable.length <= WISDOM_STOP_MAX_INPUTS,
        `${activity.id} stays within the four-input Wisdom quality gate`,
      );
      const block = answerable[0];
      const value = demoValueForBlock(block);
      assert(!!value, `${activity.id} has a testable authored answer shape`);
      const insight = buildWisdomCompassInsight({
        chapterId: chapter.id,
        blocks: answerable,
        values: { [block.questionId]: value ?? undefined },
        playerData: EMPTY_COMPASS_PLAYER_DATA,
      });
      assert(insight.interpretation.length > 30, `${activity.id} explains why its answer matters`);
      assert(insight.bridge.length > 30, `${activity.id} connects to the wider Compass loop`);
      assert(insight.nextStep.length > 35, `${activity.id} offers a concrete authored practical use`);
      assert(insight.growthNote.length > 20, `${activity.id} preserves agency and kind framing`);
      testedActivities += 1;
    }
  }
  assert(testedActivities === 120, 'all 120 island reflections pass the usefulness gate');
}

function testPresentationPolicy(): void {
  assert(parseCompassBookPresentationMode('2d') === '2d', '2D preference parses');
  assert(parseCompassBookPresentationMode('3d') === '3d', '3D preference parses');
  assert(parseCompassBookPresentationMode('unknown') === 'auto', 'unknown preference is safe');

  const resolve = (
    preference: 'auto' | '2d' | '3d',
    context: 'pwa' | 'island_run',
    surface: 'page' | 'flow',
    reducedMotion = false,
    threeAvailable = true,
  ) => resolveCompassBookPresentation({
    preference,
    context,
    surface,
    reducedMotion,
    threeAvailable,
  });

  assert(resolve('auto', 'pwa', 'page') === '2d', 'PWA Auto defaults to clear 2D');
  assert(resolve('auto', 'island_run', 'page') === '3d', 'Island Run Auto browses in 3D');
  assert(resolve('auto', 'island_run', 'flow') === '2d', 'Island Run Auto answers in 2D');
  assert(resolve('auto', 'island_run', 'page', true) === '2d', 'Auto respects reduced motion');
  assert(resolve('3d', 'pwa', 'flow', true) === '3d', 'explicit 3D remains available with reduced animation');
  assert(resolve('3d', 'island_run', 'page', false, false) === '2d', 'WebGL failure falls back to 2D');
  assert(resolve('2d', 'island_run', 'page') === '2d', 'explicit 2D wins in Island Run');
}

export function runAllCompassBookTests(): void {
  testCurriculum();
  testUnlock();
  testProgress();
  testAnswerParsing();
  testGuidedFlowAnswering();
  testLivingWheelProjector();
  testInnerCompassProjector();
  testLivingHorizonProjector();
  testIkigaiMapProjector();
  testQuestForgeAndGoalBridge();
  testPersonalPlaybookAndHabitBridge();
  testCompassAiCore();
  testPlayerOptionPickers();
  testIslandFragment();
  testShadowBridge();
  testReading();
  testPageTurn();
  testDemoBook();
  testPresentationPolicy();
  testWisdomCompassUsefulness();
}
