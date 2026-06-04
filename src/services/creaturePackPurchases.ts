import { getSupabaseClient } from '../lib/supabaseClient';

export const CREATURE_PACK_SKU_ID = 'creature_pack_5' as const;

export async function createCreaturePackCheckoutSession(): Promise<{ url: string | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke<{ url?: string }>('create-checkout-session-creature-pack', {
      body: { sku_id: CREATURE_PACK_SKU_ID },
    });

    if (error) {
      throw new Error(error.message || 'Failed to start Creature Pack checkout.');
    }

    const url = data?.url;
    if (!url) {
      throw new Error('Creature Pack checkout did not return a checkout URL.');
    }

    return { url, error: null };
  } catch (error) {
    return {
      url: null,
      error: error instanceof Error ? error : new Error('Failed to start Creature Pack checkout.'),
    };
  }
}
