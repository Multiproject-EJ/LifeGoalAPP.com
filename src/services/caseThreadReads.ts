import { getSupabaseClient } from '../lib/supabaseClient';

export type CaseThreadReadRole = 'user' | 'admin';

export type CaseThreadReadRow = {
  thread_id: string;
  user_id: string;
  viewer_role: CaseThreadReadRole;
  last_read_at: string;
  created_at: string;
  updated_at: string;
};

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

export async function listMyCaseThreadReads(input: {
  userId: string;
  role: CaseThreadReadRole;
}): Promise<{ data: CaseThreadReadRow[]; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('case_thread_reads')
      .select('*')
      .eq('user_id', input.userId)
      .eq('viewer_role', input.role);

    if (error) throw error;
    return { data: (data as CaseThreadReadRow[]) ?? [], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to load case read states.'),
    };
  }
}

export async function markCaseThreadRead(input: {
  threadId: string;
  userId: string;
  role: CaseThreadReadRole;
  readAt?: string;
}): Promise<{ data: CaseThreadReadRow | null; error: Error | null }> {
  try {
    const readAt = input.readAt ?? new Date().toISOString();
    const { data, error } = await getUntypedSupabase()
      .from('case_thread_reads')
      .upsert({
        thread_id: input.threadId,
        user_id: input.userId,
        viewer_role: input.role,
        last_read_at: readAt,
      }, {
        onConflict: 'thread_id,user_id,viewer_role',
      })
      .select('*')
      .single();

    if (error) throw error;
    return { data: data as CaseThreadReadRow, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to mark thread as read.'),
    };
  }
}
