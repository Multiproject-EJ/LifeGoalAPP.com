import { createGuardedCheckoutSession } from './guardedCheckout';

export const CREATURE_PACK_SKU_ID = 'creature_pack_5' as const;

export async function createCreaturePackCheckoutSession(): Promise<{ url: string | null; error: Error | null }> {
  return createGuardedCheckoutSession({
    feature: 'purchases',
    functionName: 'create-checkout-session-creature-pack',
    body: { sku_id: CREATURE_PACK_SKU_ID },
    missingUrlMessage: 'Creature Pack checkout did not return a checkout URL.',
  });
}
