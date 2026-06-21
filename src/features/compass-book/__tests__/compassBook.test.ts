/**
 * Compass Book foundation tests. Pure logic only — no Supabase/React.
 * Run via `npm run test:compass-book`.
 */

import {
  COMPASS_BOOK_ACTIVITIES,
  COMPASS_BOOK_CHAPTERS,
  validateCompassCurriculum,
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
import { computeChapterProgress, isActivityComplete } from '../logic/progress';
import { parseAnswers, upsertAnswer } from '../services/compassBookSerialization';
import type { CompassAnswerRecord, CompassChapterState } from '../types';
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

export function runAllCompassBookTests(): void {
  testCurriculum();
  testUnlock();
  testProgress();
  testAnswerParsing();
}
