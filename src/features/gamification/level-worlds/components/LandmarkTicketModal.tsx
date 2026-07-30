import { useEffect, useRef, useState } from 'react';
import { resolveShopItemAffordability } from '../services/islandRunShopAffordability';
import { ShopItemCostLine } from './ShopItemCostLine';

export interface LandmarkTicketModalProps {
  mode?: 'standard' | 'early';
  landmarkTitle: string;
  landmarkDescription?: string;
  landmarkIcon: string;
  islandNumber: number;
  stopNumber: number;
  cost: number;
  balance: number;
  fullCost?: number;
  savings?: number;
  prerequisiteTitle?: string | null;
  onClose: () => void;
  onPurchase: () => void;
  onExplore: () => void;
}

function cleanLandmarkTitle(title: string): string {
  return title.replace(/^[^A-Za-z0-9]+/, '').replace(/\s+Landmark$/i, '').trim();
}

export function LandmarkTicketModal({
  mode = 'standard',
  landmarkTitle,
  landmarkDescription,
  landmarkIcon,
  islandNumber,
  stopNumber,
  cost,
  balance,
  fullCost,
  savings = 0,
  prerequisiteTitle,
  onClose,
  onPurchase,
  onExplore,
}: LandmarkTicketModalProps) {
  const { canAfford, shortfall } = resolveShopItemAffordability({ cost, balance });
  const [isAdmitting, setIsAdmitting] = useState(false);
  const purchaseTimerRef = useRef<number | null>(null);
  const displayTitle = cleanLandmarkTitle(landmarkTitle) || 'Landmark';
  const isEarlyOffer = mode === 'early';
  const titleId = `landmark-ticket-${isEarlyOffer ? 'early' : 'standard'}-title`;

  useEffect(() => () => {
    if (purchaseTimerRef.current !== null) {
      window.clearTimeout(purchaseTimerRef.current);
    }
  }, []);

  const handlePrimaryAction = () => {
    if (!canAfford) {
      onExplore();
      return;
    }
    if (isAdmitting) return;
    setIsAdmitting(true);
    purchaseTimerRef.current = window.setTimeout(() => {
      purchaseTimerRef.current = null;
      onPurchase();
    }, 520);
  };

  return (
    <div
      className="landmark-ticket-modal__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className={`landmark-ticket-modal${isEarlyOffer ? ' landmark-ticket-modal--early' : ''}${isAdmitting ? ' landmark-ticket-modal--admitting' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="landmark-ticket-modal__close"
          aria-label="Close landmark pass"
          onClick={onClose}
          disabled={isAdmitting}
        >
          ×
        </button>

        <header className="landmark-ticket-modal__heading">
          <p className="landmark-ticket-modal__eyebrow">
            {isEarlyOffer ? 'Early route discovered' : 'The way is open'}
          </p>
          <h2 id={titleId}>
            {isEarlyOffer ? 'Reserve your landmark pass' : 'Claim your landmark pass'}
          </h2>
          <p>
            {isEarlyOffer
              ? 'Secure this passage now and keep the saving when the route unlocks.'
              : 'One pass opens this landmark permanently for the current island.'}
          </p>
        </header>

        <div className="landmark-ticket-modal__ticket" aria-label={`${displayTitle} admission pass`}>
          <span className="landmark-ticket-modal__ticket-notch landmark-ticket-modal__ticket-notch--left" aria-hidden="true" />
          <span className="landmark-ticket-modal__ticket-notch landmark-ticket-modal__ticket-notch--right" aria-hidden="true" />
          <div className="landmark-ticket-modal__ticket-main">
            <span className="landmark-ticket-modal__route-label">
              Island {String(islandNumber).padStart(2, '0')} · Passage {String(stopNumber).padStart(2, '0')}
            </span>
            <span className="landmark-ticket-modal__landmark-icon" aria-hidden="true">
              {landmarkIcon}
            </span>
            <strong className="landmark-ticket-modal__landmark-name">{displayTitle}</strong>
            <span className="landmark-ticket-modal__admit-copy">
              {isEarlyOffer ? 'Reserved passage' : 'Admit one captain'}
            </span>
          </div>
          <div className="landmark-ticket-modal__ticket-stub">
            <span>PASS</span>
            <strong>{String(stopNumber).padStart(2, '0')}</strong>
            <span className="landmark-ticket-modal__ticket-star" aria-hidden="true">✦</span>
          </div>
        </div>

        <div className="landmark-ticket-modal__details">
          {landmarkDescription ? (
            <p className="landmark-ticket-modal__description">{landmarkDescription}</p>
          ) : null}

          {isEarlyOffer && typeof fullCost === 'number' ? (
            <div className="landmark-ticket-modal__saving" role="status">
              <span>Early-route saving</span>
              <strong>Save {savings} 💰</strong>
              <s>{fullCost} 💰 later</s>
            </div>
          ) : null}

          {isEarlyOffer && prerequisiteTitle ? (
            <p className="landmark-ticket-modal__prerequisite">
              The pass activates after <strong>{cleanLandmarkTitle(prerequisiteTitle)}</strong> is complete.
            </p>
          ) : null}

          <div className="landmark-ticket-modal__price-row">
            <div>
              <span className="landmark-ticket-modal__price-label">
                {isEarlyOffer ? 'Reserve now' : 'Pass price'}
              </span>
              <ShopItemCostLine
                cost={cost}
                balance={balance}
                currencyIcon="💰"
                currencyName="essence"
              />
            </div>
            <div className="landmark-ticket-modal__balance">
              <span>Essence balance</span>
              <strong>{balance} 💰</strong>
            </div>
          </div>

          <p className="landmark-ticket-modal__promise">
            <span aria-hidden="true">✦</span>
            {isEarlyOffer ? 'One chance to reserve at this price' : 'No repeat fee on this island'}
            <span aria-hidden="true">✦</span>
          </p>
        </div>

        <div className="landmark-ticket-modal__actions">
          <button
            type="button"
            className="landmark-ticket-modal__button landmark-ticket-modal__button--secondary"
            onClick={onClose}
            disabled={isAdmitting}
          >
            Not yet
          </button>
          <button
            type="button"
            className={`landmark-ticket-modal__button landmark-ticket-modal__button--primary${canAfford ? '' : ' landmark-ticket-modal__button--shortfall'}`}
            onClick={handlePrimaryAction}
            disabled={isAdmitting}
          >
            {isAdmitting
              ? 'Pass accepted…'
              : canAfford
              ? `${isEarlyOffer ? 'Reserve pass' : 'Buy pass & enter'} · ${cost} 💰`
              : `Find ${shortfall} more 💰`}
          </button>
        </div>
      </section>
    </div>
  );
}
