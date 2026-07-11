import { getSupabaseClient } from '../lib/supabaseClient';
import { createGuardedCheckoutSession } from './guardedCheckout';

export type BillingCycle = 'monthly' | 'yearly';

export type BillingEntitlementRow = {
  user_id: string;
  is_pro: boolean;
  source: string | null;
  effective_to: string | null;
  updated_at: string;
};

export type BillingSubscriptionRow = {
  stripe_subscription_id: string;
  stripe_price_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
};

export type BillingCustomerRow = {
  stripe_customer_id: string;
};

export type UserWalletRow = {
  dice_rolls: number;
};

export type BillingSnapshot = {
  entitlement: BillingEntitlementRow | null;
  subscription: BillingSubscriptionRow | null;
  customer: BillingCustomerRow | null;
  wallet: UserWalletRow | null;
};

export async function fetchBillingSnapshot(userId: string): Promise<{ data: BillingSnapshot | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient();

    const [entitlementResult, subscriptionResult, customerResult, walletResult] = await Promise.all([
      supabase
        .from('billing_entitlements')
        .select('user_id, is_pro, source, effective_to, updated_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('billing_subscriptions')
        .select('stripe_subscription_id, stripe_price_id, status, current_period_end, cancel_at_period_end, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('billing_customers')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_wallets')
        .select('dice_rolls')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const firstError = entitlementResult.error || subscriptionResult.error || customerResult.error || walletResult.error;
    if (firstError) {
      throw firstError;
    }

    return {
      data: {
        entitlement: (entitlementResult.data as BillingEntitlementRow | null) ?? null,
        subscription: (subscriptionResult.data as BillingSubscriptionRow | null) ?? null,
        customer: (customerResult.data as BillingCustomerRow | null) ?? null,
        wallet: (walletResult.data as UserWalletRow | null) ?? null,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to load billing snapshot.'),
    };
  }
}

export async function createSubscriptionCheckoutSession(
  billingCycle: BillingCycle,
): Promise<{ url: string | null; error: Error | null }> {
  return createGuardedCheckoutSession({
    feature: 'subscriptions',
    functionName: 'create-checkout-session-subscription',
    body: { billing_cycle: billingCycle },
    missingUrlMessage: 'Subscription checkout did not return a checkout URL.',
  });
}

export async function createDicePackCheckoutSession(): Promise<{ url: string | null; error: Error | null }> {
  return createGuardedCheckoutSession({
    feature: 'purchases',
    functionName: 'create-checkout-session-payment',
    missingUrlMessage: 'Checkout did not return a checkout URL.',
  });
}

export async function createCustomerPortalSession(): Promise<{ url: string | null; error: Error | null }> {
  return createGuardedCheckoutSession({
    feature: 'subscriptions',
    functionName: 'create-customer-portal-session',
    missingUrlMessage: 'Billing portal did not return a URL.',
  });
}
