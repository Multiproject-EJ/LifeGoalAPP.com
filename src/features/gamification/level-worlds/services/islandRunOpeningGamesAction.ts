import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import {
  advanceOpeningGamesPreparation,
  OPENING_GAMES_CEREMONY_KEY,
  type OpeningGamesPreparationAction,
} from './islandRunOpeningGames';

/** Reads funded construction from the canonical store, never from UI claims.
 * Repeated taps serialize with rolls/builds and cannot repeat a milestone. */
export function prepareIslandRunOpeningGames(options: {
  session: Session;
  client: SupabaseClient | null;
  action: OpeningGamesPreparationAction;
}) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const state = getIslandRunStateSnapshot(options.session);
    const result = advanceOpeningGamesPreparation({
      ledger: state.signatureMissionProgressByIsland,
      islandNumber: state.currentIslandNumber,
      action: options.action,
      buildLevels: state.stopBuildStateByIndex.map(stop => stop.buildLevel),
      nowMs: Date.now(),
    });
    if (result.status !== 'ok') return result;
    // No separate event, reward wallet, egg or ticket grant is created here.
    await commitIslandRunState({
      session: options.session,
      client: options.client,
      triggerSource: `opening_games_${options.action.replace(/-/g, '_')}`,
      record: {
        ...state,
        runtimeVersion: state.runtimeVersion + 1,
        signatureMissionProgressByIsland: {
          ...state.signatureMissionProgressByIsland,
          [OPENING_GAMES_CEREMONY_KEY]: result.progress,
        },
      },
    });
    return result;
  });
}
