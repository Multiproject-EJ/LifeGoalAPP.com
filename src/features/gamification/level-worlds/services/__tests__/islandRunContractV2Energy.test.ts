import {
  canRetryBossTrial,
  isIslandRunRollEnergyDepleted,
  resolveIslandRunRollButtonMode,
  canUseSpinForMovement,
  shouldConsumeHeartOnBossFailure,
  resolveIslandRunTimerLabel,
} from '../islandRunContractV2Energy';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunContractV2EnergyTests: TestCase[] = [
  {
    name: 'v2 ON: roll availability depends on dice only',
    run: () => {
      const mode = resolveIslandRunRollButtonMode({
        islandRunContractV2Enabled: true,
        isRolling: false,
        step1Complete: true,
        dicePool: 1,
        dicePerRoll: 2,
      });
      const depleted = isIslandRunRollEnergyDepleted({
        islandRunContractV2Enabled: true,
        dicePool: 1,
        hearts: 99,
        dicePerRoll: 2,
      });

      assertEqual(mode, 'no_dice', 'Expected v2 mode to block roll without enough dice');
      assertEqual(depleted, true, 'Expected hearts to be ignored as movement fallback in v2');
    },
  },
  {
    name: 'v2 ON: no heart fallback conversion mode is offered',
    run: () => {
      const mode = resolveIslandRunRollButtonMode({
        islandRunContractV2Enabled: true,
        isRolling: false,
        step1Complete: true,
        dicePool: 0,
        dicePerRoll: 2,
      });
      assertEqual(mode, 'no_dice', 'Expected no conversion mode while v2 contract is enabled');
    },
  },
  {
    name: 'v2 ON: boss retry/failure does not require hearts',
    run: () => {
      assertEqual(shouldConsumeHeartOnBossFailure(true), false, 'Expected v2 boss failure to not consume hearts');
      assertEqual(canRetryBossTrial({ islandRunContractV2Enabled: true, hearts: 0 }), true, 'Expected v2 retry to be available without hearts');
    },
  },
  {
    name: 'v2 ON: timer label copy avoids progression-gated wording',
    run: () => {
      assertEqual(
        resolveIslandRunTimerLabel({ islandRunContractV2Enabled: true, isIslandTimerPendingStart: false }),
        'Timer:',
        "Expected v2 timer label to avoid legacy 'Ends in' phrasing",
      );
    },
  },
  {
    name: 'v2 ON: spin cannot be used as alternate movement path',
    run: () => {
      assertEqual(canUseSpinForMovement(true), false, 'Expected v2 mode to disable spin-based token movement');
    },
  },
  {
    name: 'v2 OFF: legacy heart conversion and boss gating remain intact',
    run: () => {
      const mode = resolveIslandRunRollButtonMode({
        islandRunContractV2Enabled: false,
        isRolling: false,
        step1Complete: true,
        dicePool: 0,
        dicePerRoll: 2,
      });
      const depleted = isIslandRunRollEnergyDepleted({
        islandRunContractV2Enabled: false,
        dicePool: 0,
        hearts: 1,
        dicePerRoll: 2,
      });

      assertEqual(mode, 'convert', 'Expected legacy mode to keep conversion path');
      assertEqual(depleted, false, 'Expected legacy mode hearts to remain valid fallback energy');
      assertEqual(shouldConsumeHeartOnBossFailure(false), true, 'Expected legacy boss failure to still cost hearts');
      assertEqual(canRetryBossTrial({ islandRunContractV2Enabled: false, hearts: 0 }), false, 'Expected legacy retry to remain heart-gated');
      assertEqual(canUseSpinForMovement(false), true, 'Expected legacy mode to preserve spin-based movement');
    },
  },
];
