import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import VaultIslandLab, { type VaultIslandLabView } from '../../../../dev/VaultIslandLab';
import { lockFullscreenPageScroll } from '../../../../utils/scrollLock';
import type {
  VaultIslandCollectionEntry,
  VaultIslandCollectionTreasureId,
} from '../services/islandRunVaultCollection';
import './VaultIslandCollectionModal.css';

export interface VaultIslandCollectionModalProps {
  onClose: () => void;
  unlockedTreasureIds: readonly VaultIslandCollectionTreasureId[];
  initialView?: VaultIslandLabView;
  featuredTreasure?: VaultIslandCollectionEntry | null;
  holdingsValue?: number;
}

export default function VaultIslandCollectionModal({
  onClose,
  unlockedTreasureIds,
  initialView,
  featuredTreasure,
  holdingsValue,
}: VaultIslandCollectionModalProps) {
  useEffect(() => lockFullscreenPageScroll({ root: true }), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="vault-island-collection-modal" role="dialog" aria-modal="true" aria-label="Vault Island collection">
      <VaultIslandLab
        embedded
        onClose={onClose}
        unlockedTreasureIds={unlockedTreasureIds}
        initialView={initialView}
        featuredTreasureId={featuredTreasure?.treasureId}
        featuredSourceIslandNumber={featuredTreasure?.sourceIslandNumber}
        holdingsValue={holdingsValue}
      />
    </div>,
    document.body,
  );
}
