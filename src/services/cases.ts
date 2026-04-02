import { getSupabaseClient } from '../lib/supabaseClient';

export type CaseType = 'feedback' | 'support';
export type CaseStatus = 'new' | 'triaged' | 'waiting_on_user' | 'resolved' | 'closed';

export type CaseThreadRow = {
  id: string;
  user_id: string;
  case_type: CaseType;
  category: string;
  subject: string;
  desired_outcome: string | null;
  status: CaseStatus;
  source_surface: string | null;
  source_route: string | null;
  is_demo: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type CaseMessageRow = {
  id: string;
  thread_id: string;
  author_user_id: string | null;
  author_role: 'user' | 'admin' | 'system';
  message_type: 'submission' | 'user_reply' | 'admin_reply' | 'internal_note' | 'status_change' | 'reply_draft';
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

export async function createCaseThread(input: {
  userId: string;
  caseType: CaseType;
  category: string;
  subject: string;
  body: string;
  desiredOutcome?: string;
  sourceSurface?: string;
  sourceRoute?: string;
  isDemo?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<{ data: CaseThreadRow | null; error: Error | null }> {
  try {
    const supabase = getUntypedSupabase();
    const { data: thread, error: threadError } = await supabase
      .from('case_threads')
      .insert({
        user_id: input.userId,
        case_type: input.caseType,
        category: input.category,
        subject: input.subject.trim(),
        desired_outcome: input.desiredOutcome?.trim() || null,
        source_surface: input.sourceSurface ?? null,
        source_route: input.sourceRoute ?? null,
        is_demo: input.isDemo === true,
        metadata: input.metadata ?? {},
      })
      .select('*')
      .single();

    if (threadError) throw threadError;

    const { error: messageError } = await supabase.from('case_messages').insert({
      thread_id: thread.id,
      author_user_id: input.userId,
      author_role: 'user',
      message_type: 'submission',
      body: input.body.trim(),
      metadata: {},
    });

    if (messageError) throw messageError;

    return { data: thread as CaseThreadRow, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to create submission.'),
    };
  }
}

export async function listMyCaseThreads(userId: string): Promise<{ data: CaseThreadRow[]; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('case_threads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as CaseThreadRow[]) ?? [], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to load submissions.'),
    };
  }
}

export async function listCaseMessages(threadId: string): Promise<{ data: CaseMessageRow[]; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('case_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: (data as CaseMessageRow[]) ?? [], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to load case messages.'),
    };
  }
}

export async function addUserCaseReply(input: {
  threadId: string;
  userId: string;
  body: string;
}): Promise<{ data: CaseMessageRow | null; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('case_messages')
      .insert({
        thread_id: input.threadId,
        author_user_id: input.userId,
        author_role: 'user',
        message_type: 'user_reply',
        body: input.body.trim(),
        metadata: {},
      })
      .select('*')
      .single();

    if (error) throw error;
    return { data: data as CaseMessageRow, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to send reply.'),
    };
  }
}
