import type {
  ConflictRoutingMetadata,
  ConflictRoutingType,
} from '../types/conflictSession';

const CATEGORY_LABELS: Record<ConflictRoutingType, string> = {
  personality_annoyance: 'personality annoyance or style friction',
  misunderstanding: 'misunderstanding',
  boundary_issue: 'boundary issue',
  unfairness_imbalance: 'unfairness or imbalance',
  hurt_broken_trust: 'hurt or broken trust',
  different_needs_values: 'different needs or values',
  practical_decision: 'practical decision',
  repeated_pattern: 'repeated pattern',
  unsure: 'unclear or mixed conflict shape',
};

const CATEGORY_PROMPT_SNIPPETS: Partial<Record<ConflictRoutingType, string>> = {
  personality_annoyance:
    'For personality_annoyance, avoid blame or character judgments. Emphasize specific behaviors, repair, early boundary-setting, and realistic tolerance limits.',
  boundary_issue:
    'For boundary_issue, do not make boundaries sound like permission-seeking. Emphasize clarity, limits, follow-through, and respect without requiring agreement from the other person.',
  hurt_broken_trust:
    "For hurt_broken_trust, do not rush forgiveness or reconciliation. Emphasize impact, trust-building conditions, accountability, time, and the user's right to move at a safe pace.",
  repeated_pattern:
    'For repeated_pattern, explicitly require what changes this time. Emphasize pattern interruption, concrete next actions, accountability, and signals that the loop is actually changing.',
};

export function normalizeConflictRoutingForPrompt(
  conflictRouting?: Partial<ConflictRoutingMetadata> | null,
): Pick<ConflictRoutingMetadata, 'primaryConflictType' | 'safetyFlag'> {
  const primaryConflictType = conflictRouting?.primaryConflictType ?? null;
  return {
    primaryConflictType:
      primaryConflictType && primaryConflictType in CATEGORY_LABELS
        ? primaryConflictType
        : null,
    safetyFlag: conflictRouting?.safetyFlag === true,
  };
}

export function buildConflictRoutingPromptContext(
  conflictRouting?: Partial<ConflictRoutingMetadata> | null,
): string {
  const normalized = normalizeConflictRoutingForPrompt(conflictRouting);
  const label = normalized.primaryConflictType
    ? CATEGORY_LABELS[normalized.primaryConflictType]
    : 'not provided';
  const categorySnippet = normalized.primaryConflictType
    ? CATEGORY_PROMPT_SNIPPETS[normalized.primaryConflictType]
    : null;

  const globalRules = [
    `Selected conflict category: ${label}. Treat this category as a lens/context, not truth, proof, or a diagnosis.`,
    'Do not diagnose either person or infer clinical, legal, or abuse conclusions from the category.',
    'Do not label either person toxic, abusive, narcissistic, manipulative, or gaslighting unless the user explicitly used those words; even then, do not validate the label as a clinical or legal conclusion.',
    'Do not override, contradict, minimize, or invent user-provided facts.',
    'Do not pressure reconciliation, forgiveness, apology, invite, contact, agreement, or continued engagement.',
  ];

  const safetyRules = normalized.safetyFlag
    ? [
        'SAFETY OVERRIDE: safetyFlag is true.',
        'Do not frame this as a shared problem to solve together.',
        'Do not recommend inviting the other person, negotiating, apologizing, reconciling, meeting privately, or creating an agreement.',
        'Focus on safety, support, documentation, boundaries, and trusted help using calm, non-alarming wording.',
        'Mention emergency services only for immediate danger.',
      ]
    : [];

  return [
    ...globalRules,
    ...(categorySnippet ? [categorySnippet] : []),
    ...safetyRules,
  ].join("\n");
}
