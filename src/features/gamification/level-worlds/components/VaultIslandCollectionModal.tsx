import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import VaultCasinoLab from '../../../../dev/VaultCasinoLab';
import VaultIslandLab, { type VaultIslandLabView } from '../../../../dev/VaultIslandLab';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';
import type {
  VaultIslandCollectionEntry,
  VaultIslandCollectionTreasureId,
} from '../services/islandRunVaultCollection';
import type { VaultCasinoGameId } from '../services/islandRunVaultCasino';
import type { PurchaseVaultIslandUpgradeResult } from '../services/islandRunVaultProgressAction';
import type { VaultIslandProgress, VaultIslandUpgradeId } from '../services/islandRunVaultProgress';
import { useVaultModalFocusTrap } from './useVaultModalFocusTrap';
import './VaultIslandCollectionModal.css';

export interface VaultIslandCollectionModalProps {
  onClose: () => void;
  unlockedTreasureIds: readonly VaultIslandCollectionTreasureId[];
  collectionEntries: readonly VaultIslandCollectionEntry[];
  initialView?: VaultIslandLabView;
  featuredTreasure?: VaultIslandCollectionEntry | null;
  holdingsValue?: number;
  casinoAvailableGameId?: VaultCasinoGameId | null;
  vaultProgress: VaultIslandProgress;
  onPurchaseVaultUpgrade: (upgradeId: VaultIslandUpgradeId) => PurchaseVaultIslandUpgradeResult;
}

export default function VaultIslandCollectionModal({
  onClose,
  unlockedTreasureIds,
  collectionEntries,
  initialView,
  featuredTreasure,
  holdingsValue,
  casinoAvailableGameId = null,
  vaultProgress,
  onPurchaseVaultUpgrade,
}: VaultIslandCollectionModalProps) {
  const [showCasino, setShowCasino] = useState(false);
  const dialogRef = useVaultModalFocusTrap<HTMLDivElement>(onClose);
  useEffect(() => lockFullscreenPageScroll({ root: true }), []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="vault-island-collection-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Vault Island collection"
      tabIndex={-1}
    >
      {showCasino ? (
        <VaultCasinoLab
          mode="inspect"
          availableGameId={casinoAvailableGameId}
          onClose={() => setShowCasino(false)}
        />
      ) : (
        <VaultIslandLab
          embedded
          onClose={onClose}
          onOpenCasino={() => setShowCasino(true)}
          casinoAvailableGameId={casinoAvailableGameId}
          unlockedTreasureIds={unlockedTreasureIds}
          collectionEntries={collectionEntries}
          initialView={initialView}
          featuredTreasureId={featuredTreasure?.treasureId}
          featuredSourceIslandNumber={featuredTreasure?.sourceIslandNumber}
          holdingsValue={holdingsValue}
          vaultProgress={vaultProgress}
          onPurchaseVaultUpgrade={onPurchaseVaultUpgrade}
        />
      )}
    </div>,
    document.body,
  );
}
