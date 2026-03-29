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

