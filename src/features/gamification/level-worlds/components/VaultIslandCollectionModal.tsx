import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import VaultIslandLab, { type VaultIslandLabView } from '../../../../dev/VaultIslandLab';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';
import type {
  VaultIslandCollectionEntry,
  VaultIslandCollectionTreasureId,
} from '../services/islandRunVaultCollection';
import { useVaultModalFocusTrap } from './useVaultModalFocusTrap';
import './VaultIslandCollectionModal.css';

export interface VaultIslandCollectionModalProps {
  onClose: () => void;
  unlockedTreasureIds: readonly VaultIslandCollectionTreasureId[];
  collectionEntries: readonly VaultIslandCollectionEntry[];
  initialView?: VaultIslandLabView;
  featuredTreasure?: VaultIslandCollectionEntry | null;
  holdingsValue?: number;
}

export default function VaultIslandCollectionModal({
  onClose,
  unlockedTreasureIds,
  collectionEntries,
  initialView,
  featuredTreasure,
  holdingsValue,
}: VaultIslandCollectionModalProps) {
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
      <VaultIslandLab
        embedded
        onClose={onClose}
        unlockedTreasureIds={unlockedTreasureIds}
        collectionEntries={collectionEntries}
        initialView={initialView}
        featuredTreasureId={featuredTreasure?.treasureId}
        featuredSourceIslandNumber={featuredTreasure?.sourceIslandNumber}
        holdingsValue={holdingsValue}
      />
    </div>,
    document.body,
  );
}
