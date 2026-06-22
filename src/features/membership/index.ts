/**
 * Membership tier domain — public surface.
 *
 * Pure Free/Member/Pro tier model + plan catalog + entitlement helpers. No
 * network, no env, no live behaviour. See the player-rank-system-integration
 * investigation §11 for the rank-vs-membership separation.
 */

export {
  TIER_ORDER,
  tierRank,
  tierAtLeast,
  isSupporter,
  canUseProFeatures,
  MEMBERSHIP_PLANS,
  getPlan,
  getStandardPlansForTier,
  requiredPriceEnvVars,
  tierFromIsPro,
  membershipBadgeForTier,
  resolveTierFromPriceId,
  canAccessFeature,
  type MembershipTier,
  type PaidTier,
  type BillingCycle,
  type MembershipPlan,
  type GatedFeature,
} from './membershipModel';
