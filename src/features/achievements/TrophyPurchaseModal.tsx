import { useEffect, useRef } from 'react';
import type { TrophyItem } from '../../types/gamification';
import { GOLD_PER_DIAMOND, splitGoldBalance } from '../../constants/economy';

type Props = {
  trophy: TrophyItem;
  currentGold: number;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function TrophyPurchaseModal({ trophy, currentGold, isProcessing, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCancel();
    };

    dialog.addEventListener('cancel', handleCancel);

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.close();
    };
  }, [onCancel]);

  const costInGold = trophy.costDiamonds * GOLD_PER_DIAMOND;
  const remainingGold = currentGold - costInGold;
  const currentGoldBreakdown = splitGoldBalance(currentGold);
  const remainingGoldBreakdown = splitGoldBalance(remainingGold);
  const currentGoldLabel = `💎 ${currentGoldBreakdown.diamonds.toLocaleString()}`;
  const remainingGoldLabel = `💎 ${remainingGoldBreakdown.diamonds.toLocaleString()}`;

  return (
    <dialog ref={dialogRef} className="trophy-purchase-modal">
      <div className="trophy-purchase-modal__header">
        <h3>Unlock {trophy.name}</h3>
        <button type="button" onClick={onCancel} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="trophy-purchase-modal__body">
        <div className="trophy-purchase-modal__icon">{trophy.icon}</div>
        <p>{trophy.description}</p>
        <div className="trophy-purchase-modal__summary">
          <div>
            <span>Cost</span>
            <strong>💎 {trophy.costDiamonds}</strong>
          </div>
          <div>
            <span>After unlock</span>
            <strong>{remainingGoldLabel}</strong>
          </div>
        </div>
        <div className="trophy-purchase-modal__summary">
          <div>
            <span>Current balance</span>
            <strong>{currentGoldLabel}</strong>
          </div>
        </div>
      </div>
      <div className="trophy-purchase-modal__actions">
        <button type="button" onClick={onCancel} className="trophy-purchase-modal__button">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="trophy-purchase-modal__button trophy-purchase-modal__button--primary"
          disabled={isProcessing}
        >
          {isProcessing ? 'Unlocking...' : 'Confirm Unlock'}
        </button>
      </div>
    </dialog>
  );
}
