import {
  BONUS_BASE_RELEASE_PAYOUT,
  BONUS_CHARGE_TARGET,
  BONUS_CYCLE_LENGTH,
  applyBonusTileCharge,
  getBonusTileCharge,
  resetBonusTileChargeForIsland,
  sanitizeBonusTileChargeByIsland,
  type BonusTileChargeByIsland,
} from '../islandRunBonusTile';
import { assert, assertEqual, type TestCase } from './testHarness';

export const islandRunBonusTileTests: TestCase[] = [
  {
    name: 'BONUS_CYCLE_LENGTH equals 9 (8 charges + 1 release)',
    run: () => {
      assertEqual(BONUS_CHARGE_TARGET, 8, 'Charge target should be 8 landings');
      assertEqual(BONUS_CYCLE_LENGTH, 9, 'Cycle length should be 9 (charges + release)');
    },
  },
  {
    name: 'getBonusTileCharge: missing map / missing island / missing tile → 0',
    run: () => {
      assertEqual(getBonusTileCharge(undefined, 1, 0), 0, 'undefined map → 0');
      assertEqual(getBonusTileCharge(null, 1, 0), 0, 'null map → 0');
      assertEqual(getBonusTileCharge({}, 1, 0), 0, 'empty map → 0');
      assertEqual(getBonusTileCharge({ '1': {} }, 1, 0), 0, 'empty inner → 0');
      assertEqual(getBonusTileCharge({ '1': { 5: 3 } }, 1, 7), 0, 'missing tile idx → 0');
    },
  },
  {
    name: 'getBonusTileCharge: clamps malformed values into [0, 8]',
    run: () => {
      assertEqual(getBonusTileCharge({ '1': { 5: -3 } }, 1, 5), 0, 'Negative → 0');
      assertEqual(getBonusTileCharge({ '1': { 5: 20 } }, 1, 5), 8, 'Above target → clamped to 8');
      assertEqual(getBonusTileCharge({ '1': { 5: Number.NaN } } as unknown as BonusTileChargeByIsland, 1, 5), 0, 'NaN → 0');
      assertEqual(getBonusTileCharge({ '1': { 5: 3.7 } }, 1, 5), 3, 'Fractional → floored');
    },
  },
  {
    name: 'applyBonusTileCharge: 1st..8th landing increments without releasing',
    run: () => {
      let ledger: BonusTileChargeByIsland = {};
      for (let i = 1; i <= BONUS_CHARGE_TARGET; i += 1) {
        const out = applyBonusTileCharge({
          bonusTileChargeByIsland: ledger,
          islandNumber: 1,
          tileIndex: 5,
        });
        assertEqual(out.released, false, `Landing ${i} should NOT release`);
        assertEqual(out.payout, null, `Landing ${i} should have no payout`);
        assertEqual(out.chargeAfter, i, `Landing ${i} should leave charge = ${i}`);
        assertEqual(getBonusTileCharge(out.bonusTileChargeByIsland, 1, 5), i, `Ledger should report charge ${i}`);
        ledger = out.bonusTileChargeByIsland;
      }
    },
  },
  {
    name: 'applyBonusTileCharge: 9th landing releases payout and resets counter to 0',
    run: () => {
      const primedLedger: BonusTileChargeByIsland = { '1': { 5: BONUS_CHARGE_TARGET } };
      const out = applyBonusTileCharge({
        bonusTileChargeByIsland: primedLedger,
        islandNumber: 1,
        tileIndex: 5,
      });
      assertEqual(out.released, true, '9th landing should release');
      assert(out.payout !== null, 'Release must return a payout');
      assertEqual(out.payout?.essence, BONUS_BASE_RELEASE_PAYOUT.essence, 'Essence matches base payout');
      assertEqual(out.payout?.dice, BONUS_BASE_RELEASE_PAYOUT.dice, 'Dice matches base payout');
      assertEqual(out.payout?.rewardBarProgress, BONUS_BASE_RELEASE_PAYOUT.rewardBarProgress, 'RewardBarProgress matches base payout');
      assertEqual(out.chargeAfter, 0, 'Counter resets to 0');
      assertEqual(getBonusTileCharge(out.bonusTileChargeByIsland, 1, 5), 0, 'Ledger reports charge 0');
      // The tile key should be cleared entirely (not left as 0) so the persisted
      // payload stays small.
      assert(out.bonusTileChargeByIsland['1']?.[5] === undefined, 'Tile entry should be removed after release');
    },
  },
  {
    name: 'applyBonusTileCharge: full 9-hit cycle (increment ×8 → release on 9)',
    run: () => {
      let ledger: BonusTileChargeByIsland = {};
      let releaseCount = 0;
      for (let landing = 1; landing <= BONUS_CYCLE_LENGTH; landing += 1) {
        const out = applyBonusTileCharge({
          bonusTileChargeByIsland: ledger,
          islandNumber: 3,
          tileIndex: 17,
        });
        if (out.released) releaseCount += 1;
        ledger = out.bonusTileChargeByIsland;
      }
      assertEqual(releaseCount, 1, 'Exactly one release in a 9-landing cycle');
      assertEqual(getBonusTileCharge(ledger, 3, 17), 0, 'Counter resets to 0 after release');
    },
  },
  {
    name: 'applyBonusTileCharge: two consecutive full cycles yield two releases',
    run: () => {
      let ledger: BonusTileChargeByIsland = {};
      let releases = 0;
      for (let landing = 1; landing <= BONUS_CYCLE_LENGTH * 2; landing += 1) {
        const out = applyBonusTileCharge({
          bonusTileChargeByIsland: ledger,
          islandNumber: 1,
          tileIndex: 0,
        });
        if (out.released) releases += 1;
        ledger = out.bonusTileChargeByIsland;
      }
      assertEqual(releases, 2, '2 full cycles = 2 releases');
    },
  },
  {
    name: 'applyBonusTileCharge: does not mutate the input map',
    run: () => {
      const original: BonusTileChargeByIsland = { '1': { 5: 3 } };
      const snapshot = JSON.stringify(original);
      applyBonusTileCharge({
        bonusTileChargeByIsland: original,
        islandNumber: 1,
        tileIndex: 5,
      });
      assertEqual(JSON.stringify(original), snapshot, 'Input ledger must remain unchanged');
    },
  },
  {
    name: 'applyBonusTileCharge: charges on different tiles/islands are independent',
    run: () => {
      let ledger: BonusTileChargeByIsland = {};
      ledger = applyBonusTileCharge({ bonusTileChargeByIsland: ledger, islandNumber: 1, tileIndex: 5 }).bonusTileChargeByIsland;
      ledger = applyBonusTileCharge({ bonusTileChargeByIsland: ledger, islandNumber: 1, tileIndex: 5 }).bonusTileChargeByIsland;
      ledger = applyBonusTileCharge({ bonusTileChargeByIsland: ledger, islandNumber: 1, tileIndex: 7 }).bonusTileChargeByIsland;
      ledger = applyBonusTileCharge({ bonusTileChargeByIsland: ledger, islandNumber: 2, tileIndex: 5 }).bonusTileChargeByIsland;
      assertEqual(getBonusTileCharge(ledger, 1, 5), 2, 'Tile 5 on island 1 → 2');
      assertEqual(getBonusTileCharge(ledger, 1, 7), 1, 'Tile 7 on island 1 → 1');
      assertEqual(getBonusTileCharge(ledger, 2, 5), 1, 'Tile 5 on island 2 → 1');
      assertEqual(getBonusTileCharge(ledger, 2, 7), 0, 'Tile 7 on island 2 → 0 (never touched)');
    },
  },
  {
    name: 'applyBonusTileCharge: invalid tileIndex leaves state unchanged',
    run: () => {
      const ledger: BonusTileChargeByIsland = { '1': { 5: 3 } };
      const outNeg = applyBonusTileCharge({ bonusTileChargeByIsland: ledger, islandNumber: 1, tileIndex: -1 });
      assertEqual(outNeg.released, false, 'Negative idx → no release');
      assertEqual(outNeg.chargeAfter, 0, 'Negative idx → chargeAfter 0');
      assertEqual(getBonusTileCharge(outNeg.bonusTileChargeByIsland, 1, 5), 3, 'Other charges preserved');

      const outNaN = applyBonusTileCharge({ bonusTileChargeByIsland: ledger, islandNumber: Number.NaN, tileIndex: 5 });
      assertEqual(outNaN.released, false, 'NaN island → no release');
    },
  },
  {
    name: 'resetBonusTileChargeForIsland: clears one island, preserves others',
    run: () => {
      const ledger: BonusTileChargeByIsland = {
        '1': { 5: 3, 7: 6 },
        '2': { 5: 2 },
        '3': { 0: 8 },
      };
      const next = resetBonusTileChargeForIsland(ledger, 2);
      assertEqual(Object.keys(next).sort().join(','), '1,3', 'Island 2 dropped, 1 and 3 remain');
      assertEqual(next['1']?.[5], 3, 'Island 1 tile 5 preserved');
      assertEqual(next['3']?.[0], 8, 'Island 3 tile 0 preserved');
    },
  },
  {
    name: 'sanitizeBonusTileChargeByIsland: drops malformed entries and clamps values',
    run: () => {
      const dirty = {
        '1': { 5: 3, 7: 20, 9: -1, 11: Number.NaN },
        '2': 'not an object',
        '3': null,
        '4': { '-1': 4, 3: 5 },
      } as unknown as BonusTileChargeByIsland;
      const clean = sanitizeBonusTileChargeByIsland(dirty);
      assertEqual(clean['1']?.[5], 3, 'Valid charge preserved');
      assertEqual(clean['1']?.[7], BONUS_CHARGE_TARGET, 'Above-target charge clamped to 8');
      assertEqual(clean['1']?.[9], undefined, 'Negative charge dropped');
      assertEqual(clean['1']?.[11], undefined, 'NaN charge dropped');
      assertEqual(clean['2'], undefined, 'Non-object island value dropped');
      assertEqual(clean['3'], undefined, 'Null island value dropped');
      assertEqual(clean['4']?.[3], 5, 'Valid tile survives in island 4');
      assertEqual(clean['4']?.[-1], undefined, 'Negative tile idx dropped');
    },
  },
];
