import { validateOutsideRewardGatewayRequest } from '../../../../../services/outsideRewardGateway';
import type { TestCase } from './testHarness';

function expectThrows(run: () => void, message: string): void {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }

  if (!threw) {
    throw new Error(message);
  }
}

export const outsideRewardGatewayTests: TestCase[] = [
  {
    name: 'accepts dice, gold, and daily_spin_access without activeEventId',
    run: () => {
      validateOutsideRewardGatewayRequest({
        source: 'daily_bonus',
        intent: { kind: 'dice', amount: 1 },
      });
      validateOutsideRewardGatewayRequest({
        source: 'shop_checkout',
        intent: { kind: 'gold', amount: 5 },
      });
      validateOutsideRewardGatewayRequest({
        source: 'promo_grant',
        intent: { kind: 'daily_spin_access', amount: 1 },
      });
    },
  },
  {
    name: 'rejects event_tickets without activeEventId',
    run: () => {
      expectThrows(
        () =>
          validateOutsideRewardGatewayRequest({
            source: 'timed_event_reward',
            intent: { kind: 'event_tickets', amount: 2 },
          }),
        'event_tickets without activeEventId should fail validation',
      );
    },
  },
  {
    name: 'accepts event_tickets when activeEventId is provided',
    run: () => {
      validateOutsideRewardGatewayRequest({
        source: 'timed_event_reward',
        intent: { kind: 'event_tickets', amount: 2 },
        activeEventId: 'feeding_frenzy',
      });
    },
  },
  {
    name: 'rejects negative amounts, non-integer amounts, and unknown intent kinds',
    run: () => {
      expectThrows(
        () =>
          validateOutsideRewardGatewayRequest({
            source: 'daily_bonus',
            intent: { kind: 'dice', amount: -1 },
          }),
        'negative amount should fail validation',
      );

      expectThrows(
        () =>
          validateOutsideRewardGatewayRequest({
            source: 'daily_bonus',
            intent: { kind: 'gold', amount: 1.25 },
          }),
        'non-integer amount should fail validation',
      );

      expectThrows(
        () =>
          validateOutsideRewardGatewayRequest({
            source: 'daily_bonus',
            intent: { kind: 'spin_tokens' as never, amount: 1 },
          }),
        'unknown intent kind should fail validation',
      );
    },
  },
];
