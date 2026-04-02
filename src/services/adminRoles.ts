import { getSupabaseClient } from '../lib/supabaseClient';

export type AdminUserRow = {
  user_id: string;
  role: 'owner' | 'admin';
  active: boolean;
  created_at: string;
};

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

export async function fetchAdminUser(userId: string): Promise<{ data: AdminUserRow | null; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return { data: (data as AdminUserRow | null) ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to load admin role.'),
    };
  }
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const { data } = await fetchAdminUser(userId);
  return Boolean(data?.active);
}

export async function listActiveAdminUsers(): Promise<{ data: AdminUserRow[]; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('admin_users')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data as AdminUserRow[]) ?? [], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to list active admin users.'),
    };
  }
}
