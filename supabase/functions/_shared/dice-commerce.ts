export type DiceCommerceMode = 'test' | 'live';

export type DicePackSkuId =
  | 'dice_250'
  | 'dice_500'
  | 'dice_1200'
  | 'dice_3000'
  | 'dice_7500';

export const DICE_PACKS: Record<
  DicePackSkuId,
  { rolls: number; priceEnvSuffix: string }
> = {
  dice_250: { rolls: 250, priceEnvSuffix: '250' },
  dice_500: { rolls: 500, priceEnvSuffix: '500' },
  dice_1200: { rolls: 1_200, priceEnvSuffix: '1200' },
  dice_3000: { rolls: 3_000, priceEnvSuffix: '3000' },
  dice_7500: { rolls: 7_500, priceEnvSuffix: '7500' },
};

/**
 * Sandbox Price IDs are identifiers, not credentials. Keeping the verified
 * test catalog here makes the demo checkout deployable without coupling it to
 * the legacy single-pack environment variable. Live Price IDs stay env-only.
 */
export const DEFAULT_TEST_DICE_PRICE_IDS: Record<DicePackSkuId, string> = {
  dice_250: 'price_1TxWT7F2MDiiXhcgj69uqMR4',
  dice_500: 'price_1TxWWKF2MDiiXhcgN9Y46wKU',
  dice_1200: 'price_1TxWTnF2MDiiXhcgl04MY4KC',
  dice_3000: 'price_1TxWUaF2MDiiXhcgKlAN1sii',
  dice_7500: 'price_1TxWV5F2MDiiXhcgmxWMSih0',
};

export function isDicePackSkuId(value: unknown): value is DicePackSkuId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DICE_PACKS, value);
}

type DiceCommerceEnvironment = Record<string, string | undefined>;

export type ResolvedDiceCommerceConfig = {
  mode: DiceCommerceMode;
  priceId: string;
  priceEnvName: string;
  secretKey: string;
  secretEnvName: string;
};

function requiredValue(
  environment: DiceCommerceEnvironment,
  name: string,
  fallbackName?: string,
): { name: string; value: string } {
  const value = environment[name];
  if (value) return { name, value };

  if (fallbackName) {
    const fallbackValue = environment[fallbackName];
    if (fallbackValue) return { name: fallbackName, value: fallbackValue };
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

export function resolveDiceCommerceConfig(
  environment: DiceCommerceEnvironment,
  packId: DicePackSkuId,
): ResolvedDiceCommerceConfig {
  const rawMode = environment.STRIPE_COMMERCE_MODE ?? 'test';
  if (rawMode !== 'test' && rawMode !== 'live') {
    throw new Error('STRIPE_COMMERCE_MODE must be either "test" or "live".');
  }

  const mode: DiceCommerceMode = rawMode;
  const secretEnvName = mode === 'test'
    ? 'STRIPE_DICE_TEST_SECRET_KEY'
    : 'STRIPE_DICE_LIVE_SECRET_KEY';
  const secret = requiredValue(
    environment,
    secretEnvName,
    mode === 'test' ? 'STRIPE_SECRET_KEY' : undefined,
  );
  const expectedKeyPrefix = mode === 'test' ? 'sk_test_' : 'sk_live_';
  if (!secret.value.startsWith(expectedKeyPrefix)) {
    throw new Error(`${secret.name} must contain a Stripe ${mode} secret key.`);
  }

  const pack = DICE_PACKS[packId];
  const priceEnvName = mode === 'test'
    ? `STRIPE_TEST_PRICE_DICE_PACK_${pack.priceEnvSuffix}`
    : `STRIPE_LIVE_PRICE_DICE_PACK_${pack.priceEnvSuffix}`;
  const legacyTestPriceEnvName = `STRIPE_PRICE_DICE_PACK_${pack.priceEnvSuffix}`;
  const configuredPrice = environment[priceEnvName];
  const defaultTestPrice = mode === 'test' ? DEFAULT_TEST_DICE_PRICE_IDS[packId] : undefined;
  const legacyTestPrice = mode === 'test' ? environment[legacyTestPriceEnvName] : undefined;
  const price = configuredPrice
    ? { name: priceEnvName, value: configuredPrice }
    : defaultTestPrice
      ? { name: 'DEFAULT_TEST_DICE_PRICE_IDS', value: defaultTestPrice }
      : legacyTestPrice
        ? { name: legacyTestPriceEnvName, value: legacyTestPrice }
        : requiredValue(environment, priceEnvName);
  if (!price.value.startsWith('price_')) {
    throw new Error(`${price.name} must contain a Stripe Price ID.`);
  }

  return {
    mode,
    priceId: price.value,
    priceEnvName: price.name,
    secretKey: secret.value,
    secretEnvName: secret.name,
  };
}
