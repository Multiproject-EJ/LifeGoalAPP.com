import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';

const DEMO_ZEN_GARDEN_KEY = 'lifegoal_demo_zen_garden_inventory';

function buildInventoryStorageKey(userId: string): string {
  return `${DEMO_ZEN_GARDEN_KEY}:${userId}`;
}

function readInventory(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(buildInventoryStorageKey(userId));
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInventory(userId: string, inventory: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(buildInventoryStorageKey(userId), JSON.stringify(inventory));
}

export async function fetchZenGardenInventory(userId: string): Promise<{
  data: string[];
  error: Error | null;
}> {
  try {
    return { data: readInventory(userId), error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to read Zen Garden inventory'),
    };
  }
}

export async function purchaseZenGardenItem(
  userId: string,
  itemId: string,
  cost: number
): Promise<{
  data: { balance: number; inventory: string[] } | null;
  error: Error | null;
}> {
  try {
    const { data: profile, error: profileError } = await fetchGamificationProfile(userId);
    if (profileError || !profile) {
      throw profileError ?? new Error('Missing gamification profile');
    }

    const currentBalance = profile.zen_tokens ?? 0;
    if (currentBalance < cost) {
      return { data: null, error: new Error('Not enough Zen Tokens.') };
    }

    const nextBalance = currentBalance - cost;
    if (!canUseSupabaseData()) {
      saveDemoProfile({ zen_tokens: nextBalance, updated_at: new Date().toISOString() });
    } else {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('gamification_profiles')
        .update({ zen_tokens: nextBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (updateError) throw updateError;
    }

    const inventory = readInventory(userId);
    const nextInventory = inventory.includes(itemId) ? inventory : [...inventory, itemId];
    writeInventory(userId, nextInventory);

    return { data: { balance: nextBalance, inventory: nextInventory }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to purchase Zen Garden item'),
    };
  }
}
