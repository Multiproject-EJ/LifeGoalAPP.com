import { WORLD_PORTAL_EVENT_ID, WORLD_PORTAL_ISLAND } from '../../../onboarding/worldPortalAccess';

export const WORLD_PORTAL_KEY = WORLD_PORTAL_EVENT_ID;
export interface WorldPortalProgress {
  missionId: 'world-portal';
  version: 1;
  acceptedAtMs: number;
  updatedAtMs: number;
}

/** No answers, preferences, currency or paid entitlement in this story receipt. */
export function sanitizeWorldPortalProgress(value: unknown): WorldPortalProgress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.missionId !== 'world-portal' || record.version !== 1
    || typeof record.acceptedAtMs !== 'number' || !Number.isSafeInteger(record.acceptedAtMs)
    || record.acceptedAtMs <= 0) return null;
  return { missionId: 'world-portal', version: 1,
    acceptedAtMs: record.acceptedAtMs, updatedAtMs: record.acceptedAtMs };
}

export function mergeWorldPortalProgress(a: unknown, b: unknown): WorldPortalProgress | null {
  const left = sanitizeWorldPortalProgress(a), right = sanitizeWorldPortalProgress(b);
  if (!left) return right;
  if (!right) return left;
  return left.acceptedAtMs <= right.acceptedAtMs ? left : right;
}

export function resolveWorldPortalProgress(progress: Record<string, unknown>): WorldPortalProgress | null {
  return sanitizeWorldPortalProgress(progress[WORLD_PORTAL_KEY]);
}

/** Only pass canonical state, never a preview route or displayed rank. */
export function canAttendWorldPortalCouncil(state: { currentIslandNumber: number; cycleIndex: number }): boolean {
  return (Number.isSafeInteger(state.currentIslandNumber) && state.currentIslandNumber >= WORLD_PORTAL_ISLAND)
    || (Number.isSafeInteger(state.cycleIndex) && state.cycleIndex > 0);
}
