import { getSupabaseClient } from '../lib/supabaseClient';

export type AdminAlert = {
  id: string;
  alert_type: 'user_signup' | 'purchase_completed' | 'subscription_changed' | 'support_message' | 'telemetry_report_ready';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  summary: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
  read_at: string | null;
};

function client() { return getSupabaseClient() as any; } // eslint-disable-line @typescript-eslint/no-explicit-any

export async function listAdminAlerts(limit = 30): Promise<{ data: AdminAlert[]; error: Error | null }> {
  try {
    const { data, error } = await client().from('admin_alerts').select('id, alert_type, severity, title, summary, resource_type, resource_id, created_at, read_at').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return { data: (data as AdminAlert[]) ?? [], error: null };
  } catch (error) { return { data: [], error: error instanceof Error ? error : new Error('Failed to load admin alerts.') }; }
}

export async function markAdminAlertRead(id: string): Promise<Error | null> {
  try {
    const { error } = await client().from('admin_alerts').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return null;
  } catch (error) { return error instanceof Error ? error : new Error('Failed to mark alert read.'); }
}

/** Live updates are RLS-filtered by Supabase Realtime for the signed-in admin. */
export function subscribeToAdminAlerts(onAlert: () => void): () => void {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel('admin-operations-alerts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_alerts' }, onAlert)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
