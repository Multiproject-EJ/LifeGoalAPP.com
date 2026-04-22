import {
  emitShooterControllerLifecycleTelemetry,
} from '../islandRunShooterControllerTelemetry';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunShooterControllerTelemetryTests: TestCase[] = [
  {
    name: 'emitShooterControllerLifecycleTelemetry logs stable structured attach payload',
    run: () => {
      const calls: unknown[][] = [];
      const originalInfo = console.info;
      console.info = (...args: unknown[]) => {
        calls.push(args);
      };
      try {
        emitShooterControllerLifecycleTelemetry('controller_attach', {
          minigameId: 'shooter_blitz',
          islandNumber: 23,
          source: 'keyboard',
        });
      } finally {
        console.info = originalInfo;
      }

      assertEqual(calls.length, 1, 'exactly one telemetry line should be emitted');
      assertEqual(calls[0]?.[0], '[IslandRunShooterController]', 'stable telemetry prefix');
      assertEqual(calls[0]?.[1], 'controller_attach', 'event tag should match');
      assertDeepEqual(
        calls[0]?.[2],
        { minigameId: 'shooter_blitz', islandNumber: 23, source: 'keyboard' },
        'payload shape should include minigame/island/source',
      );
    },
  },
];
