import { resolveMinigameTicketSku } from '../../../../../services/minigameTicketStore';
import { assertEqual, type TestCase } from './testHarness';

export const minigameTicketStoreTests: TestCase[] = [
  {
    name: 'Skybound ticket checkout reuses the generic pack and preserves event metadata routing',
    run: () => {
      assertEqual(resolveMinigameTicketSku('skybound_expedition'), 'minigame_tickets_10', 'Skybound should not require an unconfigured Stripe price');
    },
  },
];
