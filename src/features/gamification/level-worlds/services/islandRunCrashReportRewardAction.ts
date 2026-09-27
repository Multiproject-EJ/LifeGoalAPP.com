import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';

/**
 * Applies the crash-report thank-you dice after the server RPC
 * `submit_crash_report` granted them (once per user per UTC day, amount
 * decided server-side). Canonical, mutex-protected write; the UI never
 * touches runtime state. A thread's reward is only ever applied once.
 */
const appliedThreads = new Set<string>();

export function applyCrashReportThankYouDice(options: {
  session: Session;
  client: SupabaseClient | null;
  threadId: string;
  amount: number;
}): Promise<{ applied: boolean; record: IslandRunGameStateRecord }> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const current = getIslandRunStateSnapshot(options.session);
    const amount = Math.max(0, Math.min(100, Math.floor(options.amount)));
    if (!options.threadId || amount <= 0 || appliedThreads.has(options.threadId)) {
      return { applied: false, record: current };
    }
    appliedThreads.add(options.threadId);
    const record: IslandRunGameStateRecord = {
      ...current,
      runtimeVersion: current.runtimeVersion + 1,
      dicePool: current.dicePool + amount,
    };
    const result = await commitIslandRunState({
      session: options.session,
      client: options.client,
      record,
      triggerSource: 'crash_report_thank_you_dice',
    });
    if (!result.ok) {
      appliedThreads.delete(options.threadId);
      throw new Error(result.errorMessage);
    }
    return { applied: true, record };
  });
}
