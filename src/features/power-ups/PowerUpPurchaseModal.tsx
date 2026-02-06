import { PowerUp } from '../../types/gamification';
import { splitGoldBalance } from '../../constants/economy';

interface PowerUpPurchaseModalProps {
  powerUp: PowerUp;
  currentGold: number;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export function PowerUpPurchaseModal({
  powerUp,
  currentGold,
  onConfirm,
  onCancel,
  isProcessing,
}: PowerUpPurchaseModalProps) {
  const newBalance = currentGold - powerUp.costGold;
  const currentGoldBreakdown = splitGoldBalance(currentGold);
  const newGoldBreakdown = splitGoldBalance(newBalance);
  const currentGoldLabel =
    currentGoldBreakdown.diamonds > 0
      ? `💎 ${currentGoldBreakdown.diamonds.toLocaleString()} · 🪙 ${currentGoldBreakdown.goldRemainder.toLocaleString()}`
      : `🪙 ${currentGoldBreakdown.goldRemainder.toLocaleString()}`;
  const newGoldLabel =
    newGoldBreakdown.diamonds > 0
      ? `💎 ${newGoldBreakdown.diamonds.toLocaleString()} · 🪙 ${newGoldBreakdown.goldRemainder.toLocaleString()}`
      : `🪙 ${newGoldBreakdown.goldRemainder.toLocaleString()}`;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="power-up-modal" onClick={(e) => e.stopPropagation()}>
        <div className="power-up-modal__header">
          <h2 className="power-up-modal__title">Confirm Purchase</h2>
          <button className="power-up-modal__close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="power-up-modal__content">
          <div className="power-up-modal__icon">{powerUp.icon}</div>
          <h3 className="power-up-modal__name">{powerUp.name}</h3>
          <p className="power-up-modal__description">{powerUp.description}</p>

          <div className="power-up-modal__cost-breakdown">
            <div className="power-up-modal__cost-item">
              <span>Cost:</span>
              <span className="power-up-modal__cost-value">
                🪙 {powerUp.costGold}
              </span>
            </div>
            <div className="power-up-modal__cost-item">
              <span>Current Balance:</span>
              <span>{currentGoldLabel}</span>
            </div>
            <div className="power-up-modal__cost-item power-up-modal__cost-item--new-balance">
              <span>New Balance:</span>
              <span className={newBalance < 0 ? 'power-up-modal__cost-negative' : ''}>
                {newGoldLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="power-up-modal__actions">
          <button
            className="power-up-modal__button power-up-modal__button--cancel"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            className="power-up-modal__button power-up-modal__button--confirm"
            onClick={onConfirm}
            disabled={isProcessing || newBalance < 0}
          >
            {isProcessing ? 'Processing...' : 'Confirm Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}
