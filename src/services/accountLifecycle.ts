import { getSupabaseClient } from '../lib/supabaseClient';

export type AccountLifecycleAction = 'reset' | 'delete';

export type AccountLifecycleResult = {
  success: boolean;
  action: AccountLifecycleAction;
  deletedRows?: number;
  deletedTables?: number;
};

export async function runAccountLifecycleAction(
  action: AccountLifecycleAction,
): Promise<{ data: AccountLifecycleResult | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke<AccountLifecycleResult>('account-lifecycle', {
      body: { action },
    });

    if (error) {
      throw new Error(error.message || `Failed to ${action} account.`);
    }

    if (!data?.success) {
      throw new Error(`Account ${action} did not complete.`);
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(`Failed to ${action} account.`),
    };
  }
}
