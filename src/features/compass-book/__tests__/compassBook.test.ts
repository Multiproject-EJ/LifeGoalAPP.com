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
import { getChapterConfirmedOutput } from '../logic/projectors';
import {
  applyHelpToValue,
  buildCompassHelpRequest,
  parseCompassHelpResponse,
} from '../services/compassAiCore';
import { COMPASS_BOOK_CHAPTER_IDS } from '../types';
import type { CompassAnswerRecord, CompassAnswerValue, CompassBlockDefinition, CompassChapterState } from '../types';
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
}
