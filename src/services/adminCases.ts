import { getSupabaseClient } from '../lib/supabaseClient';
import type { CaseMessageRow, CaseStatus, CaseThreadRow } from './cases';

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

export async function listAllCaseThreads(): Promise<{ data: CaseThreadRow[]; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('case_threads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: (data as CaseThreadRow[]) ?? [], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to load admin cases.'),
    };
  }
}

export async function updateCaseStatus(input: {
  threadId: string;
  nextStatus: CaseStatus;
  adminUserId: string;
}): Promise<{ data: CaseThreadRow | null; error: Error | null }> {
  try {
    const supabase = getUntypedSupabase();

    const { data: before, error: beforeError } = await supabase
      .from('case_threads')
      .select('status')
      .eq('id', input.threadId)
      .single();

    if (beforeError) throw beforeError;

    const isClosing = input.nextStatus === 'resolved' || input.nextStatus === 'closed';
    const { data, error } = await supabase
      .from('case_threads')
      .update({
        status: input.nextStatus,
        closed_at: isClosing ? new Date().toISOString() : null,
      })
      .eq('id', input.threadId)
      .select('*')
      .single();

    if (error) throw error;

    const fromStatus = before?.status ?? null;
    const statusBody = fromStatus
      ? `Status changed from ${fromStatus} to ${input.nextStatus}.`
      : `Status changed to ${input.nextStatus}.`;

    const { error: messageError } = await supabase.from('case_messages').insert({
      thread_id: input.threadId,
      author_user_id: input.adminUserId,
      author_role: 'system',
      message_type: 'status_change',
      body: statusBody,
      metadata: {
        from_status: fromStatus,
        to_status: input.nextStatus,
      },
    });

    if (messageError) throw messageError;

    return { data: data as CaseThreadRow, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to update case status.'),
    };
  }
}

export async function addInternalNote(input: {
  threadId: string;
  adminUserId: string;
  body: string;
}): Promise<{ data: CaseMessageRow | null; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('case_messages')
      .insert({
        thread_id: input.threadId,
        author_user_id: input.adminUserId,
        author_role: 'admin',
        message_type: 'internal_note',
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
      error: error instanceof Error ? error : new Error('Failed to add internal note.'),
    };
  }
}

export async function saveReplyDraft(input: {
  threadId: string;
  adminUserId: string;
  body: string;
}): Promise<{ data: CaseMessageRow | null; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('case_messages')
      .insert({
        thread_id: input.threadId,
        author_user_id: input.adminUserId,
        author_role: 'admin',
        message_type: 'reply_draft',
        body: input.body.trim(),
        metadata: { manual_send_required: true },
      })
      .select('*')
      .single();

    if (error) throw error;
    return { data: data as CaseMessageRow, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to save reply draft.'),
    };
  }
}

export async function sendAdminReply(input: {
  threadId: string;
  adminUserId: string;
  body: string;
}): Promise<{ data: CaseMessageRow | null; error: Error | null }> {
  try {
    const { data, error } = await getUntypedSupabase()
      .from('case_messages')
      .insert({
        thread_id: input.threadId,
        author_user_id: input.adminUserId,
        author_role: 'admin',
        message_type: 'admin_reply',
        body: input.body.trim(),
        metadata: { channel: 'in_app' },
      })
      .select('*')
      .single();

    if (error) throw error;
    return { data: data as CaseMessageRow, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Failed to send admin reply.'),
    };
  }
}
