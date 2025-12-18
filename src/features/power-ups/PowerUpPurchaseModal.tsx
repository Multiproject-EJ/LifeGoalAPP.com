import { PowerUp } from '../../types/gamification';

interface PowerUpPurchaseModalProps {
  powerUp: PowerUp;
  currentPoints: number;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export function PowerUpPurchaseModal({
  powerUp,
  currentPoints,
  onConfirm,
  onCancel,
  isProcessing,
}: PowerUpPurchaseModalProps) {
  const newBalance = currentPoints - powerUp.costPoints;

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
                💎 {powerUp.costPoints}
              </span>
            </div>
            <div className="power-up-modal__cost-item">
              <span>Current Balance:</span>
              <span>💎 {currentPoints}</span>
            </div>
            <div className="power-up-modal__cost-item power-up-modal__cost-item--new-balance">
              <span>New Balance:</span>
              <span className={newBalance < 0 ? 'power-up-modal__cost-negative' : ''}>
                💎 {newBalance}
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
