export type OutsideRewardIntentKind = 'dice' | 'gold' | 'daily_spin_access' | 'event_tickets';

export type OutsideRewardSource =
  | 'daily_bonus'
  | 'shop_checkout'
  | 'ad_reward'
  | 'promo_grant'
  | 'admin_grant'
  | 'timed_event_reward';

export type OutsideRewardIntent = {
  kind: OutsideRewardIntentKind;
  amount: number;
};

export type OutsideRewardGatewayRequest = {
  source: OutsideRewardSource;
  intent: OutsideRewardIntent;
  activeEventId?: string | null;
};

/**
 * Outside-reward entrypoint request validator.
 *
 * Notes for Phase-3 prep:
 * - Event Tickets always mean minigameTicketsByEvent[eventId] grants only.
 * - Outside reward sources must not write spinTokens directly.
 * - This validator introduces request-shape guardrails only; it does not switch spend authority.
 */
export function validateOutsideRewardGatewayRequest(request: OutsideRewardGatewayRequest): void {
  if (!request || typeof request !== 'object') {
    throw new Error('outsideRewardGateway request must be an object');
  }

  const { intent } = request;
  const allowedKinds: OutsideRewardIntentKind[] = ['dice', 'gold', 'daily_spin_access', 'event_tickets'];
  if (!allowedKinds.includes(intent.kind)) {
    throw new Error(`outsideRewardGateway intent kind must be one of: ${allowedKinds.join(', ')}`);
  }

  if (!Number.isInteger(intent.amount) || intent.amount < 0) {
    throw new Error('outsideRewardGateway intent amount must be an integer >= 0');
  }

  if (intent.kind === 'event_tickets') {
    if (typeof request.activeEventId !== 'string' || request.activeEventId.trim().length === 0) {
      throw new Error('outsideRewardGateway event_tickets requires a non-empty activeEventId');
    }
  }
}
