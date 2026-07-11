import { getSupabaseClient } from '../lib/supabaseClient';
import type { Theme, ThemeCheckoutSkuId } from '../contexts/ThemeContext';
import { createGuardedCheckoutSession } from './guardedCheckout';

export type ThemeCheckoutVariant = 'base' | 'paired';

export type ThemeCheckoutResult = {
  url: string | null;
  error: Error | null;
};

export type ThemeEntitlementRow = {
  cosmetic_id: Theme;
  source: string;
  source_ref: string | null;
  granted_at: string;
};

export async function fetchOwnedThemeIds(userId: string): Promise<{ themeIds: Set<Theme>; error: Error | null }> {
  try {
    const supabase = getSupabaseClient() as any;
    const { data, error } = await supabase
      .from('user_cosmetic_entitlements')
      .select('cosmetic_id, source, source_ref, granted_at')
      .eq('user_id', userId)
      .eq('cosmetic_type', 'theme');

    if (error) {
      throw new Error(error.message || 'Failed to load theme entitlements.');
    }

    return {
      themeIds: new Set(((data ?? []) as ThemeEntitlementRow[]).map(row => row.cosmetic_id)),
      error: null,
    };
  } catch (error) {
    return {
      themeIds: new Set(),
      error: error instanceof Error ? error : new Error('Failed to load theme entitlements.'),
    };
  }
}

export async function initiateThemeCheckout(options: {
  themeId: Theme;
  skuId: ThemeCheckoutSkuId;
  variant?: ThemeCheckoutVariant;
}): Promise<ThemeCheckoutResult> {
  return createGuardedCheckoutSession({
    feature: 'purchases',
    functionName: 'create-checkout-session-theme',
    body: {
      theme_id: options.themeId,
      sku_id: options.skuId,
      variant: options.variant ?? 'base',
    },
    missingUrlMessage: 'Theme checkout did not return a checkout URL.',
  });
}
