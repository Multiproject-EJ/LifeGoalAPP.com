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

export { buildRankProgressView, type RankProgressView } from './rankProgressView';

export {
  computePendingPromotion,
  loadAcknowledgedRankId,
  saveAcknowledgedRankId,
  type PendingPromotion,
} from './rankAcknowledgement';

export { RankBadge, type RankBadgeProps } from './components/RankBadge';
export { RankIdentityHeader, type RankIdentityHeaderProps } from './components/RankIdentityHeader';
export { RankJourneyModal, type RankJourneyModalProps } from './components/RankJourneyModal';
export {
  RankPromotionCelebration,
  type RankPromotionCelebrationProps,
} from './components/RankPromotionCelebration';
