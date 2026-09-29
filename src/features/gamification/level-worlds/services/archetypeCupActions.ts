import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import {
  ARCHETYPE_CUP_KEY,
  applyArchetypeCupContribution,
  sanitizeArchetypeCupProgress,
  type ArchetypeCupContribution,
  type ArchetypeCupProgress,
} from './archetypeCup';

/** Read the player's Archetype Cup progress from canonical state. */
export function resolveArchetypeCupProgress(state: Pick<IslandRunGameStateRecord, 'signatureMissionProgressByIsland'>): ArchetypeCupProgress {
  return sanitizeArchetypeCupProgress(state.signatureMissionProgressByIsland[ARCHETYPE_CUP_KEY]);
}

/**
 * Canonical write for Archetype Cup points. Mutex-protected and idempotent
 * per activity id; UI never patches Cup scores directly. The caller supplies
 * the canonical active season id (season scheduling is not built yet).
 */
export function recordArchetypeCupContribution(options: {
  session: Session;
  client: SupabaseClient | null;
  seasonId: string;
  contribution: ArchetypeCupContribution;
}) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const result = applyArchetypeCupContribution(resolveArchetypeCupProgress(state), options.seasonId, options.contribution);
    if (!result.applied) return result;
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: `archetype_cup_${options.contribution.kind}`,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland, [ARCHETYPE_CUP_KEY]: result.progress },
      },
    });
    return result;
  });
}
