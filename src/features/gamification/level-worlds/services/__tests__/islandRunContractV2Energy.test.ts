import {
  canRetryBossTrial,
  isIslandRunRollEnergyDepleted,
  resolveIslandRunRollButtonMode,
  resolveIslandRunTimerLabel,
} from '../islandRunContractV2Energy';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunContractV2EnergyTests: TestCase[] = [
  {
    name: 'roll availability depends on dice only',
    run: () => {
      const mode = resolveIslandRunRollButtonMode({
        isRolling: false,
        dicePool: 1,
        dicePerRoll: 2,
      });
      const depleted = isIslandRunRollEnergyDepleted({
        dicePool: 1,
        dicePerRoll: 2,
      });

      assertEqual(mode, 'no_dice', 'Expected mode to block roll without enough dice');
      assertEqual(depleted, true, 'Expected energy to be depleted when dicePool < dicePerRoll');
    },
  },
  {
    name: 'roll is available when dice pool is sufficient',
    run: () => {
      const mode = resolveIslandRunRollButtonMode({
        isRolling: false,
        dicePool: 2,
        dicePerRoll: 2,
      });
      const depleted = isIslandRunRollEnergyDepleted({
        dicePool: 2,
        dicePerRoll: 2,
      });

      assertEqual(mode, 'roll', 'Expected roll mode when dice are available');
      assertEqual(depleted, false, 'Expected energy not depleted with enough dice');
    },
  },
  {
    name: 'boss retry is always allowed (hearts retired)',
    run: () => {
      assertEqual(canRetryBossTrial(), true, 'Expected boss retry to always be available');
    },
  },
  {
    name: 'timer label is always Timer:',
    run: () => {
      assertEqual(
        resolveIslandRunTimerLabel(),
        'Timer:',
        'Expected timer label to always be Timer:',
      );
    },
  },
  {
    name: 'rolling state returns rolling mode',
    run: () => {
      const mode = resolveIslandRunRollButtonMode({
        isRolling: true,
        dicePool: 100,
        dicePerRoll: 2,
      });
      assertEqual(mode, 'rolling', 'Expected rolling mode when isRolling is true');
    },
  },
];
