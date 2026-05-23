import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { getActiveEvent } from './islandRunEventEngine';
import { readIslandRunGameStateRecord, type IslandRunGameStateRecord } from './islandRunGameStateStore';
import { commitIslandRunState } from './islandRunStateStore';

export const WELCOME_PACK_BUNDLE_DICE = 150;
export const WELCOME_PACK_BUNDLE_ESSENCE = 2000;
export const WELCOME_PACK_BUNDLE_EVENT_TICKETS = 20;

export interface ClaimWelcomePackRewardBundleResult {
  status: 'claimed' | 'already_claimed' | 'claimed_without_active_event';
  record: IslandRunGameStateRecord;
  granted: { dice: number; essence: number; eventTickets: number; eventId: string | null };
}

export function claimWelcomePackRewardBundle(options: {
  session: Session;
  client: SupabaseClient | null;
  nowMs?: number;
  triggerSource?: string;
}): Promise<ClaimWelcomePackRewardBundleResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const current = readIslandRunGameStateRecord(options.session);
    if (current.welcomePackRewardBundleClaimed) {
      return { status: 'already_claimed', record: current, granted: { dice: 0, essence: 0, eventTickets: 0, eventId: null } };
    }
    const nowMs = typeof options.nowMs === 'number' ? options.nowMs : Date.now();
    const activeEvent = getActiveEvent(current, nowMs);
    const activeEventId = activeEvent?.recordEventId ?? null;
    const next: IslandRunGameStateRecord = {
      ...current,
      runtimeVersion: current.runtimeVersion + 1,
      dicePool: current.dicePool + WELCOME_PACK_BUNDLE_DICE,
      essence: current.essence + WELCOME_PACK_BUNDLE_ESSENCE,
      minigameTicketsByEvent: activeEventId
        ? { ...current.minigameTicketsByEvent, [activeEventId]: (current.minigameTicketsByEvent[activeEventId] ?? 0) + WELCOME_PACK_BUNDLE_EVENT_TICKETS }
        : current.minigameTicketsByEvent,
      welcomePackRewardBundleClaimed: true,
    };
    await commitIslandRunState({ session: options.session, client: options.client, record: next, triggerSource: options.triggerSource ?? 'claim_welcome_pack_reward_bundle' });
    return {
      status: activeEventId ? 'claimed' : 'claimed_without_active_event',
      record: next,
      granted: {
        dice: WELCOME_PACK_BUNDLE_DICE,
        essence: WELCOME_PACK_BUNDLE_ESSENCE,
        eventTickets: activeEventId ? WELCOME_PACK_BUNDLE_EVENT_TICKETS : 0,
        eventId: activeEventId,
      },
    };
  });
}
