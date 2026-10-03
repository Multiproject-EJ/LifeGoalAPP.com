import { WORLD_PORTAL_ISLAND } from '../../../onboarding/worldPortalAccess';

/**
 * Life path (user decision 2026-10-03): the life app (Today, habits, goals)
 * opens at Island 040 by default, but players who came for life improvement
 * should not wait that long.
 *
 * 1. After Island 001 the caretaker asks once what brought the player here.
 * 2. An optional fast-track offer opens the life app early: Island 010 by
 *    default, Island 004 for players who said "improving my life". "Not yet"
 *    brings it back a few islands later, and the Compass Book can reopen it.
 * 3. Players who never take it simply keep playing; the portal still opens at
 *    Island 040.
 *
 * Stored once in the signature mission ledger. It holds the intent and offer
 * timing only, never Compass answers.
 */

export const LIFE_PATH_KEY = 'life-path';
export const LIFE_PATH_INTENT_ISLAND = 2;
export const LIFE_FAST_TRACK_DEFAULT_ISLAND = 10;
export const LIFE_FAST_TRACK_LIFE_INTENT_ISLAND = 4;
export const LIFE_FAST_TRACK_REOFFER_GAP = 5;

export type LifePathIntent = 'game' | 'life' | 'both';

export interface LifePathProgress {
  missionId: 'life-path';
  version: 1;
  intent: LifePathIntent | null;
  intentAnsweredAtMs: number | null;
  fastTrackAcceptedAtMs: number | null;
  /** Island where the offer shows next; null = the intent-based default. */
  nextOfferIsland: number | null;
  declineCount: number;
  updatedAtMs: number;
}

const INTENTS: readonly LifePathIntent[] = ['game', 'life', 'both'];

function positiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function createLifePathProgress(nowMs: number): LifePathProgress {
  return {
    missionId: 'life-path', version: 1, intent: null, intentAnsweredAtMs: null,
    fastTrackAcceptedAtMs: null, nextOfferIsland: null, declineCount: 0, updatedAtMs: nowMs,
  };
}

export function sanitizeLifePathProgress(value: unknown): LifePathProgress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.missionId !== 'life-path' || record.version !== 1) return null;
  const intent = INTENTS.includes(record.intent as LifePathIntent) ? record.intent as LifePathIntent : null;
  return {
    missionId: 'life-path',
    version: 1,
    intent,
    intentAnsweredAtMs: intent ? positiveInt(record.intentAnsweredAtMs) : null,
    fastTrackAcceptedAtMs: positiveInt(record.fastTrackAcceptedAtMs),
    nextOfferIsland: positiveInt(record.nextOfferIsland),
    declineCount: positiveInt(record.declineCount) ?? 0,
    updatedAtMs: positiveInt(record.updatedAtMs) ?? 0,
  };
}

/** Acceptance is permanent; otherwise the most recently updated side wins. */
export function mergeLifePathProgress(a: unknown, b: unknown): LifePathProgress | null {
  const left = sanitizeLifePathProgress(a);
  const right = sanitizeLifePathProgress(b);
  if (!left) return right;
  if (!right) return left;
  const newer = left.updatedAtMs >= right.updatedAtMs ? left : right;
  const accepted = [left.fastTrackAcceptedAtMs, right.fastTrackAcceptedAtMs].filter((v): v is number => v !== null);
  return {
    ...newer,
    intent: newer.intent ?? left.intent ?? right.intent,
    intentAnsweredAtMs: newer.intent ? newer.intentAnsweredAtMs : left.intentAnsweredAtMs ?? right.intentAnsweredAtMs,
    fastTrackAcceptedAtMs: accepted.length ? Math.min(...accepted) : null,
    declineCount: Math.max(left.declineCount, right.declineCount),
  };
}

export function resolveLifePathProgress(ledger: Record<string, unknown> | null | undefined): LifePathProgress | null {
  return sanitizeLifePathProgress(ledger?.[LIFE_PATH_KEY]);
}

export function hasAcceptedLifeFastTrack(ledger: Record<string, unknown> | null | undefined): boolean {
  return resolveLifePathProgress(ledger)?.fastTrackAcceptedAtMs != null;
}

export function getLifeFastTrackOfferIsland(progress: LifePathProgress | null): number {
  if (progress?.nextOfferIsland) return progress.nextOfferIsland;
  return progress?.intent === 'life' ? LIFE_FAST_TRACK_LIFE_INTENT_ISLAND : LIFE_FAST_TRACK_DEFAULT_ISLAND;
}

export type LifePathPrompt = 'intent' | 'fast-track' | null;

/** Which life-path prompt (if any) the board should show now. */
export function resolveLifePathPrompt(options: {
  ledger: Record<string, unknown> | null | undefined;
  currentIslandNumber: number;
  cycleIndex: number;
  hasFullAppAccess: boolean;
}): LifePathPrompt {
  const island = Number.isFinite(options.currentIslandNumber) ? Math.floor(options.currentIslandNumber) : 0;
  if (options.hasFullAppAccess || options.cycleIndex > 0 || island >= WORLD_PORTAL_ISLAND) return null;
  const progress = resolveLifePathProgress(options.ledger);
  if (progress?.fastTrackAcceptedAtMs) return null;
  if (!progress?.intent && island >= LIFE_PATH_INTENT_ISLAND) return 'intent';
  if (island >= getLifeFastTrackOfferIsland(progress)) return 'fast-track';
  return null;
}

export function nextOfferIslandAfterDecline(currentIslandNumber: number): number {
  return Math.max(1, Math.floor(currentIslandNumber)) + LIFE_FAST_TRACK_REOFFER_GAP;
}

export const LIFE_PATH_REASSURANCE =
  "You don't have to plan anything. Just keep playing. Every island teaches me a little more about you, and when you're ready I'll turn it into small, bite-size steps. You can say “not yet” as often as you like.";
