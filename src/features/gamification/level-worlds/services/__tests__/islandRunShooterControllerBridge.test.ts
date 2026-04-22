import {
  bindKeyboardToShooterBridge,
  createShooterControllerBridge,
  mapKeyboardEventToShooterIntent,
} from '../islandRunShooterControllerBridge';
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
  {
    name: 'keyboard mapping resolves arrows/space and ignores unsupported keys',
    run: () => {
      assertEqual(mapKeyboardEventToShooterIntent('ArrowLeft'), 'left', 'ArrowLeft should map to left intent');
      assertEqual(mapKeyboardEventToShooterIntent('ArrowRight'), 'right', 'ArrowRight should map to right intent');
      assertEqual(mapKeyboardEventToShooterIntent(' '), 'fire', 'Space key should map to fire intent');
      assertEqual(mapKeyboardEventToShooterIntent('Spacebar'), 'fire', 'Legacy Spacebar should map to fire intent');
      assertEqual(mapKeyboardEventToShooterIntent('Enter'), null, 'unsupported keys should map to null');
    },
  },
  {
    name: 'keyboard binding emits mapped intents and unsubscribes cleanly',
    run: () => {
      const bridge = createShooterControllerBridge();
      const seen: string[] = [];
      bridge.controllerInput.subscribe((intent) => seen.push(intent));

      let keydownHandler: ((event: KeyboardEvent) => void) | null = null;
      const removeCalls: Array<{ eventName: string; handler: unknown }> = [];
      const fakeWindow = {
        addEventListener(eventName: string, handler: unknown) {
          if (eventName === 'keydown') keydownHandler = handler as (event: KeyboardEvent) => void;
        },
        removeEventListener(eventName: string, handler: unknown) {
          removeCalls.push({ eventName, handler });
        },
      } as unknown as Pick<Window, 'addEventListener' | 'removeEventListener'>;

      const unsubscribe = bindKeyboardToShooterBridge(bridge, fakeWindow);
      if (!keydownHandler) {
        throw new Error('keydown handler should be registered');
      }
      const handler = keydownHandler as (event: KeyboardEvent) => void;

      const makeEvent = (key: string): KeyboardEvent =>
        ({ key, preventDefault() {} }) as unknown as KeyboardEvent;

      handler(makeEvent('ArrowLeft'));
      handler(makeEvent('ArrowRight'));
      handler(makeEvent(' '));
      handler(makeEvent('Enter'));

      assertDeepEqual(seen, ['left', 'right', 'fire'], 'only mapped keys should emit intents');

      unsubscribe();
      assertEqual(removeCalls.length, 1, 'keyboard binding should unregister one listener');
      assertEqual(removeCalls[0]?.eventName, 'keydown', 'binding should remove keydown listener');
    },
  },
];
