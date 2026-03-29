type AllowedInnerDomain =
  | 'reflections'
  | 'habits'
  | 'goals'
  | 'journals'
  | 'vision_board'
  | 'traits';

const DEFAULT_ALLOWED_DOMAINS: AllowedInnerDomain[] = ['reflections', 'habits', 'goals', 'journals', 'traits'];

function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function computeInnerTensionPriorityScore(answers: Record<string, string>): number {
  const combined = Object.values(answers).join(' ').toLowerCase();
  let score = 0.15;

  if (containsAny(combined, [/\banxious\b/, /\boverwhelm/i, /\bpanic\b/, /\bburnout\b/])) score += 0.35;
  if (containsAny(combined, [/\bstuck\b/, /\bcycle\b/, /\brepeat/i, /\bpattern\b/])) score += 0.2;
  if (containsAny(combined, [/\bfuture\b/, /\bpurpose\b/, /\bidentity\b/, /\bdirection\b/])) score += 0.2;
  if (combined.length > 400) score += 0.1;

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

export function buildInnerContextSlice(input: {
  answers: Record<string, string>;
  allowedDomains?: AllowedInnerDomain[];
}): { contextSlice: string; usedContextDomains: AllowedInnerDomain[] } {
  const allowed = input.allowedDomains?.length ? input.allowedDomains : DEFAULT_ALLOWED_DOMAINS;
  const combined = Object.values(input.answers).join(' ').toLowerCase();
  const used = new Set<AllowedInnerDomain>(['reflections']);

  if (allowed.includes('habits') && containsAny(combined, [/\broutine\b/, /\bhabit\b/, /\bconsisten/i])) used.add('habits');
  if (allowed.includes('goals') && containsAny(combined, [/\bgoal\b/, /\bdirection\b/, /\bcareer\b/])) used.add('goals');
  if (allowed.includes('journals') && containsAny(combined, [/\bjournal\b/, /\breflect/i, /\binsight\b/])) used.add('journals');
  if (allowed.includes('traits') && containsAny(combined, [/\bidentity\b/, /\bpersonality\b/, /\bwho i am\b/])) used.add('traits');
  if (allowed.includes('vision_board') && containsAny(combined, [/\bvision\b/, /\bdream\b/, /\bfuture self\b/])) used.add('vision_board');

  const usedContextDomains = Array.from(used);
  return {
    contextSlice: `Used domains: ${JSON.stringify(usedContextDomains)}. Answers: ${JSON.stringify(input.answers)}`,
    usedContextDomains,
  };
}

export function shouldUseDeepIntervention(priorityScore: number): boolean {
  return priorityScore >= 0.7;
}

export type InnerGuidancePlan = {
  insightSummary: string;
  patternLinks: string[];
  riskFlags: string[];
  nowPlan: string[];
  weekPlan: string[];
  monthPlan: string[];
};

export function buildInnerGuidancePlan(input: {
  answers: Record<string, string>;
  priorityScore: number;
  deepMode: boolean;
  usedContextDomains: string[];
}): InnerGuidancePlan {
  const combined = Object.values(input.answers).join(' ').toLowerCase();
  const riskFlags: string[] = [];
  if (containsAny(combined, [/\bburnout\b/, /\boverwhelm\b/, /\bpanic\b/])) riskFlags.push('elevated_stress_load');
  if (containsAny(combined, [/\bstuck\b/, /\bloop\b/, /\brepeat/i])) riskFlags.push('repeat_pattern_lock');
  if (containsAny(combined, [/\bsleep\b/, /\bexhaust/i])) riskFlags.push('energy_regulation_risk');

  const patternLinks: string[] = [];
  if (input.usedContextDomains.includes('habits')) patternLinks.push('habit consistency likely influences this tension');
  if (input.usedContextDomains.includes('goals')) patternLinks.push('goal-direction ambiguity appears connected');
  if (input.usedContextDomains.includes('traits')) patternLinks.push('self-identity framing may be amplifying reactions');

  const nowPlan = [
    'Name the tension in one sentence without blame.',
    'Pick one regulating action you can do in 5 minutes.',
  ];
  const weekPlan = [
    'Track one repeated trigger and your first response each day.',
    'Convert one insight into a small commitment with a deadline.',
  ];
  const monthPlan = [
    'Review weekly notes and identify one stable pattern shift.',
    'Refine routines and goals to reduce future friction.',
  ];

  return {
    insightSummary: input.deepMode
      ? 'This tension appears to be a high-priority pattern, not a one-off moment.'
      : 'This tension appears actionable with a focused short-cycle adjustment.',
    patternLinks,
    riskFlags,
    nowPlan,
    weekPlan,
    monthPlan,
  };
}
