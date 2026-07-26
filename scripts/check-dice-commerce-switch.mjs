import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const sourceUrl = new URL(
  '../supabase/functions/_shared/dice-commerce.ts',
  import.meta.url,
);
const source = await readFile(sourceUrl, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: sourceUrl.pathname,
}).outputText;
const commerce = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
);

const legacyTest = commerce.resolveDiceCommerceConfig(
  {
    STRIPE_SECRET_KEY: 'sk_test_legacy',
    STRIPE_PRICE_DICE_PACK_500: 'price_legacy_500',
  },
  'dice_500',
);
assert.equal(legacyTest.mode, 'test');
assert.equal(legacyTest.secretEnvName, 'STRIPE_SECRET_KEY');
assert.equal(legacyTest.priceEnvName, 'DEFAULT_TEST_DICE_PRICE_IDS');
assert.equal(legacyTest.priceId, commerce.DEFAULT_TEST_DICE_PRICE_IDS.dice_500);

const scopedTest = commerce.resolveDiceCommerceConfig(
  {
    STRIPE_COMMERCE_MODE: 'test',
    STRIPE_DICE_TEST_SECRET_KEY: 'sk_test_scoped',
    STRIPE_TEST_PRICE_DICE_PACK_250: 'price_test_250',
  },
  'dice_250',
);
assert.equal(scopedTest.secretKey, 'sk_test_scoped');
assert.equal(scopedTest.priceId, 'price_test_250');
assert.equal(scopedTest.priceEnvName, 'STRIPE_TEST_PRICE_DICE_PACK_250');

const live = commerce.resolveDiceCommerceConfig(
  {
    STRIPE_COMMERCE_MODE: 'live',
    STRIPE_DICE_LIVE_SECRET_KEY: 'sk_live_scoped',
    STRIPE_LIVE_PRICE_DICE_PACK_7500: 'price_live_7500',
  },
  'dice_7500',
);
assert.equal(live.mode, 'live');
assert.equal(live.secretKey, 'sk_live_scoped');
assert.equal(live.priceId, 'price_live_7500');

assert.throws(
  () => commerce.resolveDiceCommerceConfig(
    {
      STRIPE_COMMERCE_MODE: 'live',
      STRIPE_DICE_LIVE_SECRET_KEY: 'sk_test_wrong_mode',
      STRIPE_LIVE_PRICE_DICE_PACK_500: 'price_live_500',
    },
    'dice_500',
  ),
  /must contain a Stripe live secret key/,
);

assert.throws(
  () => commerce.resolveDiceCommerceConfig(
    {
      STRIPE_COMMERCE_MODE: 'live',
      STRIPE_SECRET_KEY: 'sk_live_legacy_not_allowed',
      STRIPE_PRICE_DICE_PACK_500: 'price_legacy_not_allowed',
    },
    'dice_500',
  ),
  /STRIPE_DICE_LIVE_SECRET_KEY/,
);

assert.throws(
  () => commerce.resolveDiceCommerceConfig(
    {
      STRIPE_COMMERCE_MODE: 'preview',
    },
    'dice_500',
  ),
  /must be either "test" or "live"/,
);

assert.deepEqual(
  Object.values(commerce.DICE_PACKS).map((pack) => pack.rolls),
  [250, 500, 1_200, 3_000, 7_500],
);

console.log('Dice commerce switch checks passed.');
