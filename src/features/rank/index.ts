/**
 * Player rank domain — public surface.
 *
 * Pure, read-only rank derivation + badge asset registry. No state, no grants,
 * no UI. See docs/investigations/player-rank-system-integration.md.
 */

export {
  RANKS,
  MIN_RANK,
  MAX_RANK,
  getRankById,
  rankForLevel,
  nextRankForLevel,
  isMaxRank,
  progressToNextRank,
  type RankDefinition,
  type RankTier,
  type RankInsignia,
  type RankProgress,
} from './rankModel';

export {
  rankBadgeSrc,
  rankBadgeAlt,
  membershipBadgeSrc,
  membershipBadgeLabel,
  membershipBadgeAlt,
  everyRankHasBadge,
  type MembershipBadge,
} from './rankAssets';
