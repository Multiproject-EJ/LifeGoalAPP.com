import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { getMoonwellThermalKey, resolveMoonwellThermalProgress } from './islandRunMoonwellThermal';

/** Commit exactly once before any thaw animation; no spend, reward or clear gate. */
export function activateMoonwellThermal(options: { session: Session; client: SupabaseClient | null }): Promise<
  { status: 'ok' | 'already_heated'; heatedAtMs: number } | { status: 'wrong_island' | 'building_incomplete' | 'heat_not_collected' }
> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    if (state.currentIslandNumber !== 3) return { status: 'wrong_island' };
    const progress = resolveMoonwellThermalProgress(state.signatureMissionProgressByIsland, state.cycleIndex);
    if (progress.heatedAtMs !== null) return { status: 'already_heated', heatedAtMs: progress.heatedAtMs };
    if ((state.stopBuildStateByIndex[2]?.buildLevel ?? 0) < 3) return { status: 'building_incomplete' };
    if (progress.heatCollectedAtMs === null) return { status: 'heat_not_collected' };
    const nowMs = Date.now();
    await commitIslandRunState({ ...options, record: {
      ...state, runtimeVersion: state.runtimeVersion + 1,
      signatureMissionProgressByIsland: { ...state.signatureMissionProgressByIsland,
        [getMoonwellThermalKey(state.cycleIndex)]: { ...progress, heatedAtMs: nowMs, updatedAtMs: nowMs },
      },
    }, triggerSource: 'activate_moonwell_thermal' });
    return { status: 'ok', heatedAtMs: nowMs };
  });
}
