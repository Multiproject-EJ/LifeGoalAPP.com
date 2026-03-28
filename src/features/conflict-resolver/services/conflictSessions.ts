import { getSupabaseClient } from '../../../lib/supabaseClient';

type SessionConflictType = 'inner_tension' | 'shared_conflict';
type ParticipantRole = 'initiator' | 'participant' | 'observer';

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

export async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await getUntypedSupabase().auth.getUser();

  if (error) throw error;
  if (!user?.id) {
    throw new Error('You need to be signed in to start or join a shared conflict.');
  }

  return user.id as string;
}

export async function createConflictSession(params: { ownerUserId: string; conflictType: SessionConflictType }) {
  const { data, error } = await getUntypedSupabase()
    .from('conflict_sessions')
    .insert({
      owner_user_id: params.ownerUserId,
      conflict_type: params.conflictType,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function addConflictParticipant(params: {
  sessionId: string;
  userId: string;
  role: ParticipantRole;
  email?: string | null;
}) {
  const { data, error } = await getUntypedSupabase()
    .from('conflict_participants')
    .upsert(
      {
        session_id: params.sessionId,
        user_id: params.userId,
        role: params.role,
        email: params.email ?? null,
      },
      { onConflict: 'session_id,user_id' },
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function getConflictParticipantCount(sessionId: string) {
  const { count, error } = await getUntypedSupabase()
    .from('conflict_participants')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if (error) throw error;
  return count ?? 0;
}
