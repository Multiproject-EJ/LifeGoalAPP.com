import type { AiCoachDataAccess } from '../types/aiCoach';

export type HabitEnvironmentContext = {
  title: string;
  environment: string;
};

export type GoalCoachContext = {
  title: string;
  status: string;
  category: string | null;
  completionPct: number;
  linkedHabitCount?: number;
};

export type AiCoachLifeStageContext = {
  ageBand: string | null;
  birthdayProvided: boolean;
};

export type AiCoachInstructionPayload = {
  systemPrompt: string;
  source: 'default' | 'env' | 'demo-env';
  demoMode: boolean;
  dataAccess: AiCoachDataAccess;
};

const BASE_INSTRUCTIONS = [
  'You are the LifeGoalApp AI Coach: calm, grounded, and pragmatic.',
  'Mission: increase agency without removing autonomy, reduce compulsion without flattening life, and promote balance over maximization.',
  'Style: ask short reflective questions before prescribing actions; offer 2–3 small options; normalize correction and downshifts.',
  'Avoid spiritual jargon, guru tone, or guaranteed outcomes. Never shame the user.',
  'Game of Life framing: keep the experience playable, highlight balance across Agency, Awareness, Rationality, and Vitality.',
  'If one axis grows while another collapses, call it imbalance (not failure).',
  'Reward correction, not certainty. Encourage probability language for confidence levels.',
  'When a habit is too hard, offer Seed/Minimum/Standard tiers and preserve streaks when downshifting.',
  'Privacy: respect user settings for what data you can read. If access is disabled, ask general questions without referencing the restricted data.',
].join('\n');

function resolveEnvInstructions(demoMode: boolean): { text: string | null; source: AiCoachInstructionPayload['source'] } {
  const env = import.meta.env as Record<string, string | undefined>;
  const demoInstruction = env.VITE_AI_COACH_DEMO_INSTRUCTIONS?.trim();
  const baseInstruction = env.VITE_AI_COACH_INSTRUCTIONS?.trim();

  if (demoMode && demoInstruction) {
    return { text: demoInstruction, source: 'demo-env' };
  }

  if (baseInstruction) {
    return { text: baseInstruction, source: 'env' };
  }

  return { text: null, source: 'default' };
}

function formatAccessLine(label: string, enabled: boolean): string {
  return `${label}: ${enabled ? 'allowed' : 'blocked'}`;
}

function formatHabitEnvironments(habits: HabitEnvironmentContext[]): string {
  return habits
    .map((h) => `- ${h.title}: ${h.environment}`)
    .join('\n');
}

export function resolveAiCoachLifeStageContext(
  birthday?: string | null,
  now: Date = new Date(),
): AiCoachLifeStageContext {
  if (!birthday) {
    return { ageBand: null, birthdayProvided: false };
  }

  const parsed = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { ageBand: null, birthdayProvided: true };
  }

  let age = now.getFullYear() - parsed.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > parsed.getMonth()
    || (now.getMonth() === parsed.getMonth() && now.getDate() >= parsed.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;

  if (age < 0 || age > 120) {
    return { ageBand: null, birthdayProvided: true };
  }

  const ageBand = age < 18
    ? 'under 18'
    : age <= 24
      ? '18–24'
      : age <= 34
        ? '25–34'
        : age <= 44
          ? '35–44'
          : age <= 54
            ? '45–54'
            : age <= 64
              ? '55–64'
              : '65+';

  return { ageBand, birthdayProvided: true };
}

function formatGoalsSummary(goals: GoalCoachContext[]): string {
  if (goals.length === 0) return '';
  const active = goals.filter((g) => g.status !== 'achieved');
  const top = active[0] ?? goals[0];
  const lines = [
    `User has ${active.length} active goal${active.length === 1 ? '' : 's'} (${goals.length} total).`,
    `Top priority: "${top.title}" (status: ${top.status}${top.category ? `, area: ${top.category}` : ''}). Progress: ${top.completionPct}%.`,
  ];
  if (top.linkedHabitCount && top.linkedHabitCount > 0) {
    lines.push(`Linked habits for top goal: ${top.linkedHabitCount}.`);
  }
  return lines.join(' ');
}

export function loadAiCoachInstructions(
  dataAccess: AiCoachDataAccess,
  demoMode: boolean,
  habitEnvironments?: HabitEnvironmentContext[],
  activeGoals?: GoalCoachContext[],
  minProgressStreak?: number,
  lifeStageContext?: AiCoachLifeStageContext | null,
): AiCoachInstructionPayload {
  const resolved = resolveEnvInstructions(demoMode);
  const instructions = resolved.text ?? BASE_INSTRUCTIONS;

  const accessSummary = [
    formatAccessLine('Goals', dataAccess.goals),
    formatAccessLine('Goal evolution history', dataAccess.goalEvolution),
    formatAccessLine('Habits', dataAccess.habits),
    formatAccessLine('Journaling', dataAccess.journaling),
    formatAccessLine('Reflections', dataAccess.reflections),
    formatAccessLine('Vision board', dataAccess.visionBoard),
    formatAccessLine('Life stage', dataAccess.lifeStage),
  ].join('\n');

  // M4-E verified: when dataAccess.habits is enabled and the caller provides
  // habitEnvironments, the per-habit environment notes are appended to the
  // system prompt so the coach can suggest environment tweaks.  AiCoach.tsx
  // extracts these from the loaded habits and passes them here.
  const habitEnvSection =
    dataAccess.habits && habitEnvironments && habitEnvironments.length > 0
      ? `\n\nHabit environments (use these when coaching on specific habits):\n${formatHabitEnvironments(habitEnvironments)}`
      : '';

  const goalsSummarySection =
    dataAccess.goals && activeGoals && activeGoals.length > 0
      ? `\n\nGoals context: ${formatGoalsSummary(activeGoals)}`
      : '';

  // M10-C: difficulty adjustment from telemetry history (extended streak when
  // the user has recently accepted interventions or experienced a balance shift).
  const difficultySection =
    minProgressStreak !== undefined && minProgressStreak !== 14
      ? `\n\nDifficulty adjustment: User's minimum progress streak is ${minProgressStreak} days (elevated from default 14 due to recent coaching history). Offer more gradual milestones and normalise slower pacing.`
      : '';

  const lifeStageSection =
    dataAccess.lifeStage && lifeStageContext?.ageBand
      ? `\n\nLife-stage context: User opted in to life-stage coaching. Use broad age range only (${lifeStageContext.ageBand}); do not mention exact birthday or exact age unless the user asks.`
      : dataAccess.lifeStage && lifeStageContext?.birthdayProvided
        ? '\n\nLife-stage context: User opted in, but only birthday/date quality is available. Do not infer exact age.'
        : '';

  return {
    systemPrompt: `${instructions}\n\nData access\n${accessSummary}${habitEnvSection}${goalsSummarySection}${difficultySection}${lifeStageSection}`,
    source: resolved.text ? resolved.source : 'default',
    demoMode,
    dataAccess,
  };
}
