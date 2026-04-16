import {
  resolveDiceRegenMinDice,
  resolveDiceRegenRatePerHour,
  applyDiceRegeneration,
  buildInitialDiceRegenState,
  DICE_REGEN_FULL_WINDOW_MS,
} from '../islandRunDiceRegeneration';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunDiceRegenerationTests: TestCase[] = [
  {
    name: 'level 1 resolves base tier minimum dice of 30',
    run: () => {
      assertEqual(resolveDiceRegenMinDice(1), 30, 'Expected level 1 minDice = 30');
    },
  },
  {
    name: 'level 10 resolves tier 3 minimum dice of 50',
    run: () => {
      assertEqual(resolveDiceRegenMinDice(10), 50, 'Expected level 10 minDice = 50');
    },
  },
  {
    name: 'level 100 resolves top tier minimum dice of 160',
    run: () => {
      assertEqual(resolveDiceRegenMinDice(100), 160, 'Expected level 100 minDice = 160');
    },
  },
  {
    name: 'regen rate per hour is minDice / 2',
    run: () => {
      assertEqual(resolveDiceRegenRatePerHour(1), 15, 'Expected level 1 regen rate = 15/hr');
      assertEqual(resolveDiceRegenRatePerHour(50), 60, 'Expected level 50 regen rate = 60/hr');
    },
  },
  {
    name: 'no regen when current pool is at or above minimum',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const result = applyDiceRegeneration({
        currentDicePool: 540,
        regenState: state,
        playerLevel: 1,
        nowMs: DICE_REGEN_FULL_WINDOW_MS, // 2 hours later
      });
      assertEqual(result.diceAdded, 0, 'Expected no regen when pool >= minDice');
      assertEqual(result.dicePool, 540, 'Expected pool unchanged');
    },
  },
  {
    name: 'full regen from 0 to minDice in 2 hours for level 1',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const result = applyDiceRegeneration({
        currentDicePool: 0,
        regenState: state,
        playerLevel: 1,
        nowMs: DICE_REGEN_FULL_WINDOW_MS, // exactly 2 hours
      });
      assertEqual(result.dicePool, 30, 'Expected full regen to minDice=30 after 2h');
      assertEqual(result.diceAdded, 30, 'Expected 30 dice added');
    },
  },
  {
    name: 'partial regen after 1 hour at level 1',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const oneHourMs = DICE_REGEN_FULL_WINDOW_MS / 2;
      const result = applyDiceRegeneration({
        currentDicePool: 0,
        regenState: state,
        playerLevel: 1,
        nowMs: oneHourMs,
      });
      assertEqual(result.dicePool, 15, 'Expected half regen after 1 hour');
      assertEqual(result.diceAdded, 15, 'Expected 15 dice added');
    },
  },
  {
    name: 'regen caps at minDice and does not exceed it',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const result = applyDiceRegeneration({
        currentDicePool: 20,
        regenState: state,
        playerLevel: 1,
        nowMs: DICE_REGEN_FULL_WINDOW_MS, // 2 hours
      });
      // deficit = 30 - 20 = 10, regen = 30, capped to 10
      assertEqual(result.dicePool, 30, 'Expected regen to cap at minDice');
      assertEqual(result.diceAdded, 10, 'Expected only deficit added');
    },
  },
  {
    name: 'initial regen state is created when null',
    run: () => {
      const result = applyDiceRegeneration({
        currentDicePool: 5,
        regenState: null,
        playerLevel: 1,
        nowMs: 1000,
      });
      assertEqual(result.diceAdded, 0, 'Expected no dice added on initial state creation');
      assert(result.regenState !== null, 'Expected regenState to be initialized');
      assertEqual(result.regenState.maxDice, 30, 'Expected initial maxDice = 30');
      assertEqual(result.regenState.lastRegenAtMs, 1000, 'Expected lastRegenAtMs to be set');
    },
  },
  {
    name: 'regen tier updates when player level increases',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      // Player leveled up to 50 (minDice = 120)
      const result = applyDiceRegeneration({
        currentDicePool: 0,
        regenState: state,
        playerLevel: 50,
        nowMs: DICE_REGEN_FULL_WINDOW_MS,
      });
      assertEqual(result.regenState.maxDice, 120, 'Expected tier to update to level 50 minDice');
      assertEqual(result.dicePool, 120, 'Expected full regen at new tier');
    },
  },
  {
    name: 'no regen for zero elapsed time',
    run: () => {
      const state = buildInitialDiceRegenState(1, 100);
      const result = applyDiceRegeneration({
        currentDicePool: 0,
        regenState: state,
        playerLevel: 1,
        nowMs: 100,
      });
      assertEqual(result.diceAdded, 0, 'Expected no regen with zero elapsed time');
      assertEqual(result.dicePool, 0, 'Expected pool unchanged');
    },
  },
];
