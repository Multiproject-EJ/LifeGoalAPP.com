import {
  DICE_PACK_CATALOG,
  isDicePackSkuId,
  resolveDicePackCatalogEntry,
} from '../../../../../services/dicePackPurchases';
import { assert, assertEqual, type TestCase } from './testHarness';

export const dicePackPurchasesTests: TestCase[] = [
  {
    name: 'paid dice catalog preserves the existing 500 pack and adds distinct larger packs',
    run: () => {
      assertEqual(DICE_PACK_CATALOG.length, 5, 'Expected five test-mode dice packs');
      assertEqual(resolveDicePackCatalogEntry('dice_500').rolls, 500, 'Expected existing 500 pack');
      assertEqual(resolveDicePackCatalogEntry('dice_7500').rolls, 7_500, 'Expected largest expedition pack');
      assert(
        new Set(DICE_PACK_CATALOG.map((pack) => pack.id)).size === DICE_PACK_CATALOG.length,
        'Expected unique Stripe SKU ids',
      );
    },
  },
  {
    name: 'dice pack resolver rejects unknown ids and safely defaults to 500',
    run: () => {
      assertEqual(isDicePackSkuId('dice_1200'), true, 'Expected known SKU');
      assertEqual(isDicePackSkuId('dice_9999'), false, 'Expected unknown SKU rejection');
      assertEqual(resolveDicePackCatalogEntry('dice_9999').id, 'dice_500', 'Expected safe default pack');
    },
  },
];
