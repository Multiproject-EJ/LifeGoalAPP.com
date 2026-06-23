/**
 * Rank promotion acknowledgement — pending-promotion derivation + persistence.
 *
 * Rank itself is always derived from the Combined Journey Level. The only thing
 * we persist is which rank the player has already *celebrated*, so a promotion
 * is shown exactly once. This is the acknowledgement-state model from the
 * investigation (§10): current derived rank vs highest acknowledged rank.
 *
 * v1 stores the acknowledged rank in localStorage (no schema). It is a UI
 * de-dupe, not authoritative — losing it at worst replays one celebration. A
 * server-side ledger (mirroring migration 0257) can supersede this later without
 * changing the pure logic below.
 */

import { MIN_RANK } from './rankModel';

export interface PendingPromotion {
  /** Rank the player is promoting *from* (their last acknowledged rank). */
  fromRankId: number;
  /** Rank the player is promoting *to* (their current derived rank). */
  toRankId: number;
  /** Intermediate ranks crossed in a multi-rank jump (exclusive of from/to). */
  skippedRankIds: number[];
}

/**
 * Pure: the pending promotion given the acknowledged and current rank ids, or
 * null when there is nothing new to celebrate. Handles multi-rank jumps by
 * reporting the intermediate ranks so the UI can show a condensed celebration.
 */
export function computePendingPromotion(
  acknowledgedRankId: number,
  currentRankId: number,
): PendingPromotion | null {
  if (!Number.isFinite(currentRankId) || !Number.isFinite(acknowledgedRankId)) return null;
  if (currentRankId <= acknowledgedRankId) return null;

  const skippedRankIds: number[] = [];
  for (let id = acknowledgedRankId + 1; id < currentRankId; id += 1) {
    skippedRankIds.push(id);
  }
  return { fromRankId: acknowledgedRankId, toRankId: currentRankId, skippedRankIds };
}

const STORAGE_PREFIX = 'habitgame:rank:ack:';

function storageKey(userId: string | null | undefined): string {
  return `${STORAGE_PREFIX}${userId ?? 'anon'}`;
}

/** Highest rank the player has acknowledged. Defaults to the minimum rank. */
export function loadAcknowledgedRankId(userId: string | null | undefined): number {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= MIN_RANK.id ? parsed : MIN_RANK.id;
  } catch {
    return MIN_RANK.id;
  }
}

/** Persist the highest acknowledged rank (monotonic — never lowers it). */
export function saveAcknowledgedRankId(userId: string | null | undefined, rankId: number): void {
  try {
    const current = loadAcknowledgedRankId(userId);
    const next = Math.max(current, Math.floor(rankId));
    window.localStorage.setItem(storageKey(userId), String(next));
  } catch {
    // Best-effort: a failed write only risks replaying one celebration.
  }
}
