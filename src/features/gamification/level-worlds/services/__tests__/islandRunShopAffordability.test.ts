import {
  resolveShopItemAffordability,
} from '../islandRunShopAffordability';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunShopAffordabilityTests: TestCase[] = [
  {
    name: 'balance above cost is affordable with 100% progress and 0 shortfall',
    run: () => {
      const result = resolveShopItemAffordability({ cost: 30, balance: 50 });
      assertEqual(result.canAfford, true, 'Expected canAfford=true');
      assertEqual(result.shortfall, 0, 'Expected shortfall=0');
      assertEqual(result.progressPct, 100, 'Expected progressPct=100');
    },
  },
  {
    name: 'balance equal to cost is exactly affordable',
    run: () => {
      const result = resolveShopItemAffordability({ cost: 30, balance: 30 });
      assertEqual(result.canAfford, true, 'Expected canAfford=true at parity');
      assertEqual(result.shortfall, 0, 'Expected shortfall=0');
      assertEqual(result.progressPct, 100, 'Expected progressPct=100');
    },
  },
  {
    name: 'balance below cost reports correct shortfall and percentage',
    run: () => {
      const result = resolveShopItemAffordability({ cost: 30, balance: 12 });
      assertEqual(result.canAfford, false, 'Expected canAfford=false');
      assertEqual(result.shortfall, 18, 'Expected shortfall=30-12=18');
      assertEqual(result.progressPct, 40, 'Expected progressPct=floor(100*12/30)=40');
    },
  },
  {
    name: 'zero balance reports full cost as shortfall and 0% progress',
    run: () => {
      const result = resolveShopItemAffordability({ cost: 30, balance: 0 });
      assertEqual(result.canAfford, false, 'Expected canAfford=false');
      assertEqual(result.shortfall, 30, 'Expected shortfall=30');
      assertEqual(result.progressPct, 0, 'Expected progressPct=0');
    },
  },
  {
    name: 'zero-cost items are always affordable with 100% progress',
    run: () => {
      const result = resolveShopItemAffordability({ cost: 0, balance: 0 });
      assertEqual(result.canAfford, true, 'Expected canAfford=true for free items');
      assertEqual(result.shortfall, 0, 'Expected shortfall=0');
      assertEqual(result.progressPct, 100, 'Expected progressPct=100');
    },
  },
  {
    name: 'negative cost is clamped to zero (treated as free)',
    run: () => {
      const result = resolveShopItemAffordability({ cost: -5, balance: 0 });
      assertEqual(result.canAfford, true, 'Expected canAfford=true after clamp');
      assertEqual(result.shortfall, 0, 'Expected shortfall=0');
    },
  },
  {
    name: 'negative balance is clamped to zero for shortfall math',
    run: () => {
      const result = resolveShopItemAffordability({ cost: 30, balance: -10 });
      assertEqual(result.canAfford, false, 'Expected canAfford=false');
      assertEqual(result.shortfall, 30, 'Expected shortfall=cost after clamp');
      assertEqual(result.progressPct, 0, 'Expected progressPct=0 after clamp');
    },
  },
  {
    name: 'fractional balance is floored before comparison',
    run: () => {
      const result = resolveShopItemAffordability({ cost: 30, balance: 29.9 });
      assertEqual(result.canAfford, false, 'Expected canAfford=false (floor 29.9 = 29)');
      assertEqual(result.shortfall, 1, 'Expected shortfall=1');
      assert(result.progressPct >= 90 && result.progressPct <= 99, 'Expected progressPct in [90,99]');
    },
  },
  {
    name: 'NaN cost defensively treated as zero',
    run: () => {
      const result = resolveShopItemAffordability({ cost: Number.NaN, balance: 10 });
      assertEqual(result.canAfford, true, 'Expected canAfford=true');
      assertEqual(result.shortfall, 0, 'Expected shortfall=0');
    },
  },
];
