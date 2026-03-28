import type { ConflictStage } from '../types/conflictSession';

export const getConflictSessionChannel = (sessionId: string) => `conflict:${sessionId}`;

export const CONFLICT_REALTIME_EVENT_TYPES = [
  'session.created',
  'session.updated',
  'stage.entered',
  'stage.completed',
  'participant.joined',
  'participant.left',
  'summary.updated',
  'parallel_read.alignment_reached',
  'proposal.created',
  'proposal.updated',
  'apology.updated',
  'agreement.updated',
] as const;

export type ConflictRealtimeEventType = (typeof CONFLICT_REALTIME_EVENT_TYPES)[number];

export type ConflictRealtimeEventPayloadMap = {
  'session.created': { sessionId: string; ownerUserId: string };
  'session.updated': { sessionId: string; status: ConflictStage };
  'stage.entered': { sessionId: string; stage: ConflictStage; participantId?: string };
  'stage.completed': { sessionId: string; stage: ConflictStage; participantId: string };
  'participant.joined': { sessionId: string; participantId: string };
  'participant.left': { sessionId: string; participantId: string };
  'summary.updated': { sessionId: string; summaryId: string; stage: ConflictStage };
  'parallel_read.alignment_reached': { sessionId: string; participantId: string; annotationCount: number };
  'proposal.created': { sessionId: string; proposalId: string };
  'proposal.updated': { sessionId: string; proposalId: string };
  'apology.updated': { sessionId: string; apologyId: string };
  'agreement.updated': { sessionId: string; agreementId: string };
};

export type ConflictRealtimeEvent<TType extends ConflictRealtimeEventType = ConflictRealtimeEventType> = {
  type: TType;
  payload: ConflictRealtimeEventPayloadMap[TType];
  emittedAt: string;
};
