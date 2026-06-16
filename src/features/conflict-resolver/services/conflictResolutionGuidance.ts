import type { ConflictRoutingType } from '../types/conflictSession';

export type ConflictResolutionGuidance = {
  tone: 'resolution' | 'safety';
  helperText: string;
};

const RESOLUTION_GUIDANCE_BY_TYPE: Record<ConflictRoutingType, ConflictResolutionGuidance> = {
  personality_annoyance: {
    tone: 'resolution',
    helperText: 'Try a small repair + a specific request. Name the limit before resentment builds again.',
  },
  misunderstanding: {
    tone: 'resolution',
    helperText: 'Describe what you interpreted, then ask what they meant before debating the motive.',
  },
  boundary_issue: {
    tone: 'resolution',
    helperText: 'Keep the boundary clear: what is not okay, what you need instead, and what you will do if it keeps happening.',
  },
  unfairness_imbalance: {
    tone: 'resolution',
    helperText: 'Show the imbalance clearly, then ask for a fairer split or concrete change.',
  },
  hurt_broken_trust: {
    tone: 'resolution',
    helperText: 'Focus on impact, accountability, and what repair would need to look like over time.',
  },
  different_needs_values: {
    tone: 'resolution',
    helperText: 'Name both needs, then look for a tradeoff rather than proving one person is wrong.',
  },
  practical_decision: {
    tone: 'resolution',
    helperText: 'Separate the decision from the emotion: define the options, criteria, and next step.',
  },
  repeated_pattern: {
    tone: 'resolution',
    helperText: 'Do not repeat the same talk. Name the pattern and what will be different this time.',
  },
  unsure: {
    tone: 'resolution',
    helperText: 'Keep this exploratory. Start with what feels strongest and what would make things meaningfully better.',
  },
};

const SAFETY_FIRST_GUIDANCE: ConflictResolutionGuidance = {
  tone: 'safety',
  helperText: 'This may not be a mutual problem-solving situation. Your safety and support matter first.',
};

export function getConflictResolutionGuidance(input: {
  primaryConflictType?: ConflictRoutingType | null;
  safetyFlag?: boolean;
}): ConflictResolutionGuidance | null {
  if (input.safetyFlag) {
    return SAFETY_FIRST_GUIDANCE;
  }

  if (!input.primaryConflictType) {
    return null;
  }

  return RESOLUTION_GUIDANCE_BY_TYPE[input.primaryConflictType] ?? null;
}
