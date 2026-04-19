import { resolveShopItemAffordability } from '../services/islandRunShopAffordability';

/**
 * ShopItemCostLine — renders a compact cost readout plus a shortfall chip
 * and progress bar when the player can't yet afford an item.
 *
 * Designed to slot into shop/market item buttons alongside the main label.
 * Pure UI — drives all math through `resolveShopItemAffordability`, so this
 * component has no state of its own.
 */
export interface ShopItemCostLineProps {
  /** The item cost in the relevant currency. */
  cost: number;
  /** The player's current balance in that currency. */
  balance: number;
  /** Currency icon, e.g. "🟣" for essence, "💎" for diamonds. */
  currencyIcon: string;
  /**
   * Accessible currency name used in the ARIA label of the progress bar —
   * e.g. "essence", "diamonds". Defaults to "currency".
   */
  currencyName?: string;
}

export function ShopItemCostLine(props: ShopItemCostLineProps) {
  const { cost, balance, currencyIcon, currencyName = 'currency' } = props;
  const { canAfford, shortfall, progressPct } = resolveShopItemAffordability({
    cost,
    balance,
  });

  return (
    <span className="island-run-shop-cost-line">
      <span className="island-run-shop-cost-line__cost">
        {cost} {currencyIcon}
      </span>
      {!canAfford && (
        <>
          <span className="island-run-shop-cost-line__shortfall">
            Need +{shortfall} {currencyIcon}
          </span>
          <span
            className="island-run-shop-cost-line__bar"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${balance} of ${cost} ${currencyName} saved`}
          >
            <span
              className="island-run-shop-cost-line__bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </span>
        </>
      )}
    </span>
  );
}
