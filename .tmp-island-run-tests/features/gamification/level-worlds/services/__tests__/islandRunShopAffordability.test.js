"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunShopAffordabilityTests = void 0;
const islandRunShopAffordability_1 = require("../islandRunShopAffordability");
const testHarness_1 = require("./testHarness");
exports.islandRunShopAffordabilityTests = [
    {
        name: 'balance above cost is affordable with 100% progress and 0 shortfall',
        run: () => {
            const result = (0, islandRunShopAffordability_1.resolveShopItemAffordability)({ cost: 30, balance: 50 });
            (0, testHarness_1.assertEqual)(result.canAfford, true, 'Expected canAfford=true');
            (0, testHarness_1.assertEqual)(result.shortfall, 0, 'Expected shortfall=0');
            (0, testHarness_1.assertEqual)(result.progressPct, 100, 'Expected progressPct=100');
        },
    },
    {
        name: 'balance equal to cost is exactly affordable',
        run: () => {
            const result = (0, islandRunShopAffordability_1.resolveShopItemAffordability)({ cost: 30, balance: 30 });
            (0, testHarness_1.assertEqual)(result.canAfford, true, 'Expected canAfford=true at parity');
            (0, testHarness_1.assertEqual)(result.shortfall, 0, 'Expected shortfall=0');
            (0, testHarness_1.assertEqual)(result.progressPct, 100, 'Expected progressPct=100');
        },
    },
    {
        name: 'balance below cost reports correct shortfall and percentage',
        run: () => {
            const result = (0, islandRunShopAffordability_1.resolveShopItemAffordability)({ cost: 30, balance: 12 });
            (0, testHarness_1.assertEqual)(result.canAfford, false, 'Expected canAfford=false');
            (0, testHarness_1.assertEqual)(result.shortfall, 18, 'Expected shortfall=30-12=18');
            (0, testHarness_1.assertEqual)(result.progressPct, 40, 'Expected progressPct=floor(100*12/30)=40');
        },
    },
    {
        name: 'zero balance reports full cost as shortfall and 0% progress',
        run: () => {
            const result = (0, islandRunShopAffordability_1.resolveShopItemAffordability)({ cost: 30, balance: 0 });
            (0, testHarness_1.assertEqual)(result.canAfford, false, 'Expected canAfford=false');
            (0, testHarness_1.assertEqual)(result.shortfall, 30, 'Expected shortfall=30');
            (0, testHarness_1.assertEqual)(result.progressPct, 0, 'Expected progressPct=0');
        },
    },
    {
        name: 'zero-cost items are always affordable with 100% progress',
        run: () => {
            const result = (0, islandRunShopAffordability_1.resolveShopItemAffordability)({ cost: 0, balance: 0 });
            (0, testHarness_1.assertEqual)(result.canAfford, true, 'Expected canAfford=true for free items');
            (0, testHarness_1.assertEqual)(result.shortfall, 0, 'Expected shortfall=0');
            (0, testHarness_1.assertEqual)(result.progressPct, 100, 'Expected progressPct=100');
        },
    },
    {
        name: 'negative cost is clamped to zero (treated as free)',
        run: () => {
            const result = (0, islandRunShopAffordability_1.resolveShopItemAffordability)({ cost: -5, balance: 0 });
            (0, testHarness_1.assertEqual)(result.canAfford, true, 'Expected canAfford=true after clamp');
            (0, testHarness_1.assertEqual)(result.shortfall, 0, 'Expected shortfall=0');
        },
    },
    {
        name: 'negative balance is clamped to zero for shortfall math',
        run: () => {
            const result = (0, islandRunShopAffordability_1.resolveShopItemAffordability)({ cost: 30, balance: -10 });
            (0, testHarness_1.assertEqual)(result.canAfford, false, 'Expected canAfford=false');
            (0, testHarness_1.assertEqual)(result.shortfall, 30, 'Expected shortfall=cost after clamp');
            (0, testHarness_1.assertEqual)(result.progressPct, 0, 'Expected progressPct=0 after clamp');
        },
    },
    {
        name: 'fractional balance is floored before comparison',
        run: () => {
            const result = (0, islandRunShopAffordability_1.resolveShopItemAffordability)({ cost: 30, balance: 29.9 });
            (0, testHarness_1.assertEqual)(result.canAfford, false, 'Expected canAfford=false (floor 29.9 = 29)');
            (0, testHarness_1.assertEqual)(result.shortfall, 1, 'Expected shortfall=1');
            (0, testHarness_1.assert)(result.progressPct >= 90 && result.progressPct <= 99, 'Expected progressPct in [90,99]');
        },
    },
    {
        name: 'NaN cost defensively treated as zero',
        run: () => {
            const result = (0, islandRunShopAffordability_1.resolveShopItemAffordability)({ cost: Number.NaN, balance: 10 });
            (0, testHarness_1.assertEqual)(result.canAfford, true, 'Expected canAfford=true');
            (0, testHarness_1.assertEqual)(result.shortfall, 0, 'Expected shortfall=0');
        },
    },
];
