/**
 * V2 rank candidate, deliberately NOT activated in App yet.
 *
 * Stage I retains every current family XP/age anchor. II/III divide the next
 * family band in thirds. XP (not rounded player level) resolves these stages.
 * The two stages beyond today's ceiling need an explicit pacing decision;
 * null means unscheduled, never free, Infinity or an invented requirement.
 */
import { RANKS, isRankServiceEligible, type RankDefinition } from './rankModel';
import { cumulativeXpForLevel, levelForXp } from '../gamification/level-worlds/services/combinedJourneyLevel';

export type ExpandedRankStage = 1 | 2 | 3;
// Deliberately incompatible with V1 RankDefinition: passing a V2 ordinal to
// the legacy badge/acknowledgement APIs would silently select another family.
export interface ExpandedRankDefinition extends Omit<RankDefinition, 'id' | 'minLevel'> {
  systemVersion: 2;
  ordinal: number;
  journeyLevelAtThreshold: number | null;
  familyId: number;
  familyKey: string;
  stage: ExpandedRankStage;
  minJourneyXp: number | null;
  thresholdStatus: 'existing-anchor' | 'proposed-subdivision' | 'proposed-endgame' | 'unresolved';
}

export function buildExpandedRankLadder(
  endgameStageXp?: readonly [number, number],
): readonly ExpandedRankDefinition[] {
  const ceiling = cumulativeXpForLevel(RANKS[RANKS.length - 1].minLevel);
  if (endgameStageXp && (!endgameStageXp.every(Number.isSafeInteger)
    || endgameStageXp[0] <= ceiling || endgameStageXp[1] <= endgameStageXp[0])) {
    throw new RangeError('Sky Marshal II/III require two increasing safe integer XP thresholds above the existing ceiling');
  }
  const labels = ['I', 'II', 'III'] as const;
  return Object.freeze(RANKS.flatMap((family, familyIndex) => {
    const start = cumulativeXpForLevel(family.minLevel);
    const next = RANKS[familyIndex + 1];
    const end = next ? cumulativeXpForLevel(next.minLevel) : null;
    return labels.map((label, index): ExpandedRankDefinition => {
      const stage = (index + 1) as ExpandedRankStage;
      const xp = index === 0 ? start
        : end !== null ? start + Math.ceil((end - start) * index / 3)
          : endgameStageXp?.[index - 1] ?? null;
      return Object.freeze({
        systemVersion: 2,
        ordinal: familyIndex * 3 + stage,
        key: `${family.key}-${stage}`,
        title: `${family.title} ${label}`,
        tier: family.tier,
        insignia: family.insignia,
        stars: family.stars,
        minServiceYears: family.minServiceYears,
        description: family.description,
        familyId: family.id,
        familyKey: family.key,
        stage,
        minJourneyXp: xp,
        // Informational level only. Multiple sub-ranks can share one level.
        journeyLevelAtThreshold: xp === null ? null : levelForXp(xp),
        thresholdStatus: index === 0 ? 'existing-anchor'
          : end !== null ? 'proposed-subdivision'
            : xp === null ? 'unresolved' : 'proposed-endgame',
      });
    });
  }));
}

export const EXPANDED_RANK_CANDIDATES = buildExpandedRankLadder();

/** Preview resolver; callers must supply account age explicitly, including guests. */
export function expandedRankForJourney(params: {
  xp: number;
  accountCreatedAt: string | null;
  nowMs?: number;
  endgameStageXp?: readonly [number, number];
}): ExpandedRankDefinition {
  const ladder = params.endgameStageXp
    ? buildExpandedRankLadder(params.endgameStageXp) : EXPANDED_RANK_CANDIDATES;
  const xp = Number.isFinite(params.xp) ? Math.max(0, Math.floor(params.xp)) : 0;
  let current = ladder[0];
  for (const rank of ladder) {
    if (rank.minJourneyXp === null || rank.minJourneyXp > xp
      || !isRankServiceEligible(RANKS[rank.familyId - 1], params.accountCreatedAt, params.nowMs)) break;
    current = rank;
  }
  return current;
}

/** Pure mapping only: V1 storage must not be interpreted as V2 ordinals. */
export function expandedAnchorForLegacyRankId(id: number): ExpandedRankDefinition | undefined {
  if (!Number.isInteger(id)) return undefined;
  return EXPANDED_RANK_CANDIDATES.find(rank => rank.familyId === id && rank.stage === 1);
}
