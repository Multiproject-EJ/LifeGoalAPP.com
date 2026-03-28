export const CONFLICT_STAGE_ORDER = [
  'draft',
  'grounding',
  'private_capture',
  'shared_read',
  'negotiation',
  'apology_alignment',
  'agreement',
  'closed',
] as const;

export type ConflictStage = (typeof CONFLICT_STAGE_ORDER)[number];

export type ConflictType = 'inner_tension' | 'shared_conflict';

export type ConflictSessionStatus = ConflictStage;

export type ConflictParticipantRole = 'initiator' | 'participant' | 'observer';

export type ConflictReadiness = 'not_ready' | 'ready' | 'blocked';

export type ConflictProposalStatus = 'queued' | 'active' | 'accepted' | 'rejected' | 'countered';

export type ConflictApologyType =
  | 'acknowledge_impact'
  | 'take_responsibility'
  | 'repair_action'
  | 'reassurance';

export type ConflictApologyTiming = 'simultaneous' | 'sequenced';

export interface ConflictSession {
  id: string;
  ownerUserId: string;
  conflictType: ConflictType;
  status: ConflictSessionStatus;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}

export interface ConflictParticipant {
  id: string;
  sessionId: string;
  userId?: string | null;
  email?: string | null;
  role: ConflictParticipantRole;
  joinedAt: string;
}

export interface ConflictStageState {
  id: string;
  sessionId: string;
  participantId: string;
  stage: ConflictStage;
  readiness: ConflictReadiness;
  completedAt?: string | null;
  extensionRequested: boolean;
}
