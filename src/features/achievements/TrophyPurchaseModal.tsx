import { useEffect, useRef } from 'react';
import type { TrophyItem } from '../../types/gamification';

type Props = {
  trophy: TrophyItem;
  currentPoints: number;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function TrophyPurchaseModal({ trophy, currentPoints, isProcessing, onConfirm, onCancel }: Props) {
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

  const remainingPoints = currentPoints - trophy.costPoints;

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
            <strong>💎 {trophy.costPoints}</strong>
          </div>
          <div>
            <span>After unlock</span>
            <strong>💎 {remainingPoints}</strong>
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
