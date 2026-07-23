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

/**
 * Paid dice catalog shared by the board, account screen and checkout service.
 * Stripe remains the price authority so currency/local pricing never drifts in
 * the client. All checkout UI is explicitly marked as test mode until launch.
 */
export const DICE_PACK_CATALOG: readonly DicePackCatalogEntry[] = [
  {
    id: 'dice_250',
    rolls: 250,
    title: 'Pocket Boost',
    description: 'A short top-up when you are close to a reward.',
    badge: 'Starter',
  },
  {
    id: 'dice_500',
    rolls: 500,
    title: 'Route Refill',
    description: 'The existing balanced refill pack.',
  },
  {
    id: 'dice_1200',
    rolls: 1_200,
    title: 'Momentum Pack',
    description: 'Enough runway for a focused high-multiplier session.',
    badge: 'Popular',
  },
  {
    id: 'dice_3000',
    rolls: 3_000,
    title: 'Rush Reserve',
    description: 'Built for a longer event push and milestone chase.',
  },
  {
    id: 'dice_7500',
    rolls: 7_500,
    title: 'Expedition Vault',
    description: 'The largest reserve, with the strongest dice-per-price value.',
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
