import {
  resolveDiceRegenConfig,
  resolveDiceRegenMinDice,
  resolveDiceRegenRatePerHour,
  applyDiceRegeneration,
  buildInitialDiceRegenState,
  resolveNextRollEtaMs,
  resolveFullRefillEtaMs,
} from '../islandRunDiceRegeneration';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunDiceRegenerationTests: TestCase[] = [
  {
    name: 'level-band config: level 1 maps to 30 dice at 8 minutes',
    run: () => {
      const cfg = resolveDiceRegenConfig(1);
      assertEqual(cfg.maxDice, 30, 'Expected L1 maxDice=30');
      assertEqual(cfg.regenIntervalMinutes, 8, 'Expected L1 interval=8m');
    },
  },
  {
    name: 'level-band config: level 20 maps to 100 dice at 10 minutes',
    run: () => {
      const cfg = resolveDiceRegenConfig(20);
      assertEqual(cfg.maxDice, 100, 'Expected L20 maxDice=100');
      assertEqual(cfg.regenIntervalMinutes, 10, 'Expected L20 interval=10m');
    },
  },
  {
    name: 'level-band config: level 125+ maps to 200 dice at 7 minutes',
    run: () => {
      const cfg = resolveDiceRegenConfig(125);
      assertEqual(cfg.maxDice, 200, 'Expected L125 maxDice=200');
      assertEqual(cfg.regenIntervalMinutes, 7, 'Expected L125 interval=7m');
    },
  },
  {
    name: 'resolveDiceRegenMinDice mirrors band maxDice',
    run: () => {
      assertEqual(resolveDiceRegenMinDice(50), 125, 'Expected L50 maxDice from band');
    },
  },
  {
    name: 'resolveDiceRegenRatePerHour derives from interval minutes',
    run: () => {
      // L1: 8m interval => 7.5 dice/hour
      assertEqual(resolveDiceRegenRatePerHour(1), 7.5, 'Expected 60/8 = 7.5 dice/hour at L1');
      // L125: 7m interval => 8.571428...
      assertEqual(resolveDiceRegenRatePerHour(125), 60 / 7, 'Expected 60/7 dice/hour at L125');
    },
  },
  {
    name: 'no regen when current pool is at or above cap',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const result = applyDiceRegeneration({
        currentDicePool: 30,
        regenState: state,
        playerLevel: 1,
        nowMs: 8 * 60 * 1000,
      });
      assertEqual(result.diceAdded, 0, 'Expected no regen at cap');
      assertEqual(result.dicePool, 30, 'Expected pool unchanged at cap');
    },
  },
  {
    name: 'strict +1 cadence: one interval grants exactly one die',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const result = applyDiceRegeneration({
        currentDicePool: 0,
        regenState: state,
        playerLevel: 1,
        nowMs: 8 * 60 * 1000,
      });
      assertEqual(result.diceAdded, 1, 'Expected exactly +1 after one full interval');
      assertEqual(result.dicePool, 1, 'Expected pool +1');
    },
  },
  {
    name: 'carry behavior: insufficient elapsed time grants no dice',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const result = applyDiceRegeneration({
        currentDicePool: 0,
        regenState: state,
        playerLevel: 1,
        nowMs: 7 * 60 * 1000,
      });
      assertEqual(result.diceAdded, 0, 'Expected +0 before interval boundary');
      assertEqual(result.dicePool, 0, 'Expected pool unchanged before interval boundary');
    },
  },
  {
    name: 'catch-up grants one die per elapsed interval (deterministic)',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const result = applyDiceRegeneration({
        currentDicePool: 0,
        regenState: state,
        playerLevel: 1,
        nowMs: 24 * 60 * 1000, // 3 intervals
      });
      assertEqual(result.diceAdded, 3, 'Expected 3 dice across three full intervals');
      assertEqual(result.dicePool, 3, 'Expected pool +3 after 24 minutes');
    },
  },
  {
    name: 'regen caps at maxDice and does not exceed it',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const result = applyDiceRegeneration({
        currentDicePool: 29,
        regenState: state,
        playerLevel: 1,
        nowMs: 100 * 60 * 1000,
      });
      assertEqual(result.dicePool, 30, 'Expected cap at 30 for L1');
      assertEqual(result.diceAdded, 1, 'Expected only deficit granted');
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
      assert(result.regenState !== null, 'Expected regenState initialized');
      assertEqual(result.regenState.maxDice, 30, 'Expected L1 cap');
      assertEqual(result.regenState.lastRegenAtMs, 1000, 'Expected lastRegenAtMs set');
    },
  },
  {
    name: 'regen updates shape when player level increases to 50',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const result = applyDiceRegeneration({
        currentDicePool: 0,
        regenState: state,
        playerLevel: 50,
        nowMs: 9 * 60 * 1000,
      });
      assertEqual(result.regenState.maxDice, 125, 'Expected L50 cap from band');
      assertEqual(result.dicePool, 1, 'Expected only one interval grant at 9m');
    },
  },
  {
    name: 'ETA is 0 when pool already meets target',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const eta = resolveNextRollEtaMs({ dicePool: 5, target: 2, regenState: state, nowMs: 0 });
      assertEqual(eta, 0, 'Expected 0 when pool >= target');
    },
  },
  {
    name: 'ETA is infinite when regen state is null',
    run: () => {
      const eta = resolveNextRollEtaMs({ dicePool: 0, target: 2, regenState: null, nowMs: 0 });
      assertEqual(eta, Number.POSITIVE_INFINITY, 'Expected infinity without regen state');
    },
  },
  {
    name: 'ETA is infinite when target exceeds cap',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const eta = resolveNextRollEtaMs({ dicePool: 0, target: 50, regenState: state, nowMs: 0 });
      assertEqual(eta, Number.POSITIVE_INFINITY, 'Expected infinity above cap');
    },
  },
  {
    name: 'ETA for one die at level 1 equals 480000 ms (8 minutes)',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const eta = resolveNextRollEtaMs({ dicePool: 0, target: 1, regenState: state, nowMs: 0 });
      assertEqual(eta, 480000, 'Expected 8-minute ETA at L1');
    },
  },
  {
    name: 'ETA decreases as time elapses',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const eta = resolveNextRollEtaMs({ dicePool: 0, target: 1, regenState: state, nowMs: 60_000 });
      assertEqual(eta, 420_000, 'Expected 7 minutes remaining after 1 minute');
    },
  },
  {
    name: 'resolveFullRefillEtaMs remains deterministic (helper still available)',
    run: () => {
      const state = buildInitialDiceRegenState(1, 0);
      const eta = resolveFullRefillEtaMs({ dicePool: 0, regenState: state, nowMs: 0 });
      assertEqual(eta, 30 * 8 * 60 * 1000, 'Expected 30 dice * 8 minutes at L1');
    },
  },
];
