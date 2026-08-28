import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CelebrationFireworks } from '../../../../components/CelebrationFireworks';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';
import { useVaultModalFocusTrap } from './useVaultModalFocusTrap';
import './VaultIslandGiftUnlockModal.css';

export interface VaultIslandGiftUnlockModalProps {
  onClose: () => void;
  onGoToVault: () => void;
}

const VAULT_ISLAND_ICON_SRC = '/assets/icons/vault-island-medallion-v001.png';

export function VaultIslandGiftUnlockModal({
  onClose,
  onGoToVault,
}: VaultIslandGiftUnlockModalProps) {
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);
  const focusTrapRef = useVaultModalFocusTrap<HTMLDivElement>(onClose, primaryActionRef);

  useEffect(() => lockFullscreenPageScroll({ root: true }), []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div ref={focusTrapRef} className="vault-island-gift-unlock" role="presentation" tabIndex={-1}>
      <div className="vault-island-gift-unlock__scrim" aria-hidden="true" />
      <CelebrationFireworks
        className="vault-island-gift-unlock__fireworks"
        variant="hero"
        placement="local"
        fit="cover"
      />

      <section
        className="vault-island-gift-unlock__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-island-gift-unlock-title"
        aria-describedby="vault-island-gift-unlock-description"
        tabIndex={-1}
      >
        <p className="vault-island-gift-unlock__eyebrow">Gift from Island 004</p>
        <div className="vault-island-gift-unlock__medallion" aria-hidden="true">
          <span className="vault-island-gift-unlock__medallion-halo" />
          <img src={VAULT_ISLAND_ICON_SRC} alt="" />
          <span className="vault-island-gift-unlock__new-ribbon">NEW</span>
        </div>
        <h2 id="vault-island-gift-unlock-title">Vault Island unlocked</h2>
        <p id="vault-island-gift-unlock-description">
          Your private treasure palace is now part of every expedition.
        </p>
        <div className="vault-island-gift-unlock__actions">
          <button
            ref={primaryActionRef}
            type="button"
            className="vault-island-gift-unlock__primary"
            onClick={onGoToVault}
          >
            Go to Vault
          </button>
          <button
            type="button"
            className="vault-island-gift-unlock__secondary"
            onClick={onClose}
          >
            Stay on Island 004
          </button>
        </div>
      </section>

      <button
        type="button"
        className="vault-island-gift-unlock__spotlight-launcher"
        aria-label="Go to the newly unlocked Vault Island"
        title="Vault Island"
        onClick={onGoToVault}
      >
        <span className="vault-island-gift-unlock__spotlight-ring" aria-hidden="true" />
        <span className="vault-island-gift-unlock__spotlight-shine" aria-hidden="true" />
        <img src={VAULT_ISLAND_ICON_SRC} alt="" aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}
