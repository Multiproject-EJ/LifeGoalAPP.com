// M16E: Blind-box collectible reveal modal
import { useEffect, useState } from 'react';
import type { CollectibleInfo } from '../services/islandRunRuntimeState';

interface ShardClaimModalProps {
  collectible: CollectibleInfo;
  bonusSummary?: string | null;
  onCollect: () => void;
}

/**
 * Full-screen blind-box reveal modal.
 * Shows a 0.5s shimmer animation before revealing the earned collectible.
 */
export function ShardClaimModal({ collectible, bonusSummary = null, onCollect }: ShardClaimModalProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="island-stop-modal-backdrop" role="presentation">
      <section
        className="island-stop-modal shard-claim-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Collectible reward reveal"
      >
        <p className="island-stop-modal__eyebrow">🎁 Milestone Reward</p>

        <div className={`shard-claim-modal__reveal${revealed ? ' shard-claim-modal__reveal--shown' : ''}`}>
          {revealed ? (
            <>
              <span className="shard-claim-modal__emoji">{collectible.emoji}</span>
              <p className="shard-claim-modal__name">{collectible.name}</p>
              <p className="shard-claim-modal__era">{collectible.era}</p>
              {bonusSummary ? <p className="shard-claim-modal__era">{bonusSummary}</p> : null}
            </>
          ) : (
            <span className="shard-claim-modal__shimmer" aria-label="Revealing…" />
          )}
        </div>

        {revealed && (
          <div className="island-stop-modal__actions island-stop-modal__actions--balanced island-stop-modal__actions--aligned island-stop-modal__actions--anchored">
            <button
              type="button"
              className="island-stop-modal__btn island-stop-modal__btn--action island-stop-modal__btn--primary"
              onClick={onCollect}
            >
              Collect!
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
