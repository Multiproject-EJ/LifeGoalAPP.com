import { v4 as uuidv4 } from 'uuid';
import type { AnswerValue } from '../features/identity/personalityTestData';
import type { PersonalityScores } from '../features/identity/personalityScoring';
import type { ArchetypeHand } from '../features/identity/archetypes/archetypeHandBuilder';
import {
  getPersonalityTestsForUser,
  getDirtyPersonalityTests,
  putPersonalityTest,
  type PersonalityTestValue,
} from './localDb';
import { getMutationQueue } from '../services/offline-queue';
import { recordOfflineSyncEvent } from '../services/offlineSyncTelemetry';

export type PersonalityTestRecord = PersonalityTestValue;

export async function queuePersonalityTestResult(params: {
  userId: string;
  answers: Record<string, AnswerValue>;
  scores: PersonalityScores;
  archetypeHand?: ArchetypeHand; // Optional archetype hand
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
    archetype_hand: params.archetypeHand, // Store archetype hand
    _dirty: true,
  };

  await putPersonalityTest(record);
  // Queue-first by design: the durable shared queue replays this as an
  // idempotent upsert (client uuid) once the cloud is reachable.
  await getMutationQueue().enqueue({
    feature: 'personality_test',
    operation: 'personality_test.upsert',
    payload: {
      id: record.id,
      user_id: record.user_id,
      taken_at: record.taken_at,
      traits: record.traits,
      axes: record.axes,
      answers: record.answers ?? null,
      version: record.version,
      archetype_hand: record.archetype_hand ?? null,
    },
    dedupeKey: record.id,
  });
  recordOfflineSyncEvent({
    feature: 'personality_test',
    event: 'queue_enqueued',
    userId: params.userId,
    pending: 1,
  });

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
