import { getSupabaseClient } from '../lib/supabaseClient';

export type EggPackSkuId = 'egg_pack_small' | 'egg_pack_medium' | 'egg_pack_large';

export interface EggPackDefinition {
  skuId: EggPackSkuId;
  label: string;
  eggCount: number;
  priceLabel: string;
  description: string;
  tiers: { common: number; rare: number };
}

export const EGG_PACK_DEFINITIONS: EggPackDefinition[] = [
  {
    skuId: 'egg_pack_small',
    label: 'Clutch',
    eggCount: 3,
    priceLabel: '5 kr',
    description: 'A cozy nest of 3 freshly laid eggs.',
    tiers: { common: 3, rare: 0 },
  },
  {
    skuId: 'egg_pack_medium',
    label: 'Basket',
    eggCount: 15,
    priceLabel: '25 kr',
    description: '15 eggs with a chance of rare finds.',
    tiers: { common: 12, rare: 3 },
  },
  {
    skuId: 'egg_pack_large',
    label: 'Crate',
    eggCount: 25,
    priceLabel: '250 kr',
    description: '25 eggs — 6 guaranteed rare. Best value.',
    tiers: { common: 19, rare: 6 },
  },
];

export async function createEggPackCheckoutSession(
  skuId: EggPackSkuId,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke<{ url?: string }>(
      'create-checkout-session-egg-pack',
      { body: { sku_id: skuId } },
    );

    if (error) {
      throw new Error(error.message || 'Failed to start Egg Pack checkout.');
    }

    const url = data?.url;
    if (!url) {
      throw new Error('Egg Pack checkout did not return a checkout URL.');
    }

    return { url, error: null };
  } catch (error) {
    return {
      url: null,
      error: error instanceof Error ? error : new Error('Failed to start Egg Pack checkout.'),
    };
  }
}
