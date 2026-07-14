import { getSupabaseClient } from '../lib/supabaseClient';
import {
  getFeatureAvailability,
  getServiceHealthManager,
  guardedCloudCall,
} from './service-health';

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
  // Account ownership changes are a 'block' capability — they require the
  // real server and are never attempted while cloud services are degraded.
  const availability = getFeatureAvailability('account_ownership', getServiceHealthManager().getSnapshot());
  if (availability.status !== 'available') {
    return { data: null, error: new Error(availability.reason) };
  }

  const supabase = getSupabaseClient();
  const result = await guardedCloudCall(
    'edgeFunctions',
    async () => {
      const { data, error } = await supabase.functions.invoke<AccountLifecycleResult>('account-lifecycle', {
        body: { action },
      });
      if (error) throw error;
      return data;
    },
    { timeoutMs: 60_000 },
  );

  if (!result.ok) {
    return { data: null, error: new Error(result.error.explanation) };
  }
  if (!result.data?.success) {
    return { data: null, error: new Error(`Account ${action} did not complete.`) };
  }

  if (action === 'delete') {
    // Removing a Supabase Auth user does not itself erase the JWT cached by
    // this WebView. Clear the local session immediately after the server has
    // accepted the deletion so the deleted account cannot remain signed in.
    await supabase.auth.signOut({ scope: 'local' });
  }

  return { data: result.data, error: null };
}
