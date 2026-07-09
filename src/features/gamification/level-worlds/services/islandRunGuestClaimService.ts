import type { Session } from '@supabase/supabase-js';
import type { WorkspaceProfileRow } from '../../../../services/workspaceProfile';
import { fetchWorkspaceProfile, upsertWorkspaceProfile } from '../../../../services/workspaceProfile';
import {
  patchIslandRunGuestFunnelState,
  readIslandRunGuestFunnelState,
  type IslandRunGuestFunnelStateV1,
} from './islandRunGuestFunnelState';

export type IslandRunGuestClaimResult =
  | { status: 'skipped'; reason: 'no_session' | 'not_anonymous' | 'no_pending_claim' | 'already_claimed' }
  | { status: 'claimed'; userId: string; savedDisplayName: boolean; savedShipName: boolean; path: 'anonymous_upgrade_in_place' };

export function isAnonymousSupabaseUser(session: Pick<Session, 'user'> | null | undefined): boolean {
  return Boolean((session?.user as { is_anonymous?: boolean } | undefined)?.is_anonymous === true);
}

function clean(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

export function buildGuestClaimProfilePatch(input: {
  userId: string;
  guestState: IslandRunGuestFunnelStateV1;
  existingProfile: WorkspaceProfileRow | null;
}): { payload: { user_id: string; full_name?: string | null; display_name?: string | null; workspace_name?: string | null }; savedDisplayName: boolean; savedShipName: boolean } {
  const displayName = clean(input.guestState.displayName);
  const shipName = clean(input.guestState.shipName);
  const existingFullName = clean(input.existingProfile?.full_name);
  const existingDisplayName = clean(input.existingProfile?.display_name);
  const existingWorkspaceName = clean(input.existingProfile?.workspace_name);
  const payload: { user_id: string; full_name?: string | null; display_name?: string | null; workspace_name?: string | null } = {
    user_id: input.userId,
  };

  let savedDisplayName = false;
  let savedShipName = false;

  if (displayName && !existingFullName) {
    payload.full_name = displayName;
    savedDisplayName = true;
  }
  if (displayName && !existingDisplayName) {
    payload.display_name = displayName;
  }
  if (shipName && !existingWorkspaceName) {
    payload.workspace_name = shipName;
    savedShipName = true;
  }

  return { payload, savedDisplayName, savedShipName };
}

export async function claimAnonymousIslandRunGuestInPlace(options: {
  session: Session | null;
  storage?: Storage | null;
  now?: number;
}): Promise<IslandRunGuestClaimResult> {
  const { session } = options;
  if (!session) return { status: 'skipped', reason: 'no_session' };
  if (!isAnonymousSupabaseUser(session)) return { status: 'skipped', reason: 'not_anonymous' };

  const guestState = readIslandRunGuestFunnelState({ storage: options.storage, now: options.now });
  if (guestState.claimStatus === 'claimed' && guestState.claimedUserId === session.user.id) {
    return { status: 'skipped', reason: 'already_claimed' };
  }
  if (guestState.claimStatus !== 'claim_pending' && guestState.claimStatus !== 'claiming' && guestState.claimStatus !== 'claim_failed') {
    return { status: 'skipped', reason: 'no_pending_claim' };
  }

  patchIslandRunGuestFunnelState({ claimStatus: 'claiming' }, { storage: options.storage, now: options.now });

  try {
    // Current auth path upgrades the Supabase anonymous user in place via auth.updateUser.
    // Island Run runtime and narrative rows are already keyed by this same user id, so
    // claiming must not copy or re-grant gameplay rewards here.
    const existingProfile = (await fetchWorkspaceProfile(session.user.id)).data;
    const { payload, savedDisplayName, savedShipName } = buildGuestClaimProfilePatch({
      userId: session.user.id,
      guestState,
      existingProfile,
    });

    if (Object.keys(payload).length > 1) {
      const { error } = await upsertWorkspaceProfile({
        ...(existingProfile ?? {}),
        ...payload,
      });
      if (error) throw error;
    }

    patchIslandRunGuestFunnelState({
      claimStatus: 'claimed',
      claimedUserId: session.user.id,
    }, { storage: options.storage, now: options.now });

    return { status: 'claimed', userId: session.user.id, savedDisplayName, savedShipName, path: 'anonymous_upgrade_in_place' };
  } catch (error) {
    patchIslandRunGuestFunnelState({ claimStatus: 'claim_failed' }, { storage: options.storage, now: options.now });
    throw error;
  }
}
