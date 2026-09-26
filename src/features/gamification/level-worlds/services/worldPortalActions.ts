import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { readIslandRunGameStateRecord } from './islandRunGameStateStore';
import { canAttendWorldPortalCouncil, resolveWorldPortalProgress, WORLD_PORTAL_KEY, type WorldPortalProgress } from './worldPortalProgress';

export type WorldPortalHandoverResult =
  | { status: 'saved-on-device'; receipt: WorldPortalProgress }
  | { status: 'journey-changed' | 'not-eligible' | 'storage-unavailable' };

/** Durability check only; gameplay eligibility still comes from canonical state. */
export function readSavedWorldPortalReceipt(session: Session): WorldPortalProgress | null {
  return resolveWorldPortalProgress(readIslandRunGameStateRecord(session).signatureMissionProgressByIsland);
}

export function acceptWorldPortal(options: {
  session: Session; client: SupabaseClient | null;
  expectedIsland: number; expectedCycle: number;
}): Promise<WorldPortalHandoverResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const owned = resolveWorldPortalProgress(state.signatureMissionProgressByIsland);
    const persisted = () => readSavedWorldPortalReceipt(options.session);
    // Replays and double-clicks never increment versions or pay a reward again.
    if (owned && persisted()) return { status: 'saved-on-device', receipt: owned };
    if (!owned) {
      if (state.currentIslandNumber !== options.expectedIsland || state.cycleIndex !== options.expectedCycle)
        return { status: 'journey-changed' };
      if (!canAttendWorldPortalCouncil(state)) return { status: 'not-eligible' };
    }
    const now = Date.now();
    const receipt: WorldPortalProgress = owned ?? {
      missionId: 'world-portal', version: 1, acceptedAtMs: now, updatedAtMs: now,
    };
    await commitIslandRunState({
      session: options.session, client: options.client, triggerSource: 'world_portal_council_handover',
      record: { ...state, runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [WORLD_PORTAL_KEY]: receipt } },
    });
    // The existing writer may queue remote sync or swallow local-storage errors.
    // Do not promise cloud durability from its optimistic result.
    const saved = persisted();
    return saved ? { status: 'saved-on-device', receipt: saved } : { status: 'storage-unavailable' };
  });
}
