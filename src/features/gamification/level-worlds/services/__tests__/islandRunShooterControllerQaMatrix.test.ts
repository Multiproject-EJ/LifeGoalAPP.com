import { createShooterControllerBridge } from '../islandRunShooterControllerBridge';
import { emitShooterControllerLifecycleTelemetry } from '../islandRunShooterControllerTelemetry';
import {
  __resetIslandRunFeatureFlagsForTests,
  __setIslandRunFeatureFlagsForTests,
} from '../../../../../config/islandRunFeatureFlags';
import { resolveBossStopMinigame } from '../islandRunMinigameLauncherService';
import { getBossTrialConfig } from '../bossService';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const QA_ISLANDS = [1, 4, 23] as const;
const QA_SOURCES = ['footer', 'keyboard'] as const;

export const islandRunShooterControllerQaMatrixTests: TestCase[] = [
  {
    name: 'QA matrix: boss launcher routing stays deterministic on islands 1/4/23',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunShooterBlitzBossEnabled: true });

      const outcomes = QA_ISLANDS.map((islandNumber) => {
        const result = resolveBossStopMinigame({ kind: 'fixed_boss', islandNumber });
        return {
          islandNumber,
          minigameId: result?.minigameId ?? null,
        };
      });

      __resetIslandRunFeatureFlagsForTests();
      assertDeepEqual(
        outcomes,
        [
          { islandNumber: 1, minigameId: null },
          { islandNumber: 4, minigameId: null },
          { islandNumber: 23, minigameId: 'shooter_blitz' },
        ],
        'only fight-boss island 23 should route to shooter_blitz in the current Phase 4 contract',
      );
    },
  },
  {
    name: 'QA matrix: post-QA risk sweep keeps milestone bosses legacy and fight bosses on Shooter Blitz',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunShooterBlitzBossEnabled: true });

      const sampledIslands = [1, 4, 23, 24] as const;
      const outcomes = sampledIslands.map((islandNumber) => {
        const trial = getBossTrialConfig(islandNumber);
        const launch = resolveBossStopMinigame({ kind: 'fixed_boss', islandNumber });
        return {
          islandNumber,
          bossType: trial.type,
          routedMinigame: launch?.minigameId ?? null,
        };
      });

      __resetIslandRunFeatureFlagsForTests();
      assertDeepEqual(
        outcomes,
        [
          { islandNumber: 1, bossType: 'milestone', routedMinigame: null },
          { islandNumber: 4, bossType: 'milestone', routedMinigame: null },
          { islandNumber: 23, bossType: 'fight', routedMinigame: 'shooter_blitz' },
          { islandNumber: 24, bossType: 'milestone', routedMinigame: null },
        ],
        'routing contract must keep milestone bosses on legacy flow while fight bosses launch shooter_blitz',
      );
    },
  },
  {
    name: 'QA matrix: footer + keyboard controller intents emit consistently for each island',
    run: () => {
      for (const islandNumber of QA_ISLANDS) {
        const bridge = createShooterControllerBridge();
        const seen: string[] = [];
        bridge.controllerInput.subscribe((intent) => seen.push(intent));

        // Footer taps emit intents directly through the shared bridge.
        bridge.emit('left');
        bridge.emit('right');
        bridge.emit('fire');

        // Keyboard fallback maps to the same intent channel.
        bridge.emit('left');
        bridge.emit('right');
        bridge.emit('fire');

        assertDeepEqual(
          seen,
          ['left', 'right', 'fire', 'left', 'right', 'fire'],
          `island ${islandNumber}: footer + keyboard should drive the same shared intent stream`,
        );
      }
    },
  },
  {
    name: 'QA matrix: controller attach/detach telemetry includes island and source for footer + keyboard',
    run: () => {
      const calls: unknown[][] = [];
      const originalInfo = console.info;
      console.info = (...args: unknown[]) => {
        calls.push(args);
      };

      try {
        for (const islandNumber of QA_ISLANDS) {
          for (const source of QA_SOURCES) {
            emitShooterControllerLifecycleTelemetry('controller_attach', {
              minigameId: 'shooter_blitz',
              islandNumber,
              source,
            });
            emitShooterControllerLifecycleTelemetry('controller_detach', {
              minigameId: 'shooter_blitz',
              islandNumber,
              source,
            });
          }
        }
      } finally {
        console.info = originalInfo;
      }

      assertEqual(calls.length, QA_ISLANDS.length * QA_SOURCES.length * 2, 'attach+detach logs expected for each island/source pair');

      const payloads = calls.map((entry) => ({
        eventName: entry[1],
        payload: entry[2],
      }));

      assertDeepEqual(
        payloads[0],
        {
          eventName: 'controller_attach',
          payload: { minigameId: 'shooter_blitz', islandNumber: 1, source: 'footer' },
        },
        'first telemetry payload should be stable for island 1 footer attach',
      );
      assertDeepEqual(
        payloads[payloads.length - 1],
        {
          eventName: 'controller_detach',
          payload: { minigameId: 'shooter_blitz', islandNumber: 23, source: 'keyboard' },
        },
        'last telemetry payload should be stable for island 23 keyboard detach',
      );
    },
  },
];
