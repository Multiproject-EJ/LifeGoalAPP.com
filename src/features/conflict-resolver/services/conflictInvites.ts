import { getSupabaseClient } from '../../../lib/supabaseClient';

export type ConflictInviteStatus = 'pending' | 'redeemed' | 'revoked' | 'expired';

export type ConflictInvite = {
  id: string;
  session_id: string;
  email: string;
  role: 'participant' | 'observer';
  invite_token: string;
  status: ConflictInviteStatus;
  expires_at: string;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
  created_by_user_id: string;
  issued_domain: string | null;
  redeemed_domain: string | null;
  issued_surface: string | null;
  redeemed_surface: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

function getUntypedSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseClient() as any;
}

function createInviteToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

function getCurrentHostname() {
  if (typeof window === 'undefined') return null;
  return window.location.hostname || null;
}

function getCurrentSurfaceTag() {
  const hostname = getCurrentHostname();
  if (!hostname) return 'server';
  if (hostname === 'peacebetween.com' || hostname === 'www.peacebetween.com') return 'peacebetween_web';
  return 'lifegoal_app';
}

function getDefaultInviteBaseUrl() {
  const configured = import.meta.env.VITE_CONFLICT_INVITE_BASE_URL;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }
  return 'https://www.peacebetween.com';
}

export function buildConflictInviteUrl(token: string, baseUrl = getDefaultInviteBaseUrl()) {
  return `${baseUrl.replace(/\/+$/, '')}/conflict/join?token=${encodeURIComponent(token)}`;
}

export async function createConflictInvite(params: {
  sessionId: string;
  email: string;
  role?: 'participant' | 'observer';
  createdByUserId: string;
  expiresAt?: string;
}) {
  const inviteToken = createInviteToken();
  const { data, error } = await getUntypedSupabase()
    .from('conflict_invites')
    .insert({
      session_id: params.sessionId,
      email: params.email.trim().toLowerCase(),
      role: params.role ?? 'participant',
      invite_token: inviteToken,
      created_by_user_id: params.createdByUserId,
      expires_at: params.expiresAt ?? undefined,
      issued_domain: getCurrentHostname(),
      issued_surface: getCurrentSurfaceTag(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create conflict invite:', error);
    throw error;
  }

  return data as ConflictInvite;
}

export async function listConflictInvites(sessionId: string) {
  const { data, error } = await getUntypedSupabase()
    .from('conflict_invites')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to list conflict invites:', error);
    throw error;
  }

  return (data ?? []) as ConflictInvite[];
}

export async function redeemConflictInvite(params: { inviteToken: string; userId: string }) {
  const nowIso = new Date().toISOString();
  const { data, error } = await getUntypedSupabase()
    .from('conflict_invites')
    .update({
      status: 'redeemed',
      redeemed_at: nowIso,
      redeemed_by_user_id: params.userId,
      redeemed_domain: getCurrentHostname(),
      redeemed_surface: getCurrentSurfaceTag(),
    })
    .eq('invite_token', params.inviteToken)
    .eq('status', 'pending')
    .gt('expires_at', nowIso)
    .select('*')
    .single();

  if (error) {
    console.error('Failed to redeem conflict invite:', error);
    throw error;
  }

  return data as ConflictInvite;
}
