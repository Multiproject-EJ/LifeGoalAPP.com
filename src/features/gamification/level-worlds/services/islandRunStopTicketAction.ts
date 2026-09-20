import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { IslandRunGameStateRecord } from './islandRunGameStateStore';
import { getIslandRunStateSnapshot } from './islandRunStateStore';
import { type PayStopTicketReason } from './islandRunStopTickets';

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

/** Compatibility entry point: ordinary landmarks no longer sell entry passes. */
export async function purchaseIslandRunStopTicket(
  options: PurchaseIslandRunStopTicketOptions,
): Promise<PurchaseIslandRunStopTicketResult> {
  const record = getIslandRunStateSnapshot(options.session);
  return { status: 'already_free', cost: 0, islandNumber: record.currentIslandNumber,
    stopIndex: Math.floor(options.stopIndex), record };
}
