import { v4 as uuidv4 } from 'uuid';
import type { AnswerValue } from '../features/identity/personalityTestData';
import type { PersonalityScores } from '../features/identity/personalityScoring';
import {
  getPersonalityTestsForUser,
  getDirtyPersonalityTests,
  putPersonalityTest,
  type PersonalityTestValue,
} from './localDb';

export type PersonalityTestRecord = PersonalityTestValue;

export async function queuePersonalityTestResult(params: {
  userId: string;
  answers: Record<string, AnswerValue>;
  scores: PersonalityScores;
  version?: string;
}): Promise<PersonalityTestRecord> {
  const now = new Date().toISOString();
  const record: PersonalityTestRecord = {
    id: uuidv4(),
    user_id: params.userId,
    taken_at: now,
    traits: params.scores.traits,
    axes: params.scores.axes,
    answers: params.answers,
    version: params.version ?? 'v1',
    _dirty: true,
  };

  await putPersonalityTest(record);

  return record;
}

export async function loadPersonalityTestHistory(
  userId: string,
): Promise<PersonalityTestRecord[]> {
  const tests = await getPersonalityTestsForUser(userId);
  return tests.sort((a, b) => b.taken_at.localeCompare(a.taken_at));
}

export async function loadDirtyPersonalityTests(): Promise<PersonalityTestRecord[]> {
  return getDirtyPersonalityTests();
}
