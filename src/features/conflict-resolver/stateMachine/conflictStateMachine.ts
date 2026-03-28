import { CONFLICT_STAGE_ORDER, type ConflictStage } from '../types/conflictSession';

const CONFLICT_STAGE_SET = new Set<ConflictStage>(CONFLICT_STAGE_ORDER);

const CONFLICT_STAGE_TRANSITIONS: Record<ConflictStage, readonly ConflictStage[]> = {
  draft: ['grounding'],
  grounding: ['private_capture'],
  private_capture: ['shared_read'],
  shared_read: ['negotiation'],
  negotiation: ['apology_alignment'],
  apology_alignment: ['agreement'],
  agreement: ['closed'],
  closed: [],
};

export type ConflictTransitionGuardResult =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | 'unknown_from_stage'
        | 'unknown_to_stage'
        | 'invalid_transition'
        | 'target_stage_behind_current';
    };

export function isConflictStage(value: string): value is ConflictStage {
  return CONFLICT_STAGE_SET.has(value as ConflictStage);
}

export function getNextConflictStage(stage: ConflictStage): ConflictStage | null {
  const transitions = CONFLICT_STAGE_TRANSITIONS[stage];
  return transitions.length > 0 ? transitions[0] : null;
}

export function canTransitionConflictStage(from: ConflictStage, to: ConflictStage): ConflictTransitionGuardResult {
  if (!isConflictStage(from)) {
    return { allowed: false, reason: 'unknown_from_stage' };
  }
  if (!isConflictStage(to)) {
    return { allowed: false, reason: 'unknown_to_stage' };
  }

  const fromIndex = CONFLICT_STAGE_ORDER.indexOf(from);
  const toIndex = CONFLICT_STAGE_ORDER.indexOf(to);
  if (toIndex < fromIndex) {
    return { allowed: false, reason: 'target_stage_behind_current' };
  }

  if (CONFLICT_STAGE_TRANSITIONS[from].includes(to)) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'invalid_transition' };
}
