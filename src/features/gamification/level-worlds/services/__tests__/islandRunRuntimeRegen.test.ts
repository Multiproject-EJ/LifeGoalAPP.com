import { resolveRuntimeDiceRegenUpdate } from '../islandRunRuntimeRegen';
import { buildInitialDiceRegenState } from '../islandRunDiceRegeneration';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunRuntimeRegenTests: TestCase[] = [
  {
    name: 'bootstraps regen state when missing (null -> initialized)',
    run: () => {
      const result = resolveRuntimeDiceRegenUpdate({
        snapshot: {
          dicePool: 30,
          diceRegenState: null,
        },
        playerLevel: 1,
        nowMs: 1_000,
      });
      assert(result !== null, 'Expected regen update when state is missing');
      assertEqual(result!.dicePool, 30, 'Expected dice unchanged on bootstrap');
      assertEqual(result!.diceAdded, 0, 'Expected no dice grant on bootstrap');
      assertEqual(result!.diceRegenState.maxDice, 30, 'Expected L1 maxDice');
      assertEqual(result!.diceRegenState.lastRegenAtMs, 1_000, 'Expected anchor at nowMs');
    },
  },
  {
    name: 'returns null when no dice/regen delta exists',
    run: () => {
      const regen = buildInitialDiceRegenState(1, 0);
      const result = resolveRuntimeDiceRegenUpdate({
        snapshot: {
          dicePool: 30, // already at floor
          diceRegenState: regen,
        },
        playerLevel: 1,
        nowMs: 0, // no elapsed
      });
      assertEqual(result, null, 'Expected no-op when there is nothing to update');
    },
  },
  {
    name: 'dice above cap: anchor-only regen updates are treated as no-op',
    run: () => {
      const regen = buildInitialDiceRegenState(1, 0);
      const result = resolveRuntimeDiceRegenUpdate({
        snapshot: {
          dicePool: 43, // above L1 max (30)
          diceRegenState: regen,
        },
        playerLevel: 1,
        nowMs: 1_000,
      });
      assertEqual(result, null, 'Expected no-op when only lastRegenAtMs would advance above cap');
    },
  },
  {
    name: 'dice at cap: anchor-only regen updates are treated as no-op',
    run: () => {
      const regen = buildInitialDiceRegenState(1, 0);
      const result = resolveRuntimeDiceRegenUpdate({
        snapshot: {
          dicePool: 30, // equals L1 max
          diceRegenState: regen,
        },
        playerLevel: 1,
        nowMs: 1_000,
      });
      assertEqual(result, null, 'Expected no-op at cap when no dice can be added');
    },
  },
  {
    name: 'adds dice when elapsed time has accumulated below floor',
    run: () => {
      const regen = buildInitialDiceRegenState(1, 0);
      const result = resolveRuntimeDiceRegenUpdate({
        snapshot: {
          dicePool: 0,
          diceRegenState: regen,
        },
        playerLevel: 1,
        nowMs: 60 * 60 * 1000, // 1 hour at 8m interval => +7
      });
      assert(result !== null, 'Expected dice gain update');
      assertEqual(result!.dicePool, 7, 'Expected +7 dice after one hour at L1');
      assertEqual(result!.diceAdded, 7, 'Expected reported delta to match granted dice');
    },
  },
  {
    name: 'updates regen shape on level change even without dice gain',
    run: () => {
      const regen = buildInitialDiceRegenState(1, 0);
      const result = resolveRuntimeDiceRegenUpdate({
        snapshot: {
          dicePool: 200, // above floors
          diceRegenState: regen,
        },
        playerLevel: 50,
        nowMs: 0,
      });
      assert(result !== null, 'Expected regen-state update when level changes');
      assertEqual(result!.dicePool, 200, 'Expected dice unchanged above floor');
      assertEqual(result!.diceRegenState.maxDice, 125, 'Expected L50 floor');
      assertEqual(result!.diceAdded, 0, 'Shape migration should not fabricate dice');
    },
  },
];
