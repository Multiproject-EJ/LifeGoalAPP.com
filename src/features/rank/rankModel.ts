/**
 * Player rank domain model — pure, read-only derivation.
 *
 * The 12-rank expedition hierarchy is a *derived* label on the player's
 * progression level. This module performs NO grants, holds NO state, and is
 * deliberately agnostic about *which* level metric feeds it (the Combined
 * Journey Level vs the accrued gamification profile level — see
 * docs/investigations/player-rank-system-integration.md §7/§17). Callers pass a
 * level number; the rank is derived from the threshold table below.
 *
 * Design notes (mirrors combinedJourneyLevel.ts):
 * - Rank is derived, never stored. It can always be recomputed, so it can never
 *   silently desync from progression.
 * - Thresholds are simple reviewed constants in ONE place. Re-tuning the curve
 *   is a single-file change with no migration, because rank keys off level.
 * - The table is the single source of truth for ordinal, title, threshold,
 *   visual tier, and insignia. UI surfaces read it; they do not hard-code ranks.
 *
 * Thresholds are PROVISIONAL (see investigation §8) and must be validated
 * against real progression distributions before launch tuning is locked.
 */

/** Visual treatment groups described in the product brief. */
export type RankTier = 'bronze' | 'command';

/** Higher ranks use stars instead of stripes. */
export type RankInsignia = 'stripes' | 'stars';

export interface RankDefinition {
  /** Ordinal position 1..12 (also the badge index). */
  id: number;
  /** Stable machine key, e.g. 'deckhand'. Never localized. */
  key: string;
  /** Human-facing title, e.g. 'Deckhand'. */
  title: string;
  /**
   * Inclusive minimum progression level at which this rank is held. A player at
   * `level >= minLevel` (and below the next rank's minLevel) holds this rank.
   */
  minLevel: number;
  /** Bronze expedition styling (ranks 1–6) vs command styling (ranks 7–12). */
  tier: RankTier;
  /** Stripes for ordinary ranks; stars for the top two. */
  insignia: RankInsignia;
  /** Star count for star-insignia ranks (Fleet Captain 2, Sky Marshal 3). */
  stars?: number;
  /** Concise in-world description for the rank journey / hero card. */
  description: string;
}

/**
 * The canonical rank ladder, ascending by threshold. PROVISIONAL thresholds —
 * see investigation §8. Keep this sorted ascending by `minLevel`.
 */
export const RANKS: readonly RankDefinition[] = [
  {
    id: 1,
    key: 'deckhand',
    title: 'Deckhand',
    minLevel: 1,
    tier: 'bronze',
    insignia: 'stripes',
    description: 'Every expedition starts on the deck. Welcome aboard.',
  },
  {
    id: 2,
    key: 'crewmate',
    title: 'Crewmate',
    minLevel: 3,
    tier: 'bronze',
    insignia: 'stripes',
    description: 'A trusted hand, pulling their weight with the crew.',
  },
  {
    id: 3,
    key: 'pathfinder',
    title: 'Pathfinder',
    minLevel: 6,
    tier: 'bronze',
    insignia: 'stripes',
    description: 'Scouting the route ahead and finding the way forward.',
  },
  {
    id: 4,
    key: 'navigator',
    title: 'Navigator',
    minLevel: 10,
    tier: 'bronze',
    insignia: 'stripes',
    description: 'Charting the course and keeping the expedition on heading.',
  },
  {
    id: 5,
    key: 'flight-operator',
    title: 'Flight Operator',
    minLevel: 15,
    tier: 'bronze',
    insignia: 'stripes',
    description: 'Running the controls and keeping the crew in motion.',
  },
  {
    id: 6,
    key: 'senior-operator',
    title: 'Senior Operator',
    minLevel: 21,
    tier: 'bronze',
    insignia: 'stripes',
    description: 'A seasoned operator the crew leans on under pressure.',
  },
  {
    id: 7,
    key: 'lieutenant',
    title: 'Lieutenant',
    minLevel: 28,
    tier: 'command',
    insignia: 'stripes',
    description: 'Earning command stripes and leading from the front.',
  },
  {
    id: 8,
    key: 'commander',
    title: 'Commander',
    minLevel: 36,
    tier: 'command',
    insignia: 'stripes',
    description: 'Trusted with command of the expedition.',
  },
  {
    id: 9,
    key: 'wing-commander',
    title: 'Wing Commander',
    minLevel: 45,
    tier: 'command',
    insignia: 'stripes',
    description: 'Commanding the wing across long, demanding journeys.',
  },
  {
    id: 10,
    key: 'captain',
    title: 'Captain',
    minLevel: 55,
    tier: 'command',
    insignia: 'stripes',
    description: 'The captain — the standard the crew measures itself by.',
  },
  {
    id: 11,
    key: 'fleet-captain',
    title: 'Fleet Captain',
    minLevel: 70,
    tier: 'command',
    insignia: 'stars',
    stars: 2,
    description: 'Two stars. Command of the fleet, earned over the long haul.',
  },
  {
    id: 12,
    key: 'sky-marshal',
    title: 'Sky Marshal',
    minLevel: 90,
    tier: 'command',
    insignia: 'stars',
    stars: 3,
    description: 'Three stars. The highest rank of the expedition.',
  },
] as const;

/** Lowest rank (always held). */
export const MIN_RANK: RankDefinition = RANKS[0];
/** Highest rank attainable. */
export const MAX_RANK: RankDefinition = RANKS[RANKS.length - 1];

/** Look up a rank by ordinal id, or undefined if out of range. */
export function getRankById(id: number): RankDefinition | undefined {
  return RANKS.find((rank) => rank.id === id);
}

function sanitizeLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.floor(level));
}

/**
 * The rank held at a given progression level. Returns the highest rank whose
 * `minLevel` is met. Always returns at least {@link MIN_RANK}.
 */
export function rankForLevel(level: number): RankDefinition {
  const safeLevel = sanitizeLevel(level);
  let held: RankDefinition = MIN_RANK;
  for (const rank of RANKS) {
    if (safeLevel >= rank.minLevel) {
      held = rank;
    } else {
      break; // RANKS is sorted ascending; no later rank can qualify.
    }
  }
  return held;
}

/** True when the given rank is the top of the ladder. */
export function isMaxRank(rank: RankDefinition): boolean {
  return rank.id === MAX_RANK.id;
}

/**
 * The next rank above the rank held at `level`, or null if already at the top.
 */
export function nextRankForLevel(level: number): RankDefinition | null {
  const current = rankForLevel(level);
  if (isMaxRank(current)) return null;
  return getRankById(current.id + 1) ?? null;
}

export interface RankProgress {
  /** Rank currently held. */
  current: RankDefinition;
  /** Next rank to earn, or null at max rank. */
  next: RankDefinition | null;
  /** Whole levels still required to reach `next` (0 at max rank). */
  levelsRemaining: number;
  /** Fill toward the next rank, 0..100. 100 at max rank. */
  percent: number;
}

/**
 * Progress from the current rank toward the next.
 *
 * `levelProgressFraction` (0..1) is the player's progress *within* their current
 * level on the underlying metric; supplying it makes the bar smooth between
 * whole levels. It defaults to 0 (snap to whole levels) so the function stays
 * usable with only an integer level.
 */
export function progressToNextRank(level: number, levelProgressFraction = 0): RankProgress {
  const safeLevel = sanitizeLevel(level);
  const current = rankForLevel(safeLevel);
  const next = nextRankForLevel(safeLevel);

  if (!next) {
    return { current, next: null, levelsRemaining: 0, percent: 100 };
  }

  const frac = Number.isFinite(levelProgressFraction)
    ? Math.min(1, Math.max(0, levelProgressFraction))
    : 0;
  const effectiveLevel = safeLevel + frac;

  const bandStart = current.minLevel;
  const bandEnd = next.minLevel;
  const bandSpan = Math.max(1, bandEnd - bandStart);

  const intoBand = Math.max(0, effectiveLevel - bandStart);
  const percent = Math.min(100, Math.max(0, Math.round((intoBand / bandSpan) * 100)));
  const levelsRemaining = Math.max(0, bandEnd - safeLevel);

  return { current, next, levelsRemaining, percent };
}
