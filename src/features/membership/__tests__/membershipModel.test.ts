/**
 * Membership tier domain tests. Pure logic only — no Supabase/React/env.
 * Run via `npm run test:membership`.
 */

import {
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
} from '../membershipModel';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} (expected ${String(expected)}, received ${String(actual)})`);
  }
}

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: 'tiers order Free < Member < Pro',
    run: () => {
      assertEqual(TIER_ORDER.length, 3, 'Expected three tiers');
      assert(tierRank('free') < tierRank('member'), 'Expected Free below Member');
      assert(tierRank('member') < tierRank('pro'), 'Expected Member below Pro');
    },
  },
  {
    name: 'tierAtLeast compares the privilege order',
    run: () => {
      assert(tierAtLeast('pro', 'member'), 'Pro should satisfy a Member requirement');
      assert(tierAtLeast('member', 'member'), 'Member should satisfy a Member requirement');
      assert(!tierAtLeast('free', 'member'), 'Free should not satisfy a Member requirement');
      assert(!tierAtLeast('member', 'pro'), 'Member should not satisfy a Pro requirement');
    },
  },
  {
    name: 'supporter = Member or Pro; pro features = Pro only',
    run: () => {
      assert(!isSupporter('free'), 'Free is not a supporter');
      assert(isSupporter('member'), 'Member is a supporter');
      assert(isSupporter('pro'), 'Pro is a supporter');
      assert(!canUseProFeatures('member'), 'Member does not get Pro features');
      assert(canUseProFeatures('pro'), 'Pro gets Pro features');
    },
  },
  {
    name: 'plan catalog covers Member + Pro for both cycles, plus founding Pro',
    run: () => {
      assert(!!getPlan('member_monthly'), 'Expected member_monthly plan');
      assert(!!getPlan('member_yearly'), 'Expected member_yearly plan');
      assert(!!getPlan('pro_monthly'), 'Expected pro_monthly plan');
      assert(!!getPlan('pro_yearly'), 'Expected pro_yearly plan');
      const founding = getPlan('pro_founding_monthly');
      assert(!!founding && founding.founding === true, 'Expected a founding Pro plan');
      assertEqual(getPlan('nope'), undefined, 'Unknown plan key returns undefined');
    },
  },
  {
    name: 'starting-hypothesis prices match the agreed figures',
    run: () => {
      assertEqual(getPlan('member_monthly')?.priceNok, 29, 'Member monthly = 29 NOK');
      assertEqual(getPlan('member_yearly')?.priceNok, 249, 'Member yearly = 249 NOK');
      assertEqual(getPlan('pro_monthly')?.priceNok, 89, 'Pro monthly = 89 NOK');
      assertEqual(getPlan('pro_yearly')?.priceNok, 749, 'Pro yearly = 749 NOK');
      assertEqual(getPlan('pro_founding_monthly')?.priceNok, 69, 'Founding Pro = 69 NOK');
    },
  },
  {
    name: 'standard plans for a tier exclude founding pricing',
    run: () => {
      const proStandard = getStandardPlansForTier('pro');
      assertEqual(proStandard.length, 2, 'Expected 2 standard Pro plans (monthly + yearly)');
      assert(proStandard.every((plan) => !plan.founding), 'Standard plans must not be founding');
      assertEqual(getStandardPlansForTier('member').length, 2, 'Expected 2 standard Member plans');
    },
  },
  {
    name: 'every plan names a distinct price env var',
    run: () => {
      const vars = requiredPriceEnvVars();
      assertEqual(vars.length, MEMBERSHIP_PLANS.length, 'One env var per plan');
      assertEqual(new Set(vars).size, vars.length, 'Env var names must be unique');
      assert(vars.every((name) => name.startsWith('STRIPE_PRICE_')), 'Env vars follow STRIPE_PRICE_ convention');
    },
  },
  {
    name: 'legacy is_pro maps to a tier for back-compat',
    run: () => {
      assertEqual(tierFromIsPro(true), 'pro', 'is_pro true → Pro');
      assertEqual(tierFromIsPro(false), 'free', 'is_pro false → Free');
    },
  },
  {
    name: 'tier maps to the correct membership badge (Free has none)',
    run: () => {
      assertEqual(membershipBadgeForTier('pro'), 'pro', 'Pro → pro badge');
      assertEqual(membershipBadgeForTier('member'), 'member', 'Member → member badge');
      assertEqual(membershipBadgeForTier('free'), null, 'Free → no badge');
    },
  },
  {
    name: 'webhook can reverse-map a Stripe price id to a tier',
    run: () => {
      const priceIdByEnvVar = {
        STRIPE_PRICE_MEMBER_MONTHLY: 'price_mem_m',
        STRIPE_PRICE_PRO_YEARLY: 'price_pro_y',
        STRIPE_PRICE_PRO_FOUNDING_MONTHLY: 'price_pro_found',
      };
      assertEqual(resolveTierFromPriceId('price_mem_m', priceIdByEnvVar), 'member', 'Member price → member');
      assertEqual(resolveTierFromPriceId('price_pro_y', priceIdByEnvVar), 'pro', 'Pro price → pro');
      assertEqual(resolveTierFromPriceId('price_pro_found', priceIdByEnvVar), 'pro', 'Founding Pro price → pro');
      assertEqual(resolveTierFromPriceId('unknown', priceIdByEnvVar), 'free', 'Unknown price → free');
      assertEqual(resolveTierFromPriceId(null, priceIdByEnvVar), 'free', 'No price → free');
    },
  },
  {
    name: 'gated power features require Pro',
    run: () => {
      assert(canAccessFeature('pro', 'ai-coach'), 'Pro can use AI coach');
      assert(canAccessFeature('pro', 'compass'), 'Pro can use Compass');
      assert(!canAccessFeature('member', 'compass'), 'Member cannot use Compass');
      assert(!canAccessFeature('free', 'advanced-planning'), 'Free cannot use advanced planning');
    },
  },
];

export function runAllMembershipTests(): void {
  let passed = 0;
  for (const test of tests) {
    test.run();
    passed += 1;
  }
  console.log(`membership-tests: ${passed}/${tests.length} assertions-suites passed`);
}
