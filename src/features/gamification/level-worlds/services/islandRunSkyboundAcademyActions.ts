import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  createSkyboundAcademyEventProgress,
  type SkyboundAcademyEventProgress,
} from './skyboundAcademyStorage';
import {
  evaluateSkyboundLesson,
  isSkyboundLessonUnlocked,
  settleSkyboundAcademyLessonWithRewards,
  type SkyboundLessonEvaluation,
  type SkyboundLessonId,
} from './skyboundPilotAcademy';
import {
  getSkyboundUpgradeCost,
  scoreSkyboundFlight,
  upgradeSkyboundPart,
  type SkyboundFlightState,
  type SkyboundUpgradeKind,
} from './skyboundExpeditionFlight';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { recordEventMinigameCompletion } from './islandRunEventEngine';
import { withIslandRunActionLock } from './islandRunActionMutex';

const SKYBOUND_TICKET_COST = 1;
const MAX_SETTLED_ATTEMPT_IDS = 80;

export type SkyboundSortieStartFailureReason =
  | 'missing_event'
  | 'invalid_attempt'
  | 'lesson_locked'
  | 'insufficient_tickets';

export interface SkyboundSortieStartResult {
  record: IslandRunGameStateRecord;
  ok: boolean;
  ticketsRemaining: number;
  progress: SkyboundAcademyEventProgress;
  failureReason?: SkyboundSortieStartFailureReason;
}

export type SkyboundSortieSettlementFailureReason =
  | 'missing_event'
  | 'invalid_attempt'
  | 'stale_attempt';

export interface SkyboundSortieSettlementResult {
  record: IslandRunGameStateRecord;
  ok: boolean;
  alreadySettled: boolean;
  ticketsRemaining: number;
  ticketsAwarded: number;
  rewardBarProgressAdded: number;
  progress: SkyboundAcademyEventProgress;
  evaluation: SkyboundLessonEvaluation;
  salvageAwarded: number;
  failureReason?: SkyboundSortieSettlementFailureReason;
}

export type SkyboundUpgradeFailureReason = 'missing_event' | 'max_level' | 'insufficient_salvage';

export interface SkyboundUpgradeResult {
  record: IslandRunGameStateRecord;
  ok: boolean;
  cost: number;
  progress: SkyboundAcademyEventProgress;
  failureReason?: SkyboundUpgradeFailureReason;
}

function currentProgress(record: IslandRunGameStateRecord, eventId: string): SkyboundAcademyEventProgress {
  return record.skyboundAcademyProgressByEvent?.[eventId] ?? createSkyboundAcademyEventProgress(Date.now());
}

async function commitProgress(options: {
  session: Session;
  client: SupabaseClient | null;
  record: IslandRunGameStateRecord;
  eventId: string;
  progress: SkyboundAcademyEventProgress;
  triggerSource: string;
}): Promise<IslandRunGameStateRecord> {
  const next: IslandRunGameStateRecord = {
    ...options.record,
    runtimeVersion: options.record.runtimeVersion + 1,
    skyboundAcademyProgressByEvent: {
      ...options.record.skyboundAcademyProgressByEvent,
      [options.eventId]: options.progress,
    },
  };
  await commitIslandRunState({
    session: options.session,
    client: options.client,
    record: next,
    triggerSource: options.triggerSource,
  });
  return next;
}

export function initSkyboundAcademyProgressForEvent(options: {
  session: Session;
  client: SupabaseClient | null;
  eventId: string;
  triggerSource?: string;
}): Promise<IslandRunGameStateRecord> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const current = getIslandRunStateSnapshot(options.session);
    const eventId = options.eventId.trim();
    if (!eventId || current.skyboundAcademyProgressByEvent?.[eventId]) return current;
    const progress = createSkyboundAcademyEventProgress(Date.now());
    return commitProgress({
      session: options.session,
      client: options.client,
      record: current,
      eventId,
      progress,
      triggerSource: options.triggerSource ?? 'init_skybound_academy_progress',
    });
  });
}

export function startSkyboundSortie(options: {
  session: Session;
  client: SupabaseClient | null;
  eventId: string;
  attemptId: string;
  lessonId: SkyboundLessonId;
  triggerSource?: string;
}): Promise<SkyboundSortieStartResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const eventId = options.eventId.trim();
    const attemptId = options.attemptId.trim();
    const current = getIslandRunStateSnapshot(options.session);
  const fallbackProgress = eventId ? currentProgress(current, eventId) : createSkyboundAcademyEventProgress(Date.now());
  const available = eventId ? Math.max(0, Math.floor(current.minigameTicketsByEvent?.[eventId] ?? 0)) : 0;
  if (!eventId) return { record: current, ok: false, ticketsRemaining: 0, progress: fallbackProgress, failureReason: 'missing_event' };
  if (!attemptId) return { record: current, ok: false, ticketsRemaining: available, progress: fallbackProgress, failureReason: 'invalid_attempt' };
  if (!isSkyboundLessonUnlocked(fallbackProgress.progress, options.lessonId)) {
    return { record: current, ok: false, ticketsRemaining: available, progress: fallbackProgress, failureReason: 'lesson_locked' };
  }
  if (available < SKYBOUND_TICKET_COST) {
    return { record: current, ok: false, ticketsRemaining: available, progress: fallbackProgress, failureReason: 'insufficient_tickets' };
  }

  const nowMs = Date.now();
  const nextProgress: SkyboundAcademyEventProgress = {
    ...fallbackProgress,
    progress: {
      ...fallbackProgress.progress,
      tickets: 0,
      sorties: fallbackProgress.progress.sorties + 1,
    },
    activeAttemptId: attemptId,
    activeLessonId: options.lessonId,
    updatedAtMs: nowMs,
  };
  const next: IslandRunGameStateRecord = {
    ...current,
    runtimeVersion: current.runtimeVersion + 1,
    minigameTicketsByEvent: {
      ...current.minigameTicketsByEvent,
      [eventId]: available - SKYBOUND_TICKET_COST,
    },
    skyboundAcademyProgressByEvent: {
      ...current.skyboundAcademyProgressByEvent,
      [eventId]: nextProgress,
    },
  };
  await commitIslandRunState({
    session: options.session,
    client: options.client,
    record: next,
    triggerSource: options.triggerSource ?? 'start_skybound_sortie',
  });
    return { record: next, ok: true, ticketsRemaining: available - SKYBOUND_TICKET_COST, progress: nextProgress };
  });
}

export function settleSkyboundSortie(options: {
  session: Session;
  client: SupabaseClient | null;
  eventId: string;
  attemptId: string;
  flight: SkyboundFlightState;
  triggerSource?: string;
}): Promise<SkyboundSortieSettlementResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const eventId = options.eventId.trim();
    const attemptId = options.attemptId.trim();
    const current = getIslandRunStateSnapshot(options.session);
  const progress = eventId ? currentProgress(current, eventId) : createSkyboundAcademyEventProgress(Date.now());
  const lessonId = (progress.activeLessonId ?? 'cadet_launch') as SkyboundLessonId;
  const evaluation = evaluateSkyboundLesson(lessonId, options.flight);
  const available = eventId ? Math.max(0, Math.floor(current.minigameTicketsByEvent?.[eventId] ?? 0)) : 0;
  const salvageAwarded = scoreSkyboundFlight(options.flight);
  if (!eventId) return { record: current, ok: false, alreadySettled: false, ticketsRemaining: 0, ticketsAwarded: 0, rewardBarProgressAdded: 0, progress, evaluation, salvageAwarded: 0, failureReason: 'missing_event' };
  if (!attemptId) return { record: current, ok: false, alreadySettled: false, ticketsRemaining: available, ticketsAwarded: 0, rewardBarProgressAdded: 0, progress, evaluation, salvageAwarded: 0, failureReason: 'invalid_attempt' };
  if (progress.settledAttemptIds.includes(attemptId)) {
    return { record: current, ok: true, alreadySettled: true, ticketsRemaining: available, ticketsAwarded: 0, rewardBarProgressAdded: 0, progress, evaluation, salvageAwarded: 0 };
  }
  if (progress.activeAttemptId !== attemptId || !progress.activeLessonId) {
    return { record: current, ok: false, alreadySettled: false, ticketsRemaining: available, ticketsAwarded: 0, rewardBarProgressAdded: 0, progress, evaluation, salvageAwarded: 0, failureReason: 'stale_attempt' };
  }

  const canonicalEvaluation = evaluateSkyboundLesson(progress.activeLessonId, options.flight);
  const settlement = settleSkyboundAcademyLessonWithRewards(progress.progress, canonicalEvaluation);
  const nextProgress: SkyboundAcademyEventProgress = {
    ...progress,
    progress: { ...settlement.progress, tickets: 0 },
    salvage: progress.salvage + salvageAwarded,
    bestFlightScore: Math.max(progress.bestFlightScore, salvageAwarded),
    activeAttemptId: null,
    activeLessonId: null,
    settledAttemptIds: [...progress.settledAttemptIds, attemptId].slice(-MAX_SETTLED_ATTEMPT_IDS),
    updatedAtMs: Date.now(),
  };

  const rewardBarBefore = current.rewardBarProgress;
  const rewardBarState = canonicalEvaluation.passed
    && current.activeTimedEvent?.eventId === eventId
    && current.activeTimedEvent.eventType === 'skybound_expedition'
    ? recordEventMinigameCompletion({
        state: {
          rewardBarProgress: current.rewardBarProgress,
          rewardBarThreshold: current.rewardBarThreshold,
          rewardBarClaimCountInEvent: current.rewardBarClaimCountInEvent,
          rewardBarEscalationTier: current.rewardBarEscalationTier,
          rewardBarLastClaimAtMs: current.rewardBarLastClaimAtMs,
          rewardBarBoundEventId: current.rewardBarBoundEventId,
          rewardBarLadderId: current.rewardBarLadderId,
          activeTimedEvent: current.activeTimedEvent,
          activeTimedEventProgress: current.activeTimedEventProgress,
          stickerProgress: current.stickerProgress,
          stickerInventory: current.stickerInventory,
        },
        minigameId: 'skybound_expedition',
        nowMs: Date.now(),
        multiplier: canonicalEvaluation.ace ? 2 : 1,
      })
    : null;
  const ticketsRemaining = available + settlement.ticketsAwarded;
  const next: IslandRunGameStateRecord = {
    ...current,
    ...(rewardBarState ?? {}),
    runtimeVersion: current.runtimeVersion + 1,
    minigameTicketsByEvent: {
      ...current.minigameTicketsByEvent,
      [eventId]: ticketsRemaining,
    },
    skyboundAcademyProgressByEvent: {
      ...current.skyboundAcademyProgressByEvent,
      [eventId]: nextProgress,
    },
  };
  await commitIslandRunState({
    session: options.session,
    client: options.client,
    record: next,
    triggerSource: options.triggerSource ?? 'settle_skybound_sortie',
  });
    return {
      record: next,
      ok: true,
      alreadySettled: false,
      ticketsRemaining,
      ticketsAwarded: settlement.ticketsAwarded,
      rewardBarProgressAdded: Math.max(0, next.rewardBarProgress - rewardBarBefore),
      progress: nextProgress,
      evaluation: canonicalEvaluation,
      salvageAwarded,
    };
  });
}

export function upgradeSkyboundFleetPart(options: {
  session: Session;
  client: SupabaseClient | null;
  eventId: string;
  kind: SkyboundUpgradeKind;
  triggerSource?: string;
}): Promise<SkyboundUpgradeResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const eventId = options.eventId.trim();
    const current = getIslandRunStateSnapshot(options.session);
  const progress = eventId ? currentProgress(current, eventId) : createSkyboundAcademyEventProgress(Date.now());
  if (!eventId) return { record: current, ok: false, cost: 0, progress, failureReason: 'missing_event' };
  const level = progress.upgrades[options.kind];
  const cost = getSkyboundUpgradeCost(options.kind, level);
  if (level >= 5) return { record: current, ok: false, cost, progress, failureReason: 'max_level' };
  if (progress.salvage < cost) return { record: current, ok: false, cost, progress, failureReason: 'insufficient_salvage' };
  const nextProgress: SkyboundAcademyEventProgress = {
    ...progress,
    upgrades: upgradeSkyboundPart(progress.upgrades, options.kind),
    salvage: progress.salvage - cost,
    updatedAtMs: Date.now(),
  };
  const next = await commitProgress({
    session: options.session,
    client: options.client,
    record: current,
    eventId,
    progress: nextProgress,
    triggerSource: options.triggerSource ?? 'upgrade_skybound_fleet_part',
  });
    return { record: next, ok: true, cost, progress: nextProgress };
  });
}
