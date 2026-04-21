"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commitIslandRunRuntimeSnapshot = commitIslandRunRuntimeSnapshot;
/**
 * Phase-A action-commit wrapper that applies optimistic versioned snapshot writes.
 *
 * This is intentionally table-write based (no RPC yet), but it centralizes commit semantics
 * under a single service so we can swap to `island_run_commit_action` RPC in a later phase
 * without touching every mutation path.
 */
async function commitIslandRunRuntimeSnapshot(options) {
    const { client, deviceSessionId, expectedVersion, payload, clientActionId: incomingClientActionId } = options;
    const nextVersion = Math.max(0, Math.floor(expectedVersion)) + 1;
    const clientActionId = typeof incomingClientActionId === 'string' && incomingClientActionId.trim().length > 0
        ? incomingClientActionId
        :
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `island-run-action-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    if (typeof client.rpc !== 'function') {
        return { status: 'error', error: { message: 'island_run_commit_action RPC is unavailable on this client.', code: 'missing_commit_action_rpc' } };
    }
    const { data: rpcData, error: rpcError } = await client.rpc('island_run_commit_action', {
        p_device_session_id: deviceSessionId,
        p_expected_runtime_version: expectedVersion,
        p_action_type: 'runtime_snapshot_upsert',
        p_action_payload: payload,
        p_client_action_id: clientActionId,
    });
    if (rpcError) {
        return { status: 'error', error: rpcError };
    }
    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    const status = typeof row?.status === 'string' ? row.status : null;
    if (status === 'applied') {
        return {
            status: 'applied',
            nextVersion: typeof row.runtime_version === 'number' ? row.runtime_version : nextVersion,
        };
    }
    if (status === 'conflict') {
        return { status: 'conflict' };
    }
    if (status === 'invalid') {
        return { status: 'error', error: { message: row?.server_message ?? 'Invalid commit action payload.', code: 'invalid_commit_action' } };
    }
    return { status: 'error', error: { message: row?.server_message ?? 'Unknown commit action status.', code: 'unknown_commit_action_status' } };
}
