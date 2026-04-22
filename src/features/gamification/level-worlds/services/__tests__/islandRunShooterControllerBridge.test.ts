import { createShooterControllerBridge } from '../islandRunShooterControllerBridge';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunShooterControllerBridgeTests: TestCase[] = [
  {
    name: 'emit forwards intents to active subscribers in subscription order',
    run: () => {
      const bridge = createShooterControllerBridge();
      const seen: string[] = [];
      bridge.controllerInput.subscribe((intent) => seen.push(`a:${intent}`));
      bridge.controllerInput.subscribe((intent) => seen.push(`b:${intent}`));

      bridge.emit('left');
      bridge.emit('fire');

      assertDeepEqual(
        seen,
        ['a:left', 'b:left', 'a:fire', 'b:fire'],
        'all active listeners should receive emitted intents in order',
      );
    },
  },
  {
    name: 'unsubscribe detaches listener so it no longer receives intents',
    run: () => {
      const bridge = createShooterControllerBridge();
      let fireCount = 0;
      const unsubscribe = bridge.controllerInput.subscribe((intent) => {
        if (intent === 'fire') fireCount += 1;
      });

      bridge.emit('fire');
      unsubscribe();
      bridge.emit('fire');

      assertEqual(fireCount, 1, 'unsubscribed listeners should not receive future intents');
    },
  },
  {
    name: 'reset clears listeners (footer-nav restore guard)',
    run: () => {
      const bridge = createShooterControllerBridge();
      const seen: string[] = [];
      bridge.controllerInput.subscribe((intent) => seen.push(intent));
      assertEqual(bridge.listenerCount(), 1, 'listener should be registered before reset');

      bridge.reset();
      bridge.emit('right');

      assertEqual(bridge.listenerCount(), 0, 'reset should clear all listeners');
      assertDeepEqual(seen, [], 'no intent should flow after reset');
    },
  },
];
