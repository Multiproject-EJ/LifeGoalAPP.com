/**
 * Shared Stripe-checkout gateway (service resilience adoption).
 *
 * Every purchase/subscription entry point funnels through here so that:
 *   - availability is decided by the capability matrix ('purchases' /
 *     'subscriptions' pause during outages) — never by per-screen checks,
 *   - the edge-function invoke goes through guardedCloudCall (circuit
 *     breaker + health reporting),
 *   - callers only ever receive translated, user-safe error text — raw
 *     provider messages never reach checkout UI.
 */

import { getSupabaseClient } from '../lib/supabaseClient';
import {
  getFeatureAvailability,
  getServiceHealthManager,
  guardedCloudCall,
} from './service-health';

export type CheckoutSessionResult = { url: string | null; error: Error | null };

export type CheckoutFeatureId = 'purchases' | 'subscriptions';

export async function createGuardedCheckoutSession(options: {
  feature: CheckoutFeatureId;
  functionName: string;
  body?: Record<string, unknown>;
  /** Shown if the function succeeds but returns no URL. */
  missingUrlMessage: string;
}): Promise<CheckoutSessionResult> {
  const snapshot = getServiceHealthManager().getSnapshot();
  const availability = getFeatureAvailability(options.feature, snapshot);
  if (availability.status !== 'available') {
    return { url: null, error: new Error(availability.reason) };
  }

  const result = await guardedCloudCall('edgeFunctions', async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke<{ url?: string }>(
      options.functionName,
      { body: options.body ?? {} },
    );
    if (error) throw error;
    return data?.url ?? null;
  });

  if (!result.ok) {
    return { url: null, error: new Error(result.error.explanation) };
  }
  if (!result.data) {
    return { url: null, error: new Error(options.missingUrlMessage) };
  }
  return { url: result.data, error: null };
}
