import { ARCHETYPE_DECK, type SuitKey } from '../../../identity/archetypes/archetypeDeck';

/**
 * Archetype Cup — structural foundation.
 *
 * A seasonal event in which the player's activities earn points for
 * archetypes (the 4-suit archetype deck: Power, Heart, Mind, Spirit). This
 * module owns only the shape and the rules that must never change under the
 * later scoring, gameplay, presentation and reward work:
 *
 * - points are keyed by archetype id and roll up into suit totals;
 * - every contribution carries a stable activity id and applies once;
 * - one season at a time; a new season starts from zero;
 * - persisted progress is sanitised and merged like other owner-scoped
 *   Island Run progress (see `islandRunSignatureMissions.ts`).
 *
 * Activity → archetype weighting, rewards and UI are deliberately open.
 */

export const ARCHETYPE_CUP_KEY = 'archetype-cup-v1';
export const ARCHETYPE_CUP_SUITS: readonly SuitKey[] = ['power', 'heart', 'mind', 'spirit'];
/** Guard against runaway or corrupted contributions. */
export const ARCHETYPE_CUP_MAX_POINTS_PER_ACTIVITY = 100;
/** Idempotency memory: the newest applied activity ids per season. */
export const ARCHETYPE_CUP_APPLIED_ACTIVITY_LIMIT = 500;

export type ArchetypeCupActivityKind =
  | 'habit_check_in'
  | 'arena_game'
  | 'reflection'
  | 'build'
  | 'island_mission'
  | 'other';

const ACTIVITY_KINDS: readonly ArchetypeCupActivityKind[] = ['habit_check_in', 'arena_game', 'reflection', 'build', 'island_mission', 'other'];

export interface ArchetypeCupContribution {
  /** Stable id of the thing that earned the points (e.g. `habit:<logId>`); applies once. */
  activityId: string;
  kind: ArchetypeCupActivityKind;
  /** Archetype card id from the archetype deck. */
  archetypeId: string;
  points: number;
  atMs: number;
}

export interface ArchetypeCupProgress {
  missionId: 'archetype-cup';
  version: 1;
  seasonId: string | null;
  scoresByArchetype: Record<string, number>;
  appliedActivityIds: string[];
  contributionCount: number;
  lastContributionAtMs: number | null;
  updatedAtMs: number;
}

export interface ArchetypeCupStanding {
  suit: SuitKey;
  points: number;
  /** Archetypes of this suit, highest first. */
  archetypes: { archetypeId: string; points: number }[];
}

const ARCHETYPE_SUIT_BY_ID = new Map(ARCHETYPE_DECK.map((card) => [card.id, card.suit] as const));

export function isArchetypeCupArchetype(id: unknown): id is string {
  return typeof id === 'string' && ARCHETYPE_SUIT_BY_ID.has(id);
}

export function createArchetypeCupProgress(seasonId: string | null = null, nowMs = 0): ArchetypeCupProgress {
  return {
    missionId: 'archetype-cup',
    version: 1,
    seasonId,
    scoresByArchetype: {},
    appliedActivityIds: [],
    contributionCount: 0,
    lastContributionAtMs: null,
    updatedAtMs: nowMs,
  };
}

const finiteNonNegative = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0);

export function sanitizeArchetypeCupProgress(value: unknown): ArchetypeCupProgress {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<ArchetypeCupProgress>;
  const scoresByArchetype: Record<string, number> = {};
  if (raw.scoresByArchetype && typeof raw.scoresByArchetype === 'object') {
    for (const [id, points] of Object.entries(raw.scoresByArchetype)) {
      if (isArchetypeCupArchetype(id) && finiteNonNegative(points) > 0) scoresByArchetype[id] = Math.floor(finiteNonNegative(points));
    }
  }
  const appliedActivityIds = Array.isArray(raw.appliedActivityIds)
    ? Array.from(new Set(raw.appliedActivityIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 160)))
      .slice(-ARCHETYPE_CUP_APPLIED_ACTIVITY_LIMIT)
    : [];
  return {
    missionId: 'archetype-cup',
    version: 1,
    seasonId: typeof raw.seasonId === 'string' && raw.seasonId.length <= 80 ? raw.seasonId : null,
    scoresByArchetype,
    appliedActivityIds,
    contributionCount: Math.floor(finiteNonNegative(raw.contributionCount)),
    lastContributionAtMs: typeof raw.lastContributionAtMs === 'number' && Number.isFinite(raw.lastContributionAtMs) ? raw.lastContributionAtMs : null,
    updatedAtMs: finiteNonNegative(raw.updatedAtMs),
  };
}

export type ArchetypeCupApplyResult =
  | { applied: true; progress: ArchetypeCupProgress }
  | { applied: false; reason: 'duplicate' | 'invalid'; progress: ArchetypeCupProgress };

/**
 * Applies one contribution to `seasonId`. A different season id than the
 * stored one starts that season from zero (the caller passes the canonical
 * active season). Pure: returns a new progress object.
 */
export function applyArchetypeCupContribution(
  current: ArchetypeCupProgress,
  seasonId: string,
  contribution: ArchetypeCupContribution,
): ArchetypeCupApplyResult {
  const valid = typeof contribution.activityId === 'string' && contribution.activityId.length > 0
    && contribution.activityId.length <= 160
    && ACTIVITY_KINDS.includes(contribution.kind)
    && isArchetypeCupArchetype(contribution.archetypeId)
    && Number.isFinite(contribution.points) && contribution.points > 0
    && Number.isFinite(contribution.atMs);
  if (!valid || !seasonId) return { applied: false, reason: 'invalid', progress: current };
  const base = current.seasonId === seasonId ? current : createArchetypeCupProgress(seasonId, contribution.atMs);
  if (base.appliedActivityIds.includes(contribution.activityId)) return { applied: false, reason: 'duplicate', progress: current };
  const points = Math.min(ARCHETYPE_CUP_MAX_POINTS_PER_ACTIVITY, Math.floor(contribution.points));
  return {
    applied: true,
    progress: {
      ...base,
      scoresByArchetype: {
        ...base.scoresByArchetype,
        [contribution.archetypeId]: (base.scoresByArchetype[contribution.archetypeId] ?? 0) + points,
      },
      appliedActivityIds: [...base.appliedActivityIds, contribution.activityId].slice(-ARCHETYPE_CUP_APPLIED_ACTIVITY_LIMIT),
      contributionCount: base.contributionCount + 1,
      lastContributionAtMs: contribution.atMs,
      updatedAtMs: contribution.atMs,
    },
  };
}

/** Suit standings, highest first; ties keep the canonical suit order. */
export function resolveArchetypeCupStandings(progress: ArchetypeCupProgress): ArchetypeCupStanding[] {
  const standings = ARCHETYPE_CUP_SUITS.map((suit) => {
    const archetypes = Object.entries(progress.scoresByArchetype)
      .filter(([id]) => ARCHETYPE_SUIT_BY_ID.get(id) === suit)
      .map(([archetypeId, points]) => ({ archetypeId, points }))
      .sort((a, b) => b.points - a.points || a.archetypeId.localeCompare(b.archetypeId));
    return { suit, points: archetypes.reduce((sum, entry) => sum + entry.points, 0), archetypes };
  });
  return standings
    .map((standing, order) => ({ standing, order }))
    .sort((a, b) => b.standing.points - a.standing.points || a.order - b.order)
    .map(({ standing }) => standing);
}

/**
 * Conflict merge for two saves of the same player. Same season: per-archetype
 * max (contributions only ever add) and the union of applied ids. Different
 * seasons: the most recently updated season wins outright.
 */
export function mergeArchetypeCupProgress(a: ArchetypeCupProgress, b: ArchetypeCupProgress): ArchetypeCupProgress {
  if (a.seasonId !== b.seasonId) return a.updatedAtMs >= b.updatedAtMs ? a : b;
  const scoresByArchetype: Record<string, number> = { ...a.scoresByArchetype };
  for (const [id, points] of Object.entries(b.scoresByArchetype)) scoresByArchetype[id] = Math.max(scoresByArchetype[id] ?? 0, points);
  return sanitizeArchetypeCupProgress({
    ...a,
    scoresByArchetype,
    appliedActivityIds: [...a.appliedActivityIds, ...b.appliedActivityIds],
    contributionCount: Math.max(a.contributionCount, b.contributionCount),
    lastContributionAtMs: Math.max(a.lastContributionAtMs ?? 0, b.lastContributionAtMs ?? 0) || null,
    updatedAtMs: Math.max(a.updatedAtMs, b.updatedAtMs),
  });
}
