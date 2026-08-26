import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { getEffectiveIslandNumber } from './islandRunContractV2EssenceBuild';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { commitIslandRunState, getIslandRunStateSnapshot } from './islandRunStateStore';
import { payStopTicket, type PayStopTicketReason } from './islandRunStopTickets';

export type PurchaseIslandRunStopTicketResult =
  | {
      status: 'paid' | 'already_free';
      cost: number;
      islandNumber: number;
      stopIndex: number;
      record: IslandRunGameStateRecord;
    }
  | {
      status: 'rejected';
      reason: PayStopTicketReason;
      cost: number;
      islandNumber: number;
      stopIndex: number;
      record: IslandRunGameStateRecord;
    };

export interface PurchaseIslandRunStopTicketOptions {
  session: Session;
  client: SupabaseClient | null;
  stopIndex: number;
  prepay?: boolean;
  triggerSource?: string;
}

/**
 * Atomically buys one landmark pass from the canonical Island Run snapshot.
 *
 * The lock covers the complete read → affordability check → ledger update →
 * persistence sequence. A second tap or delayed duplicate callback therefore
 * observes the first purchase and cannot charge the wallet twice.
 */
export function purchaseIslandRunStopTicket(
  options: PurchaseIslandRunStopTicketOptions,
): Promise<PurchaseIslandRunStopTicketResult> {
  const { session, client, prepay = false } = options;
  const stopIndex = Math.floor(options.stopIndex);

  return withIslandRunActionLock(session.user.id, async () => {
    const current = getIslandRunStateSnapshot(session);
    const islandNumber = current.currentIslandNumber;
    const result = payStopTicket({
      effectiveIslandNumber: getEffectiveIslandNumber(islandNumber, current.cycleIndex),
      islandNumber,
      stopIndex,
      essence: current.essence,
      essenceLifetimeSpent: current.essenceLifetimeSpent,
      stopTicketsPaidByIsland: current.stopTicketsPaidByIsland,
      stopStatesByIndex: current.stopStatesByIndex,
      prepay,
    });

    if (!result.ok) {
      return {
        status: 'rejected',
        reason: result.reason,
        cost: result.cost,
        islandNumber,
        stopIndex,
        record: current,
      };
    }

    if (result.alreadyFree) {
      return {
        status: 'already_free',
        cost: 0,
        islandNumber,
        stopIndex,
        record: current,
      };
    }

    const next: IslandRunGameStateRecord = {
      ...current,
      essence: result.essence,
      essenceLifetimeSpent: result.essenceLifetimeSpent,
      stopTicketsPaidByIsland: result.stopTicketsPaidByIsland,
      runtimeVersion: current.runtimeVersion + 1,
    };
    const commit = await commitIslandRunState({
      session,
      client,
      record: next,
      triggerSource: options.triggerSource ?? (prepay ? 'stop_ticket_prepay_discount' : 'stop_ticket_payment'),
    });
    if (!commit.ok) {
      throw new Error(commit.errorMessage);
    }

    return {
      status: 'paid',
      cost: result.cost,
      islandNumber,
      stopIndex,
      record: next,
    };
  });
}
