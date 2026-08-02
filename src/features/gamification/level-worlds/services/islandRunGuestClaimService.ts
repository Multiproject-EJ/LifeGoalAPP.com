import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseAuthUserId } from '../../../../lib/supabaseClient';
import { createDemoSession, isDemoSession } from '../../../../services/demoSession';
import type { WorkspaceProfileRow } from '../../../../services/workspaceProfile';
import { fetchWorkspaceProfile, upsertWorkspaceProfile } from '../../../../services/workspaceProfile';
import {
  hydrateIslandRunGameStateRecordWithSource,
  readIslandRunGameStateRecord,
  type IslandRunGameStateHydrationSource,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import { commitIslandRunState } from './islandRunStateStore';
import {
  patchIslandRunGuestFunnelState,
  readIslandRunGuestFunnelState,
  type IslandRunGuestFunnelStateV1,
} from './islandRunGuestFunnelState';

export const ISLAND_RUN_REGISTRY_BONUS_USCT = 100;

export type IslandRunGuestClaimSource = 'arena' | 'exit' | 'island_1_completion';

export type IslandRunGuestClaimResult =
  | { status: 'skipped'; reason: 'no_session' | 'not_permanent' | 'no_pending_claim' }
  | { status: 'already_claimed'; userId: string }
  | {
      status: 'claimed';
      userId: string;
      savedDisplayName: boolean;
      savedShipName: boolean;
      registryBonusUsct: number;
      path: 'local_guest_import';
      verifiedRemote: true;
    }
  | { status: 'conflict'; reason: 'existing_account_progress'; userId: string };

type RuntimeHydrationResult = {
  record: IslandRunGameStateRecord;
  source: IslandRunGameStateHydrationSource;
};

export interface IslandRunGuestClaimDependencies {
  readGuestRuntime: () => IslandRunGameStateRecord;
  hydrateTargetRuntime: (options: {
    session: Session;
    client: SupabaseClient;
    forceRemote: true;
  }) => Promise<RuntimeHydrationResult>;
  commitTargetRuntime: (options: {
    session: Session;
    client: SupabaseClient;
    record: IslandRunGameStateRecord;
    triggerSource: string;
  }) => Promise<{ ok: true } | { ok: false; errorMessage: string }>;
  fetchProfile: (userId: string) => Promise<{ data: WorkspaceProfileRow | null; error: unknown }>;
  upsertProfile: (payload: Record<string, unknown>) => Promise<{ data: WorkspaceProfileRow | null; error: unknown }>;
}

const productionDependencies: IslandRunGuestClaimDependencies = {
  readGuestRuntime: () => readIslandRunGameStateRecord(createDemoSession()),
  hydrateTargetRuntime: ({ session, client, forceRemote }) =>
    hydrateIslandRunGameStateRecordWithSource({ session, client, forceRemote }),
  commitTargetRuntime: ({ session, client, record, triggerSource }) =>
    commitIslandRunState({ session, client, record, triggerSource }),
  fetchProfile: fetchWorkspaceProfile,
  upsertProfile: (payload) => upsertWorkspaceProfile(payload as never),
};

export function isPermanentSupabaseUser(session: Pick<Session, 'user'> | null | undefined): boolean {
  if (!session || isDemoSession(session as Session)) return false;
  return isSupabaseAuthUserId(session.user.id)
    && (session.user as { is_anonymous?: boolean }).is_anonymous !== true;
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

/**
 * Build the first server snapshot for a local-only guest. Runtime version starts
 * at zero because the commit RPC requires expected_version=0 when the target
 * account has no row. The registry reward is folded into this one snapshot, so
 * retries cannot grant it twice.
 */
export function buildLocalGuestRuntimeClaimRecord(
  guestRecord: IslandRunGameStateRecord,
): IslandRunGameStateRecord {
  return {
    ...guestRecord,
    runtimeVersion: 0,
    essence: guestRecord.essence + ISLAND_RUN_REGISTRY_BONUS_USCT,
    essenceLifetimeEarned: guestRecord.essenceLifetimeEarned + ISLAND_RUN_REGISTRY_BONUS_USCT,
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

export function runtimeClaimFingerprint(record: IslandRunGameStateRecord): string {
  const { runtimeVersion: _runtimeVersion, ...durableState } = record;
  return JSON.stringify(stableValue(durableState));
}

export function hasVerifiedClaimedRuntime(
  remoteRecord: IslandRunGameStateRecord,
  expectedClaimRecord: IslandRunGameStateRecord,
): boolean {
  return runtimeClaimFingerprint(remoteRecord) === runtimeClaimFingerprint(expectedClaimRecord);
}

async function saveGuestIdentity(options: {
  userId: string;
  guestState: IslandRunGuestFunnelStateV1;
  dependencies: IslandRunGuestClaimDependencies;
}): Promise<{ savedDisplayName: boolean; savedShipName: boolean }> {
  const profileResult = await options.dependencies.fetchProfile(options.userId);
  if (profileResult.error) throw profileResult.error;
  const profilePatch = buildGuestClaimProfilePatch({
    userId: options.userId,
    guestState: options.guestState,
    existingProfile: profileResult.data,
  });

  if (Object.keys(profilePatch.payload).length > 1) {
    const profileWrite = await options.dependencies.upsertProfile({
      ...(profileResult.data ?? {}),
      ...profilePatch.payload,
    });
    if (profileWrite.error) throw profileWrite.error;
  }

  return {
    savedDisplayName: profilePatch.savedDisplayName,
    savedShipName: profilePatch.savedShipName,
  };
}

/**
 * Claims a local-only guest run after a permanent Supabase session exists.
 *
 * Safety properties:
 * - synthetic guest IDs are never sent to Supabase;
 * - an existing account runtime is never overwritten;
 * - the registry reward is part of the first idempotent snapshot;
 * - the funnel is marked claimed only after a forced remote read verifies the
 *   full snapshot, so local guest storage remains the recovery copy on failure.
 */
export async function claimLocalIslandRunGuestProgress(options: {
  session: Session | null;
  client: SupabaseClient | null;
  storage?: Storage | null;
  now?: number;
  dependencies?: IslandRunGuestClaimDependencies;
}): Promise<IslandRunGuestClaimResult> {
  const { session, client } = options;
  if (!session || !client) return { status: 'skipped', reason: 'no_session' };
  if (!isPermanentSupabaseUser(session)) return { status: 'skipped', reason: 'not_permanent' };

  const guestState = readIslandRunGuestFunnelState({ storage: options.storage, now: options.now });
  if (guestState.claimStatus === 'claimed' && guestState.claimedUserId === session.user.id) {
    return { status: 'already_claimed', userId: session.user.id };
  }
  if (!['claim_pending', 'claiming', 'claim_failed'].includes(guestState.claimStatus)) {
    return { status: 'skipped', reason: 'no_pending_claim' };
  }

  const dependencies = options.dependencies ?? productionDependencies;
  patchIslandRunGuestFunnelState({ claimStatus: 'claiming' }, { storage: options.storage, now: options.now });

  try {
    const guestRecord = dependencies.readGuestRuntime();
    const expectedClaimRecord = buildLocalGuestRuntimeClaimRecord(guestRecord);
    const existingTarget = await dependencies.hydrateTargetRuntime({
      session,
      client,
      forceRemote: true,
    });

    if (existingTarget.source === 'table') {
      if (!hasVerifiedClaimedRuntime(existingTarget.record, expectedClaimRecord)) {
        patchIslandRunGuestFunnelState({ claimStatus: 'claim_failed' }, { storage: options.storage, now: options.now });
        return { status: 'conflict', reason: 'existing_account_progress', userId: session.user.id };
      }
    } else if (existingTarget.source === 'fallback_no_row') {
      const writeResult = await dependencies.commitTargetRuntime({
        session,
        client,
        record: expectedClaimRecord,
        triggerSource: 'claim_local_guest_runtime',
      });
      if (!writeResult.ok) throw new Error(writeResult.errorMessage);

      const verifiedTarget = await dependencies.hydrateTargetRuntime({
        session,
        client,
        forceRemote: true,
      });
      if (
        verifiedTarget.source !== 'table'
        || !hasVerifiedClaimedRuntime(verifiedTarget.record, expectedClaimRecord)
      ) {
        throw new Error('The server did not verify the imported Island Run snapshot.');
      }
    } else {
      throw new Error(`Unable to verify the target account before import (${existingTarget.source}).`);
    }

    const savedIdentity = await saveGuestIdentity({
      userId: session.user.id,
      guestState,
      dependencies,
    });

    patchIslandRunGuestFunnelState({
      claimStatus: 'claimed',
      claimedUserId: session.user.id,
    }, { storage: options.storage, now: options.now });

    return {
      status: 'claimed',
      userId: session.user.id,
      savedDisplayName: savedIdentity.savedDisplayName,
      savedShipName: savedIdentity.savedShipName,
      registryBonusUsct: ISLAND_RUN_REGISTRY_BONUS_USCT,
      path: 'local_guest_import',
      verifiedRemote: true,
    };
  } catch (error) {
    patchIslandRunGuestFunnelState({ claimStatus: 'claim_failed' }, { storage: options.storage, now: options.now });
    throw error;
  }
}
