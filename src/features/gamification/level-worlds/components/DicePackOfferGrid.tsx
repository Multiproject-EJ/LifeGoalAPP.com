import {
  DICE_COMMERCE_MODE,
  DICE_PACK_CATALOG,
  type DicePackCatalogEntry,
  type DicePackSkuId,
} from '../../../../services/dicePackPurchases';

type DicePackOfferGridProps = {
  loadingPackId: DicePackSkuId | null;
  onSelect: (packId: DicePackSkuId) => void;
  compact?: boolean;
  disabled?: boolean;
};

function visiblePacks(compact: boolean): readonly DicePackCatalogEntry[] {
  if (!compact) return DICE_PACK_CATALOG;
  return DICE_PACK_CATALOG.filter((pack) => pack.id === 'dice_500' || pack.id === 'dice_1200');
}

export function DicePackOfferGrid({
  loadingPackId,
  onSelect,
  compact = false,
  disabled = false,
}: DicePackOfferGridProps) {
  const isLive = DICE_COMMERCE_MODE === 'live';

  return (
    <div className={`island-run-dice-packs${compact ? ' island-run-dice-packs--compact' : ''}`}>
      {visiblePacks(compact).map((pack) => (
        <button
          key={pack.id}
          type="button"
          className={[
            'island-run-dice-pack',
            pack.badge ? 'island-run-dice-pack--featured' : '',
            pack.id === 'dice_7500' ? 'island-run-dice-pack--vault' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => onSelect(pack.id)}
          disabled={disabled || loadingPackId !== null}
        >
          <img
            className="island-run-dice-pack__art"
            src={
              pack.id === 'dice_7500'
                ? '/assets/market/supply-dock/expedition-vault-v2.webp'
                : '/assets/market/supply-dock/dice-pouch-card.webp'
            }
            alt=""
          />
          <span className="island-run-dice-pack__topline">
            <strong>{pack.title}</strong>
            {pack.badge ? <span className="island-run-dice-pack__badge">{pack.badge}</span> : null}
          </span>
          <span className="island-run-dice-pack__rolls">🎲 {pack.rolls.toLocaleString()} dice</span>
          <span className="island-run-dice-pack__description">{pack.description}</span>
          <span className="island-run-dice-pack__action">
            {loadingPackId === pack.id
              ? `Opening ${isLive ? 'secure' : 'test'} checkout…`
              : isLive
                ? 'See secure price →'
                : 'Open test checkout →'}
          </span>
        </button>
      ))}
      <p className="island-run-dice-packs__mode">
        {isLive
          ? 'Secure Stripe checkout · your local price appears before confirmation.'
          : 'Test mode · no live charge. Stripe shows the configured local price before confirmation.'}
      </p>
    </div>
  );
}
