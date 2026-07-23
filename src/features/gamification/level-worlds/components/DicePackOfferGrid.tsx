import {
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
  return (
    <div className={`island-run-dice-packs${compact ? ' island-run-dice-packs--compact' : ''}`}>
      {visiblePacks(compact).map((pack) => (
        <button
          key={pack.id}
          type="button"
          className={`island-run-dice-pack${pack.badge ? ' island-run-dice-pack--featured' : ''}`}
          onClick={() => onSelect(pack.id)}
          disabled={disabled || loadingPackId !== null}
        >
          <span className="island-run-dice-pack__topline">
            <strong>{pack.title}</strong>
            {pack.badge ? <span className="island-run-dice-pack__badge">{pack.badge}</span> : null}
          </span>
          <span className="island-run-dice-pack__rolls">🎲 {pack.rolls.toLocaleString()} dice</span>
          <span className="island-run-dice-pack__description">{pack.description}</span>
          <span className="island-run-dice-pack__action">
            {loadingPackId === pack.id ? 'Opening test checkout…' : 'Choose pack'}
          </span>
        </button>
      ))}
      <p className="island-run-dice-packs__mode">
        Test mode · no live charge. Stripe shows the configured local price before confirmation.
      </p>
    </div>
  );
}
