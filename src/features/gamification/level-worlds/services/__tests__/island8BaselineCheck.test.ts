import { answerIsland8BaselineQuestion } from '../island8BaselineActions';
import { __resetIslandRunActionMutexesForTests } from '../islandRunActionMutex';
import {
  readIslandRunGameStateRecord,
  resetIslandRunRuntimeCommitCoordinatorForTests,
  writeIslandRunGameStateRecord,
} from '../islandRunGameStateStore';
import { __resetIslandRunStateStoreForTests, refreshIslandRunStateFromLocal } from '../islandRunStateStore';
import { getIslandRunSignatureMissionKey, resolveStagedRestorationMissionProgress } from '../islandRunSignatureMissions';
import { createMemoryStorage, installWindowWithStorage } from './testHarness';
import { assert, assertEqual, type TestCase } from './testHarness';
import {
  ISLAND8_BASELINE_QUESTIONS,
  applyIsland8BaselineAnswer,
  createIsland8BaselineProgress,
  getIsland8BaselineKey,
  mergeIsland8BaselineProgress,
  resolveNextIsland8BaselineQuestion,
  sanitizeIsland8BaselineProgress,
} from '../island8BaselineCheck';
import { sanitizeIslandRunSignatureMissionProgress } from '../islandRunSignatureMissions';

export const island8BaselineCheckTests: TestCase[] = [
  {
    name: 'Island 008 baseline: five questions, one per seal, asked in order, each answered once',
    run: () => {
      assertEqual(ISLAND8_BASELINE_QUESTIONS.length, 5, 'one question per Living Compass seal');
      let progress = createIsland8BaselineProgress();
      for (const [index, question] of ISLAND8_BASELINE_QUESTIONS.entries()) {
        assertEqual(resolveNextIsland8BaselineQuestion(progress)?.id, question.id, `question ${index + 1} is next`);
        const result = applyIsland8BaselineAnswer(progress, question.id, 4, 100 + index);
        assertEqual(result.status, 'ok', 'answer accepted');
        progress = result.progress;
        assertEqual(applyIsland8BaselineAnswer(progress, question.id, 2, 999).status, 'already_answered', 'no second answer');
      }
      assertEqual(resolveNextIsland8BaselineQuestion(progress), null, 'all seals answered');
      assertEqual(applyIsland8BaselineAnswer(createIsland8BaselineProgress(), 'energy', 9, 1).status, 'invalid_value', '1..5 only');
      assertEqual(applyIsland8BaselineAnswer(createIsland8BaselineProgress(), 'bogus', 3, 1).status, 'unknown_question', 'known questions only');
    },
  },
  {
    name: 'Island 008 baseline: ledger sanitizes, survives the signature ledger and merges across devices',
    run: () => {
      const key = getIsland8BaselineKey(0);
      assertEqual(key, '0:8:baseline-check', 'cycle-scoped key');
      const dirty = { missionId: 'island8-baseline-check', version: 1, answers: [
        { questionId: 'energy', value: 3, answeredAtMs: 5 },
        { questionId: 'energy', value: 5, answeredAtMs: 6 },
        { questionId: 'nope', value: 3, answeredAtMs: 7 },
        { questionId: 'calm', value: 0, answeredAtMs: 8 },
      ], updatedAtMs: 9 };
      const clean = sanitizeIsland8BaselineProgress(dirty);
      assertEqual(clean.answers.length, 1, 'duplicates, unknown ids and bad values dropped');
      const ledger = sanitizeIslandRunSignatureMissionProgress({ [key]: dirty, '0:8:not-a-key': dirty });
      assert(key in ledger, 'kept under its key');
      assert(!('0:8:not-a-key' in ledger), 'wrong key rejected');
      const a = sanitizeIsland8BaselineProgress({ missionId: 'island8-baseline-check', version: 1, answers: [{ questionId: 'energy', value: 2, answeredAtMs: 1 }], updatedAtMs: 1 });
      const b = sanitizeIsland8BaselineProgress({ missionId: 'island8-baseline-check', version: 1, answers: [{ questionId: 'energy', value: 5, answeredAtMs: 3 }, { questionId: 'connection', value: 4, answeredAtMs: 4 }], updatedAtMs: 4 });
      const merged = mergeIsland8BaselineProgress(a, b);
      assertEqual(merged.answers.length, 2, 'union of answers');
      assertEqual(merged.answers.find((answer) => answer.questionId === 'energy')?.value, 2, 'first answer wins');
    },
  },
  {
    name: 'Island 008 baseline: the Mission Phone no longer awakens seals; the caretaker does',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      assert(board.includes("stagedRestorationDescriptor.missionId === 'jungle-expedition-living-compass'\n              && stagedRestorationProgress?.completedAtMs == null)"), 'phone action off until the awakening');
      assert(board.includes('answerIsland8BaselineQuestion({ session, client, questionId, value })'), 'answers go through the canonical action');
      assert(board.includes('caretakerTileVisit={caretakerTileVisit}'), 'the wizard visits the landing tile');
    },
  },
];

function makeBaselineSession() {
  return {
    access_token: 't', refresh_token: 't', expires_in: 3600, token_type: 'bearer',
    user: { id: 'island8-baseline-test-user', user_metadata: {} },
  } as unknown as import('@supabase/supabase-js').Session;
}

export const island8BaselineActionTests: TestCase[] = [
  {
    name: 'Island 008 baseline action: each answer lights one seal; the fifth completes the Living Compass',
    run: async () => {
      resetIslandRunRuntimeCommitCoordinatorForTests();
      __resetIslandRunActionMutexesForTests();
      __resetIslandRunStateStoreForTests();
      installWindowWithStorage(createMemoryStorage());
      const session = makeBaselineSession();
      const base = readIslandRunGameStateRecord(session);
      void writeIslandRunGameStateRecord({ session, client: null, record: { ...base, currentIslandNumber: 8, cycleIndex: 0, signatureMissionProgressByIsland: {} } });
      refreshIslandRunStateFromLocal(session);

      for (const [index, question] of ISLAND8_BASELINE_QUESTIONS.entries()) {
        const result = await answerIsland8BaselineQuestion({ session, client: null, questionId: question.id, value: 3, nowMs: 1_000 + index });
        assertEqual(result.status, 'ok', `answer ${index + 1} accepted`);
        if (result.status !== 'ok') return;
        assertEqual(result.activatedStages, index + 1, `seal ${index + 1} lit`);
        assertEqual(result.completedAtMs !== null, index === 4, 'only the fifth answer completes the mission');
      }
      const record = readIslandRunGameStateRecord(session);
      const staged = resolveStagedRestorationMissionProgress({ ledger: record.signatureMissionProgressByIsland, cycleIndex: 0, islandNumber: 8 });
      assertEqual(staged?.activatedStages, 5, 'all five seals awake');
      assert(staged?.completedAtMs != null, 'Living Compass complete');
      assert(getIslandRunSignatureMissionKey(0, 8) in record.signatureMissionProgressByIsland, 'staged progress persisted');
      assertEqual(
        (await answerIsland8BaselineQuestion({ session, client: null, questionId: 'energy', value: 3 })).status,
        'already_complete',
        'no answers after the awakening',
      );
    },
  },
];
