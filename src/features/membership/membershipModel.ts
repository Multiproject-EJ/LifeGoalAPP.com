/**
 * Membership tier domain model — pure, read-only.
 *
 * Defines the Free / Member / Pro tier system, the purchasable plan catalog,
 * and the entitlement helpers used to gate features. This module performs NO
 * network calls, reads NO env, and changes NO live behaviour — it is the shared
 * vocabulary that the checkout edge function, the Stripe webhook, the billing
 * client, and the paywall UI all key off.
 *
 * Product model (decided 2026-06-22):
 * - Member = supporter tier: supporter status + Member badge + game
 *   rewards/cosmetics + community. A paid tier, but NOT a higher gameplay rank.
 * - Pro = power tier: everything Member has, PLUS the gated power features
 *   (AI coach, Compass, advanced planning).
 *
 * Rank vs membership: membership is account/entitlement status and is kept
 * deliberately separate from earned player rank (see the rank domain + the
 * player-rank-system-integration investigation §11).
 *
 * Pricing is a STARTING HYPOTHESIS, not a permanent truth — to be revised from
 * real conversion/retention data. Founding Pro pricing is protected for early
 * supporters via a separate price.
 */

import type { MembershipBadge } from '../rank/rankAssets';

export type MembershipTier = 'free' | 'member' | 'pro';

/** Ascending privilege order. Index acts as the tier's rank. */
export const TIER_ORDER: readonly MembershipTier[] = ['free', 'member', 'pro'] as const;

export function tierRank(tier: MembershipTier): number {
  const index = TIER_ORDER.indexOf(tier);
  return index < 0 ? 0 : index;
}

/** True when `tier` is at least `minimum` in the privilege order. */
export function tierAtLeast(tier: MembershipTier, minimum: MembershipTier): boolean {
  return tierRank(tier) >= tierRank(minimum);
}

/** A paying supporter (Member or Pro). */
export function isSupporter(tier: MembershipTier): boolean {
  return tierAtLeast(tier, 'member');
}

/** Has the Pro power features. */
export function canUseProFeatures(tier: MembershipTier): boolean {
  return tierAtLeast(tier, 'pro');
}

export type BillingCycle = 'monthly' | 'yearly';

/** Tiers that can actually be purchased (Free is the absence of a plan). */
export type PaidTier = Exclude<MembershipTier, 'free'>;

export interface MembershipPlan {
  /** Stable plan key used across checkout, webhook, and UI. */
  key: string;
  tier: PaidTier;
  cycle: BillingCycle;
  /** Display price in NOK (whole kroner). Starting hypothesis. */
  priceNok: number;
  /**
   * Name of the server-side env var holding this plan's Stripe Price ID. The
   * edge function and webhook read the actual ID from env; the model only names
   * the slot so nothing secret lives in code.
   */
  priceEnvVar: string;
  /** Protected early-supporter pricing, not shown as the standard price. */
  founding?: boolean;
  /** Short human label for the plan picker. */
  label: string;
}

/**
 * Purchasable plans. Stripe Price IDs are supplied via the named env vars
 * (placeholders until products are created in the Stripe dashboard) — nothing
 * can be charged until those are configured.
 */
export const MEMBERSHIP_PLANS: readonly MembershipPlan[] = [
  {
    key: 'member_monthly',
    tier: 'member',
    cycle: 'monthly',
    priceNok: 29,
    priceEnvVar: 'STRIPE_PRICE_MEMBER_MONTHLY',
    label: 'Member · Monthly',
  },
  {
    key: 'member_yearly',
    tier: 'member',
    cycle: 'yearly',
    priceNok: 249,
    priceEnvVar: 'STRIPE_PRICE_MEMBER_YEARLY',
    label: 'Member · Yearly',
  },
  {
    key: 'pro_monthly',
    tier: 'pro',
    cycle: 'monthly',
    priceNok: 89,
    priceEnvVar: 'STRIPE_PRICE_PRO_MONTHLY',
    label: 'Pro · Monthly',
  },
  {
    key: 'pro_yearly',
    tier: 'pro',
    cycle: 'yearly',
    priceNok: 749,
    priceEnvVar: 'STRIPE_PRICE_PRO_YEARLY',
    label: 'Pro · Yearly',
  },
  {
    key: 'pro_founding_monthly',
    tier: 'pro',
    cycle: 'monthly',
    priceNok: 69,
    priceEnvVar: 'STRIPE_PRICE_PRO_FOUNDING_MONTHLY',
    founding: true,
    label: 'Pro · Founding (Monthly)',
  },
] as const;

export function getPlan(key: string): MembershipPlan | undefined {
  return MEMBERSHIP_PLANS.find((plan) => plan.key === key);
}

/** Standard (non-founding) plans for a tier. */
export function getStandardPlansForTier(tier: PaidTier): MembershipPlan[] {
  return MEMBERSHIP_PLANS.filter((plan) => plan.tier === tier && !plan.founding);
}

/** All env var names that must hold a Stripe Price ID for full coverage. */
export function requiredPriceEnvVars(): string[] {
  return MEMBERSHIP_PLANS.map((plan) => plan.priceEnvVar);
}

/**
 * Back-compat bridge: the legacy entitlement is a boolean `is_pro`. Until the
 * webhook writes an explicit tier, derive a tier from that flag.
 */
export function tierFromIsPro(isPro: boolean): MembershipTier {
  return isPro ? 'pro' : 'free';
}

/** The membership badge for a tier, or null for Free (no badge). */
export function membershipBadgeForTier(tier: MembershipTier): MembershipBadge | null {
  if (tier === 'pro') return 'pro';
  if (tier === 'member') return 'member';
  return null;
}

/**
 * Reverse-map a subscribed Stripe Price ID to a tier — for the webhook. Callers
 * pass the runtime map of `{ [priceEnvVar]: priceIdValue }` resolved from env;
 * we match it back to a plan and return its tier (or 'free' if unrecognized).
 */
export function resolveTierFromPriceId(
  priceId: string | null | undefined,
  priceIdByEnvVar: Readonly<Record<string, string | undefined>>,
): MembershipTier {
  if (!priceId) return 'free';
  for (const plan of MEMBERSHIP_PLANS) {
    if (priceIdByEnvVar[plan.priceEnvVar] === priceId) {
      return plan.tier;
    }
  }
  return 'free';
}

/** Power features gated to Pro under the chosen "Member=supporter, Pro=power" split. */
export type GatedFeature = 'ai-coach' | 'compass' | 'advanced-planning';

export function canAccessFeature(tier: MembershipTier, _feature: GatedFeature): boolean {
  // All currently gated features are Pro-only; Member's value is supporter
  // perks (badge, rewards, community), not hard feature gates.
  return canUseProFeatures(tier);
}
