import type { PostgrestError } from '@supabase/supabase-js';
import { canUseSupabaseData, getSupabaseClient } from '../lib/supabaseClient';
import type { Database } from '../lib/database.types';

export type WorkspaceProfileRow = Database['public']['Tables']['workspace_profiles']['Row'];
export type WorkspaceProfileInsert = Database['public']['Tables']['workspace_profiles']['Insert'];

export type WorkspaceProfileResponse = {
  data: WorkspaceProfileRow | null;
  error: PostgrestError | null;
};

export async function fetchWorkspaceProfile(userId: string): Promise<WorkspaceProfileResponse> {
  if (!canUseSupabaseData()) {
    return { data: null, error: null };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('workspace_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<WorkspaceProfileRow>();

  return { data, error };
}

export async function upsertWorkspaceProfile(
  payload: WorkspaceProfileInsert,
): Promise<WorkspaceProfileResponse> {
  if (!canUseSupabaseData()) {
    throw new Error('Supabase is not connected.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('workspace_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single<WorkspaceProfileRow>();

  return { data, error };
}
