export type DicePackSkuId =
  | 'dice_250'
  | 'dice_500'
  | 'dice_1200'
  | 'dice_3000'
  | 'dice_7500';

export type DicePackCatalogEntry = {
  id: DicePackSkuId;
  rolls: number;
  title: string;
  description: string;
  badge?: 'Starter' | 'Popular' | 'Best value';
};

export type DiceCommerceMode = 'test' | 'live';

/**
 * Browser-safe presentation mode. This never selects Stripe credentials or
 * prices—the Edge Function remains authoritative and fail-closed.
 *
 * Read inside a try/catch: Vite substitutes the exact expression
 * `import.meta.env.VITE_DICE_COMMERCE_MODE` at build time, but the Island Run
 * test harness compiles this module with plain tsc and runs it under Node,
 * where `import.meta.env` is undefined and the property read throws.
 */
function readDiceCommerceMode(): DiceCommerceMode {
  try {
    return import.meta.env.VITE_DICE_COMMERCE_MODE === 'live' ? 'live' : 'test';
  } catch {
    return 'test';
  }
}

export const DICE_COMMERCE_MODE: DiceCommerceMode = readDiceCommerceMode();

/**
 * Paid dice catalog shared by the board, account screen and checkout service.
 * Stripe remains the price authority so currency/local pricing never drifts in
 * the client. Checkout language follows the fail-closed presentation mode.
 */
export const DICE_PACK_CATALOG: readonly DicePackCatalogEntry[] = [
  {
    id: 'dice_250',
    rolls: 250,
    title: 'Pocket Boost',
    description: 'For the next reward.',
    badge: 'Starter',
  },
  {
    id: 'dice_500',
    rolls: 500,
    title: 'Route Refill',
    description: 'A balanced refill.',
  },
  {
    id: 'dice_1200',
    rolls: 1_200,
    title: 'Momentum Pack',
    description: 'Build event momentum.',
    badge: 'Popular',
  },
  {
    id: 'dice_3000',
    rolls: 3_000,
    title: 'Rush Reserve',
    description: 'For a longer event push.',
  },
  {
    id: 'dice_7500',
    rolls: 7_500,
    title: 'Expedition Vault',
    description: 'The largest reserve.',
    badge: 'Best value',
  },
] as const;

const DICE_PACKS_BY_ID = new Map<DicePackSkuId, DicePackCatalogEntry>(
  DICE_PACK_CATALOG.map((pack) => [pack.id, pack]),
);

export function isDicePackSkuId(value: unknown): value is DicePackSkuId {
  return typeof value === 'string' && DICE_PACKS_BY_ID.has(value as DicePackSkuId);
}

export function resolveDicePackCatalogEntry(value: unknown): DicePackCatalogEntry {
  if (isDicePackSkuId(value)) {
    return DICE_PACKS_BY_ID.get(value)!;
  }
  return DICE_PACKS_BY_ID.get('dice_500')!;
}
