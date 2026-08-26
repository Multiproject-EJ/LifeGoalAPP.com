export const MINIGAME_TICKETS_PER_PACK = 10;

export const ALLOWED_MINIGAME_TICKET_SKU_IDS = [
  'minigame_tickets_10',
  'feeding_frenzy_tickets_10',
  'lucky_spin_tickets_10',
  'space_excavator_tickets_10',
  'companion_feast_tickets_10',
] as const;

export type MinigameTicketSkuId = (typeof ALLOWED_MINIGAME_TICKET_SKU_IDS)[number];
export type MinigameTicketEventId = 'feeding_frenzy' | 'lucky_spin' | 'space_excavator' | 'companion_feast' | 'skybound_expedition';

const SKU_BY_EVENT: Record<MinigameTicketEventId, MinigameTicketSkuId> = {
  feeding_frenzy: 'feeding_frenzy_tickets_10',
  lucky_spin: 'lucky_spin_tickets_10',
  space_excavator: 'space_excavator_tickets_10',
  companion_feast: 'companion_feast_tickets_10',
  skybound_expedition: 'minigame_tickets_10',
};

export function isValidMinigameTicketSkuId(value: unknown): value is MinigameTicketSkuId {
  return typeof value === 'string'
    && (ALLOWED_MINIGAME_TICKET_SKU_IDS as readonly string[]).includes(value);
}

export function isValidMinigameTicketEventId(value: unknown): value is MinigameTicketEventId {
  return value === 'feeding_frenzy'
    || value === 'lucky_spin'
    || value === 'space_excavator'
    || value === 'companion_feast'
    || value === 'skybound_expedition';
}

export function resolveMinigameTicketPriceEnvName(skuId: MinigameTicketSkuId): string {
  switch (skuId) {
    case 'minigame_tickets_10': return 'STRIPE_PRICE_MINIGAME_TICKETS_10';
    case 'feeding_frenzy_tickets_10': return 'STRIPE_PRICE_FEEDING_FRENZY_TICKETS_10';
    case 'lucky_spin_tickets_10': return 'STRIPE_PRICE_LUCKY_SPIN_TICKETS_10';
    case 'space_excavator_tickets_10': return 'STRIPE_PRICE_SPACE_EXCAVATOR_TICKETS_10';
    case 'companion_feast_tickets_10': return 'STRIPE_PRICE_COMPANION_FEAST_TICKETS_10';
  }
}

export function isMinigameTicketSkuCompatibleWithEvent(
  skuId: MinigameTicketSkuId,
  eventId: MinigameTicketEventId | null,
): boolean {
  return eventId === null || skuId === 'minigame_tickets_10' || SKU_BY_EVENT[eventId] === skuId;
}

export function buildMinigameTicketCheckoutMetadata(options: {
  userId: string;
  skuId: MinigameTicketSkuId;
  eventId: MinigameTicketEventId | null;
}): Record<string, string> {
  return {
    user_id: options.userId,
    product_type: 'minigame_ticket_pack',
    sku_id: options.skuId,
    event_id: options.eventId ?? '',
    tickets: String(MINIGAME_TICKETS_PER_PACK),
  };
}
