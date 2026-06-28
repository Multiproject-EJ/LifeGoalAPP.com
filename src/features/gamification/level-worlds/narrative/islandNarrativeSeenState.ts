/**
 * islandNarrativeSeenState — shared shape + pure helpers for the per-beat
 * narrative "seen" ledger.
 *
 * This ledger records which one-time narrative beats/episodes a player has
 * already been shown. It is **non-gameplay** state: it never affects dice,
 * rewards, stops, builds, bosses, or travel. It is persisted two ways:
 *   1. localStorage (immediate, offline-safe) — see `useIslandNarrativeOpeningFlow`.
 *   2. the canonical Island Run runtime record (`narrative_seen_state` jsonb),
 *      so story memory follows the player across devices.
 *
 * Both layers are unioned on read (a beat seen anywhere is considered seen),
 * which is why the merge keeps the most-recent timestamp per key.
 *
 * This module is intentionally a dependency-free leaf so the canonical state
 * store can import it without creating a cycle with the narrative feature.
 */

export interface IslandNarrativeSeenState {
  /** beatId -> epoch-ms first marked seen. */
  beats: Record<string, number>;
  /** episodeId -> epoch-ms first marked seen. */
  episodes: Record<string, number>;
}

export function createEmptyIslandNarrativeSeenState(): IslandNarrativeSeenState {
  return { beats: {}, episodes: {} };
}

function sanitizeTimestampMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, ts] of Object.entries(value as Record<string, unknown>)) {
    if (typeof ts === 'number' && Number.isFinite(ts)) out[key] = ts;
  }
  return out;
}

export function sanitizeIslandNarrativeSeenState(value: unknown): IslandNarrativeSeenState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyIslandNarrativeSeenState();
  }
  const candidate = value as { beats?: unknown; episodes?: unknown };
  return {
    beats: sanitizeTimestampMap(candidate.beats),
    episodes: sanitizeTimestampMap(candidate.episodes),
  };
}

function mergeTimestampMaps(
  left: Record<string, number>,
  right: Record<string, number>,
): Record<string, number> {
  const merged: Record<string, number> = { ...left };
  for (const [key, ts] of Object.entries(right)) {
    merged[key] = typeof merged[key] === 'number' ? Math.max(merged[key], ts) : ts;
  }
  return merged;
}

/**
 * Unions two seen-ledgers. A beat/episode present in either side stays seen;
 * when both sides have a key, the most-recent timestamp wins.
 */
export function mergeIslandNarrativeSeenState(
  a: IslandNarrativeSeenState | null | undefined,
  b: IslandNarrativeSeenState | null | undefined,
): IslandNarrativeSeenState {
  const left = sanitizeIslandNarrativeSeenState(a);
  const right = sanitizeIslandNarrativeSeenState(b);
  return {
    beats: mergeTimestampMaps(left.beats, right.beats),
    episodes: mergeTimestampMaps(left.episodes, right.episodes),
  };
}

function areTimestampMapsEqual(
  left: Record<string, number>,
  right: Record<string, number>,
): boolean {
  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every((key) => right[key] === left[key]);
}

export function isIslandNarrativeSeenStateEqual(
  a: IslandNarrativeSeenState | null | undefined,
  b: IslandNarrativeSeenState | null | undefined,
): boolean {
  const left = sanitizeIslandNarrativeSeenState(a);
  const right = sanitizeIslandNarrativeSeenState(b);
  return areTimestampMapsEqual(left.beats, right.beats) && areTimestampMapsEqual(left.episodes, right.episodes);
}
