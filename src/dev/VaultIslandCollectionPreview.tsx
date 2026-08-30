import { useState } from 'react';
import { VaultIslandGiftUnlockModal } from '../features/gamification/level-worlds/components/VaultIslandGiftUnlockModal';
import VaultIslandCollectionModal from '../features/gamification/level-worlds/components/VaultIslandCollectionModal';
import { VAULT_ISLAND_COLLECTION_TREASURE_IDS } from '../features/gamification/level-worlds/services/islandRunVaultCollection';
import './VaultIslandCollectionPreview.css';

function readPreviewState() {
  if (typeof window === 'undefined') return { ownedCount: 3, featured: false, gift: false, sourceIslandNumber: 7, holdingsValue: 6_500 };
  const params = new URLSearchParams(window.location.search);
  const requestedCountRaw = params.get('owned');
  const requestedCount = Number(requestedCountRaw);
  const ownedCount = requestedCountRaw !== null && Number.isFinite(requestedCount)
    ? Math.max(0, Math.min(VAULT_ISLAND_COLLECTION_TREASURE_IDS.length, Math.floor(requestedCount)))
    : 3;
  const requestedSourceIsland = Number(params.get('island'));
  const requestedHoldingsRaw = params.get('holdings');
  const requestedHoldings = Number(requestedHoldingsRaw);
  return {
    ownedCount,
    featured: params.get('featured') === '1',
    gift: params.get('gift') === '1',
    sourceIslandNumber: Number.isFinite(requestedSourceIsland) && requestedSourceIsland > 0
      ? Math.floor(requestedSourceIsland)
      : 7,
    holdingsValue: requestedHoldingsRaw !== null && Number.isFinite(requestedHoldings) && requestedHoldings >= 0
      ? Math.floor(requestedHoldings)
      : 6_500,
  };
}

export default function VaultIslandCollectionPreview() {
  const previewState = readPreviewState();
  const [showGift, setShowGift] = useState(previewState.gift);
  const unlockedTreasureIds = VAULT_ISLAND_COLLECTION_TREASURE_IDS.slice(0, previewState.ownedCount);
  const collectionEntries = unlockedTreasureIds.map((treasureId, index) => {
    const sourceIslandNumber = index === unlockedTreasureIds.length - 1
      ? previewState.sourceIslandNumber
      : index + 1;
    return {
      treasureId,
      sourceIslandNumber,
      accessionNumber: `VI-${String(sourceIslandNumber).padStart(3, '0')}-${String(index + 1).padStart(2, '0')}`,
    };
  });
  const featuredTreasureId = unlockedTreasureIds[unlockedTreasureIds.length - 1];
  const featuredTreasure = previewState.featured && featuredTreasureId
    ? collectionEntries[collectionEntries.length - 1]
    : null;
  if (showGift) {
    return (
      <div className="vault-island-collection-preview">
        <img
          className="vault-island-collection-preview__island"
          src="/assets/islands/special/vault-island/vault-island-fallback.png"
          alt=""
          aria-hidden="true"
        />
        <div className="vault-island-collection-preview__hud" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <button type="button" className="vault-island-collection-preview__zoom" tabIndex={-1} aria-hidden="true">🔎</button>
        <button type="button" className="vault-island-collection-preview__vault" tabIndex={-1} aria-hidden="true">
          <img src="/assets/icons/vault-island-medallion-v001.png" alt="" />
        </button>
        <button type="button" className="vault-island-collection-preview__compass" tabIndex={-1} aria-hidden="true">
          <span />
        </button>
        <div className="vault-island-collection-preview__controller" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <VaultIslandGiftUnlockModal
          onClose={() => setShowGift(false)}
          onGoToVault={() => setShowGift(false)}
        />
      </div>
    );
  }

  return (
    <VaultIslandCollectionModal
      unlockedTreasureIds={unlockedTreasureIds}
      collectionEntries={collectionEntries}
      initialView={featuredTreasure ? 'vault' : undefined}
      featuredTreasure={featuredTreasure}
      holdingsValue={previewState.holdingsValue}
      onClose={() => undefined}
    />
  );
}
