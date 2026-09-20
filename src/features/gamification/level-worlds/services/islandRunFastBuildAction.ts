import { recordIslandRunDiceInflow, ISLAND_RUN_ECONOMY_SOURCES } from './islandRunEconomyTelemetry';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { resolveIslandRunFastBuild, type FastBuildQuote } from './islandRunFastBuild';

export function applyIslandRunFastBuild(options: { session: Session; client: SupabaseClient | null; quote: FastBuildQuote }) {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const result = resolveIslandRunFastBuild(getIslandRunStateSnapshot(options.session), options.quote);
    if (result.applied) {
      // Publish and persist locally synchronously; the existing writer queues remote sync.
      void commitIslandRunState({ session: options.session, client: options.client, record: result.record, triggerSource: `build_fast_${options.quote.mode}` });
      recordIslandRunDiceInflow({ source: ISLAND_RUN_ECONOMY_SOURCES.constructionLevelDice, amount: result.diceAward, sessionId: options.session.user.id, metadata: { mode: options.quote.mode, island: result.record.currentIslandNumber } });
    }
    return result;
  });
}
