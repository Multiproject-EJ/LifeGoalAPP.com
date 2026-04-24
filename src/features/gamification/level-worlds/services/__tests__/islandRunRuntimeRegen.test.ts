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
    name: 'adds dice when elapsed time has accumulated below floor',
    run: () => {
      const regen = buildInitialDiceRegenState(1, 0);
      const result = resolveRuntimeDiceRegenUpdate({
        snapshot: {
          dicePool: 0,
          diceRegenState: regen,
        },
        playerLevel: 1,
        nowMs: 60 * 60 * 1000, // 1 hour => +15 at level 1
      });
      assert(result !== null, 'Expected dice gain update');
      assertEqual(result!.dicePool, 15, 'Expected +15 dice after one hour at L1');
      assertEqual(result!.diceAdded, 15, 'Expected reported delta to match granted dice');
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
      assertEqual(result!.diceRegenState.maxDice, 108, 'Expected L50 floor');
    },
  },
];
