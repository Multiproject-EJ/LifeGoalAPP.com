/**
 * Island 008 baseline check (user request 2026-09-30): the masked wizard
 * caretaker appears on the tile where the player lands and asks five short
 * baseline questions in a speech bubble. Each submitted answer lights one of
 * the jungle's five seals (beacons); the fifth wakes the Living Compass and
 * the Compass Book descends. This replaces the Mission Phone's
 * "Find a Wayfinder → Awaken seal" step on Island 008.
 *
 * Pure rules; the canonical action lives in island8BaselineActions.ts.
 */

export const ISLAND8_BASELINE_ISLAND_NUMBER = 8;
export const ISLAND8_BASELINE_KEY_PATTERN = /^(0|[1-9]\d*):8:baseline-check$/;

export interface Island8BaselineQuestion {
  id: string;
  /** The wizard's line in the speech bubble. */
  prompt: string;
  /** Life area this baseline describes. */
  area: string;
  /** Five answers, lowest to highest. */
  scale: readonly [string, string, string, string, string];
}

export const ISLAND8_BASELINE_QUESTIONS: readonly Island8BaselineQuestion[] = [
  { id: 'energy', area: 'Body', prompt: 'Traveller, before the first seal wakes: how rested and well does your body feel this week?',
    scale: ['Running on empty', 'Tired', 'Okay', 'Good', 'Full of life'] },
  { id: 'connection', area: 'People', prompt: 'The second seal listens for bonds. How connected do you feel to the people who matter to you?',
    scale: ['Alone', 'Distant', 'Somewhat', 'Close', 'Deeply connected'] },
  { id: 'purpose', area: 'Work & purpose', prompt: 'The third seal seeks purpose. How meaningful does your daily work or study feel?',
    scale: ['Empty', 'Dull', 'Mixed', 'Meaningful', 'Lit up'] },
  { id: 'calm', area: 'Mind', prompt: 'The fourth seal rests in stillness. How calm has your mind been most days?',
    scale: ['Stormy', 'Restless', 'Up and down', 'Mostly calm', 'Clear sky'] },
  { id: 'direction', area: 'Direction', prompt: 'The last seal points ahead. How hopeful are you about where your life is heading?',
    scale: ['Lost', 'Unsure', 'Curious', 'Hopeful', 'Certain'] },
] as const;

export interface Island8BaselineAnswer {
  questionId: string;
  /** 1..5 */
  value: number;
  answeredAtMs: number;
}

export interface Island8BaselineProgress {
  missionId: 'island8-baseline-check';
  version: 1;
  answers: Island8BaselineAnswer[];
  updatedAtMs: number;
}

export function getIsland8BaselineKey(cycleIndex: number): string {
  return `${Math.max(0, Math.floor(cycleIndex))}:8:baseline-check`;
}

export function createIsland8BaselineProgress(): Island8BaselineProgress {
  return { missionId: 'island8-baseline-check', version: 1, answers: [], updatedAtMs: 0 };
}

const KNOWN_IDS = new Set(ISLAND8_BASELINE_QUESTIONS.map((question) => question.id));

export function sanitizeIsland8BaselineProgress(value: unknown): Island8BaselineProgress {
  const base = createIsland8BaselineProgress();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const record = value as Record<string, unknown>;
  const seen = new Set<string>();
  const answers: Island8BaselineAnswer[] = [];
  for (const raw of Array.isArray(record.answers) ? record.answers : []) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    const questionId = typeof entry.questionId === 'string' ? entry.questionId : '';
    const answerValue = typeof entry.value === 'number' && Number.isFinite(entry.value) ? Math.round(entry.value) : NaN;
    const answeredAtMs = typeof entry.answeredAtMs === 'number' && Number.isFinite(entry.answeredAtMs) && entry.answeredAtMs >= 0 ? entry.answeredAtMs : 0;
    if (!KNOWN_IDS.has(questionId) || seen.has(questionId) || !(answerValue >= 1 && answerValue <= 5)) continue;
    seen.add(questionId);
    answers.push({ questionId, value: answerValue, answeredAtMs });
  }
  const updatedAtMs = typeof record.updatedAtMs === 'number' && Number.isFinite(record.updatedAtMs) && record.updatedAtMs >= 0 ? record.updatedAtMs : 0;
  return { ...base, answers, updatedAtMs };
}

/** Devices merge on the union of answers (first answer per question wins). */
export function mergeIsland8BaselineProgress(a: Island8BaselineProgress, b: Island8BaselineProgress): Island8BaselineProgress {
  const byId = new Map<string, Island8BaselineAnswer>();
  for (const answer of [...a.answers, ...b.answers].sort((x, y) => x.answeredAtMs - y.answeredAtMs)) {
    if (!byId.has(answer.questionId)) byId.set(answer.questionId, answer);
  }
  return sanitizeIsland8BaselineProgress({
    missionId: 'island8-baseline-check', version: 1,
    answers: [...byId.values()],
    updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
  });
}

export function resolveIsland8BaselineProgress(ledger: Readonly<Record<string, unknown>> | null | undefined, cycleIndex: number): Island8BaselineProgress {
  return sanitizeIsland8BaselineProgress(ledger?.[getIsland8BaselineKey(cycleIndex)]);
}

/** The wizard's next question, or null once all five are answered. */
export function resolveNextIsland8BaselineQuestion(progress: Island8BaselineProgress): Island8BaselineQuestion | null {
  const answered = new Set(progress.answers.map((answer) => answer.questionId));
  return ISLAND8_BASELINE_QUESTIONS.find((question) => !answered.has(question.id)) ?? null;
}

export function applyIsland8BaselineAnswer(progress: Island8BaselineProgress, questionId: string, value: number, nowMs: number):
  { status: 'ok'; progress: Island8BaselineProgress } | { status: 'unknown_question' | 'already_answered' | 'invalid_value'; progress: Island8BaselineProgress } {
  if (!KNOWN_IDS.has(questionId)) return { status: 'unknown_question', progress };
  if (progress.answers.some((answer) => answer.questionId === questionId)) return { status: 'already_answered', progress };
  const rounded = Math.round(value);
  if (!(rounded >= 1 && rounded <= 5)) return { status: 'invalid_value', progress };
  return {
    status: 'ok',
    progress: { ...progress, answers: [...progress.answers, { questionId, value: rounded, answeredAtMs: nowMs }], updatedAtMs: nowMs },
  };
}
