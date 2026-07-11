import type { EventId } from '../features/gamification/level-worlds/services/islandRunEventEngine';
import { createGuardedCheckoutSession } from './guardedCheckout';

export type MinigameTicketSkuId =
  | 'minigame_tickets_10'
  | 'feeding_frenzy_tickets_10'
  | 'lucky_spin_tickets_10'
  | 'space_excavator_tickets_10'
  | 'companion_feast_tickets_10';

export type MinigameTicketCheckoutResult = {
  url: string | null;
  error: Error | null;
};

export type MinigameTicketCheckoutOptions = {
  skuId: MinigameTicketSkuId;
  eventId?: EventId | null;
};

export const MINIGAME_TICKET_SKU_BY_EVENT: Record<EventId, MinigameTicketSkuId> = {
  feeding_frenzy: 'feeding_frenzy_tickets_10',
  lucky_spin: 'lucky_spin_tickets_10',
  space_excavator: 'space_excavator_tickets_10',
  companion_feast: 'companion_feast_tickets_10',
};

export function resolveMinigameTicketSku(eventId: EventId | null | undefined): MinigameTicketSkuId {
  if (!eventId) return 'minigame_tickets_10';
  return MINIGAME_TICKET_SKU_BY_EVENT[eventId] ?? 'minigame_tickets_10';
}

/**
 * Phase 7 (Monetization) client wrapper for starting Stripe checkout flows
 * for minigame tickets. Mirrors the existing dice checkout invoke shape while
 * allowing event-specific SKU routing.
 */
export async function initiateMinigameTicketCheckout(
  options: MinigameTicketCheckoutOptions,
): Promise<MinigameTicketCheckoutResult> {
  return createGuardedCheckoutSession({
    feature: 'purchases',
    functionName: 'create-checkout-session-minigame-ticket',
    body: {
      sku_id: options.skuId,
      event_id: options.eventId ?? null,
    },
    missingUrlMessage: 'Minigame ticket checkout did not return a checkout URL.',
  });
}
