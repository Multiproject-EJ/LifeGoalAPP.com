import type { SupabaseClient } from '@supabase/supabase-js';

export type IslandRunClaimOwnershipStatus = 'granted' | 'already_owner' | 'conflict';

export interface IslandRunClaimSessionResult {
  ownership_status: IslandRunClaimOwnershipStatus;
  lease_version: number;
  expires_at: string | null;
  previous_device_session_id: string | null;
  active_device_session_id: string | null;
}

export interface IslandRunHeartbeatResult {
  heartbeat_status: 'ok' | 'not_owner' | 'missing';
  lease_version: number;
  expires_at: string | null;
  active_device_session_id: string | null;
}

export interface IslandRunReleaseResult {
  released: boolean;
  lease_version: number;
  active_device_session_id: string | null;
}

export interface IslandRunValidateOwnerResult {
  is_owner: boolean;
  lease_is_active: boolean;
  lease_version: number;
  expires_at: string | null;
  active_device_session_id: string | null;
}

function normalizeSingleRow<T>(value: unknown): T | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return (value[0] as T | undefined) ?? null;
  }
  return value as T;
}

export async function claimIslandRunActiveSession(options: {
  client: SupabaseClient;
  deviceSessionId: string;
  forceTakeover?: boolean;
  takeoverReason?: string;
  metadata?: Record<string, unknown>;
  leaseTtlSeconds?: number;
}): Promise<{ data: IslandRunClaimSessionResult | null; error: Error | null }> {
  const {
    client,
    deviceSessionId,
    forceTakeover = true,
    takeoverReason = 'enter',
    metadata = {},
    leaseTtlSeconds = 35,
  } = options;

  const { data, error } = await client.rpc('island_run_claim_active_session', {
    p_device_session_id: deviceSessionId,
    p_force_takeover: forceTakeover,
    p_takeover_reason: takeoverReason,
    p_metadata: metadata,
    p_lease_ttl_seconds: leaseTtlSeconds,
  });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const row = normalizeSingleRow<IslandRunClaimSessionResult>(data);
  return { data: row, error: null };
}

export async function heartbeatIslandRunActiveSession(options: {
  client: SupabaseClient;
  deviceSessionId: string;
  leaseTtlSeconds?: number;
}): Promise<{ data: IslandRunHeartbeatResult | null; error: Error | null }> {
  const { client, deviceSessionId, leaseTtlSeconds = 35 } = options;

  const { data, error } = await client.rpc('island_run_heartbeat_session', {
    p_device_session_id: deviceSessionId,
    p_lease_ttl_seconds: leaseTtlSeconds,
  });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const row = normalizeSingleRow<IslandRunHeartbeatResult>(data);
  return { data: row, error: null };
}

export async function releaseIslandRunActiveSession(options: {
  client: SupabaseClient;
  deviceSessionId: string;
}): Promise<{ data: IslandRunReleaseResult | null; error: Error | null }> {
  const { client, deviceSessionId } = options;

  const { data, error } = await client.rpc('island_run_release_active_session', {
    p_device_session_id: deviceSessionId,
  });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const row = normalizeSingleRow<IslandRunReleaseResult>(data);
  return { data: row, error: null };
}

export async function validateIslandRunSessionOwner(options: {
  client: SupabaseClient;
  deviceSessionId: string;
}): Promise<{ data: IslandRunValidateOwnerResult | null; error: Error | null }> {
  const { client, deviceSessionId } = options;

  const { data, error } = await client.rpc('island_run_validate_session_owner', {
    p_device_session_id: deviceSessionId,
  });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const row = normalizeSingleRow<IslandRunValidateOwnerResult>(data);
  return { data: row, error: null };
}
