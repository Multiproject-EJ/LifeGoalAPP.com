import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import { fetchGamificationProfile, saveDemoProfile } from './gamificationPrefs';
import type { ZenTokenTransaction } from '../types/gamification';
import { recordTelemetryEvent } from './telemetry';

const DEMO_ZEN_GARDEN_KEY = 'lifegoal_demo_zen_garden_inventory';
const DEMO_ZEN_TOKEN_TRANSACTIONS_KEY = 'lifegoal_demo_zen_token_transactions';

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

function buildTransactionStorageKey(userId: string): string {
  return `${DEMO_ZEN_TOKEN_TRANSACTIONS_KEY}:${userId}`;
}

function readTransactions(userId: string): ZenTokenTransaction[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(buildTransactionStorageKey(userId));
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as ZenTokenTransaction[]) : [];
  } catch {
    return [];
  }
}

function writeTransactions(userId: string, transactions: ZenTokenTransaction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(buildTransactionStorageKey(userId), JSON.stringify(transactions));
}

function buildTransactionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `zen_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function logZenTokenTransaction(userId: string, transaction: Omit<ZenTokenTransaction, 'id'>): void {
  const existing = readTransactions(userId);
  const nextTransaction: ZenTokenTransaction = {
    ...transaction,
    id: buildTransactionId(),
  };
  writeTransactions(userId, [nextTransaction, ...existing]);
}

export async function awardZenTokens(
  userId: string,
  amount: number,
  sourceType: string,
  sourceId?: string,
  description?: string
): Promise<{ data: { balance: number } | null; error: Error | null }> {
  try {
    if (amount <= 0) {
      return { data: null, error: new Error('Zen Token amount must be greater than zero.') };
    }

    const { data: profile, error: profileError } = await fetchGamificationProfile(userId);
    if (profileError || !profile) {
      throw profileError ?? new Error('Missing gamification profile');
    }

    const currentBalance = profile.zen_tokens ?? 0;
    const nextBalance = currentBalance + amount;

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

    logZenTokenTransaction(userId, {
      user_id: userId,
      token_amount: amount,
      action: 'earn',
      source_type: sourceType,
      source_id: sourceId ?? null,
      description: description ?? 'Meditation reward',
      created_at: new Date().toISOString(),
    });

    void recordTelemetryEvent({
      userId,
      eventType: 'economy_earn',
      metadata: {
        currency: 'zen_tokens',
        amount,
        balance: nextBalance,
        sourceType,
        sourceId: sourceId ?? null,
        description: description ?? 'Meditation reward',
      },
    });

    return { data: { balance: nextBalance }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to award Zen Tokens'),
    };
  }
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

export async function fetchZenTokenTransactions(
  userId: string,
  limit = 6
): Promise<{ data: ZenTokenTransaction[]; error: Error | null }> {
  try {
    const transactions = readTransactions(userId);
    return { data: transactions.slice(0, limit), error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to load Zen Token activity'),
    };
  }
}

export async function purchaseZenGardenItem(
  userId: string,
  itemId: string,
  itemName: string,
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

    logZenTokenTransaction(userId, {
      user_id: userId,
      token_amount: cost,
      action: 'spend',
      source_type: 'zen_garden',
      source_id: itemId,
      description: `Unlocked ${itemName}`,
      created_at: new Date().toISOString(),
    });

    void recordTelemetryEvent({
      userId,
      eventType: 'economy_spend',
      metadata: {
        currency: 'zen_tokens',
        amount: cost,
        balance: nextBalance,
        sourceType: 'zen_garden',
        sourceId: itemId,
        itemName,
      },
    });

    return { data: { balance: nextBalance, inventory: nextInventory }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to purchase Zen Garden item'),
    };
  }
}
