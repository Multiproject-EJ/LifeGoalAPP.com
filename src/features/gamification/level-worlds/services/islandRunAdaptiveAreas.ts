import {
  LIFE_WHEEL_AREA_TAXONOMY,
  getCheckinKeyForArea,
  isLifeWheelArea,
  type LifeWheelArea,
} from '../../../life-wheel/lifeWheelTaxonomy';

/**
 * Adaptive Habit Landmark selection.
 *
 * Given the player's latest check-in scores (0-10 per area) and the areas
 * already covered by an active habit, decide which life areas to offer in the
 * Island Run habit landmark. Rules (product decisions):
 *  - An area is "weak" when its latest check-in score is below 5 — always offer.
 *  - An OK area (score >= 5) is hidden only when it already has a supporting
 *    active habit; OK-but-uncovered areas are still offered.
 *  - If every area is OK and covered, fall back to offering all areas so the
 *    player can always add a habit.
 *
 * The check-in gate (require a check-in first) is handled by the caller; these
 * helpers assume scores are available.
 */
export const WEAK_SCORE_THRESHOLD = 5;

/** Neutral score used when a check-in omits an area (keeps it out of "weak"). */
const NEUTRAL_SCORE = 5;

export type AreaReadiness = {
  area: LifeWheelArea;
  score: number;
  isWeak: boolean;
  hasSupportingHabit: boolean;
  shouldOffer: boolean;
};

export type CheckinScoreMap = Record<string, number>;

/**
 * Parse a raw check-in `scores` jsonb value into a numeric map keyed by
 * check-in category key. Non-numeric / malformed entries are ignored.
 */
export function parseCheckinScoreMap(scores: unknown): CheckinScoreMap {
  const map: CheckinScoreMap = {};
  if (scores && typeof scores === 'object' && !Array.isArray(scores)) {
    for (const [key, value] of Object.entries(scores as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        map[key] = value;
      }
    }
  }
  return map;
}

/**
 * Infer which life areas already have a supporting active habit. Island Run
 * habits tag their area in `habit_environment` ("Area: Health"); other habits
 * may carry the area name or check-in key in `domain_key`.
 */
export function deriveSupportedAreas(
  habits: ReadonlyArray<{ habit_environment?: string | null; domain_key?: string | null }>,
): Set<LifeWheelArea> {
  const supported = new Set<LifeWheelArea>();
  for (const habit of habits) {
    const env = habit.habit_environment ?? '';
    const domainKey = (habit.domain_key ?? '').trim().toLowerCase();
    for (const meta of LIFE_WHEEL_AREA_TAXONOMY) {
      if (env.includes(`Area: ${meta.area}`)) {
        supported.add(meta.area);
      } else if (domainKey && (domainKey === meta.area.toLowerCase() || domainKey === meta.checkinKey)) {
        supported.add(meta.area);
      }
    }
  }
  return supported;
}

export function computeAreaReadiness(params: {
  checkinScores: CheckinScoreMap;
  supportedAreas: ReadonlySet<LifeWheelArea>;
}): AreaReadiness[] {
  return LIFE_WHEEL_AREA_TAXONOMY.map((meta) => {
    const rawScore = params.checkinScores[getCheckinKeyForArea(meta.area)];
    const score = typeof rawScore === 'number' ? rawScore : NEUTRAL_SCORE;
    const isWeak = score < WEAK_SCORE_THRESHOLD;
    const hasSupportingHabit = params.supportedAreas.has(meta.area);
    const shouldOffer = isWeak || !hasSupportingHabit;
    return { area: meta.area, score, isWeak, hasSupportingHabit, shouldOffer };
  });
}

/**
 * Pick the areas to show in the landmark. Weak/uncovered areas first (weak
 * before merely-uncovered, then by ascending score). Falls back to every area
 * when nothing qualifies.
 */
export function selectOfferableAreas(readiness: AreaReadiness[]): LifeWheelArea[] {
  const offered = readiness.filter((entry) => entry.shouldOffer);
  const ordered = (offered.length > 0 ? offered : readiness)
    .slice()
    .sort((a, b) => {
      if (a.isWeak !== b.isWeak) return a.isWeak ? -1 : 1;
      if (a.score !== b.score) return a.score - b.score;
      return a.area.localeCompare(b.area);
    });
  return ordered.map((entry) => entry.area);
}

export { isLifeWheelArea };
export type { LifeWheelArea };
