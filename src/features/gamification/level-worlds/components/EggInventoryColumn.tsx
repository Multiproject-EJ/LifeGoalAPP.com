import { useRef, useEffect, useState } from 'react';
import type { EggRewardInventoryEntry } from '../services/islandRunGameStateStore';
import { getEggStageArtSrc } from '../services/eggService';
import './EggInventoryColumn.css';

const VISIBLE_SLOTS = 5;
const SLOT_HEIGHT = 76 + 8; // height + gap

interface EggInventoryColumnProps {
  inventory: EggRewardInventoryEntry[];
  onOpenEgg?: (eggRewardId: string) => void;
}

export function EggInventoryColumn({ inventory, onOpenEgg }: EggInventoryColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  const unopened = inventory.filter((e) => e.status === 'unopened');

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function updateHint() {
      if (!el) return;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SLOT_HEIGHT / 2;
      setHasMoreBelow(!atBottom && unopened.length > VISIBLE_SLOTS);
    }

    updateHint();
    el.addEventListener('scroll', updateHint, { passive: true });
    return () => el.removeEventListener('scroll', updateHint);
  }, [unopened.length]);

  return (
    <div className="egg-inventory-column">
      <div className="egg-inventory-column__header">
        <span className="egg-inventory-column__header-icon">🥚</span>
        {unopened.length > 0 && (
          <span className="egg-inventory-column__count">{unopened.length}</span>
        )}
      </div>

      {unopened.length === 0 ? (
        <div className="egg-inventory-column__empty">
          <div className="egg-inventory-column__empty-icon">🪺</div>
          <div className="egg-inventory-column__empty-text">No eggs yet</div>
        </div>
      ) : (
        <div className="egg-inventory-column__scroll" ref={scrollRef}>
          {unopened.map((entry) => (
            <EggSlot key={entry.eggRewardId} entry={entry} onOpen={onOpenEgg} />
          ))}
        </div>
      )}

      <div className={[
        'egg-inventory-column__scroll-hint',
        hasMoreBelow ? 'egg-inventory-column__scroll-hint--visible' : '',
      ].filter(Boolean).join(' ')}>
        <span className="egg-inventory-column__scroll-hint-arrow">▾</span>
      </div>
    </div>
  );
}

function EggSlot({
  entry,
  onOpen,
}: {
  entry: EggRewardInventoryEntry;
  onOpen?: (id: string) => void;
}) {
  const src = getEggStageArtSrc(entry.eggTier, 1);

  return (
    <button
      type="button"
      className={[
        'egg-inventory-column__slot',
        `egg-inventory-column__slot--${entry.eggTier}`,
      ].join(' ')}
      onClick={() => onOpen?.(entry.eggRewardId)}
      title={`${entry.eggTier === 'rare' ? 'Rare' : 'Common'} egg — tap to open`}
    >
      <img
        src={src}
        alt={`${entry.eggTier} egg`}
        className="egg-inventory-column__egg-img"
      />
      <span className={[
        'egg-inventory-column__tier-badge',
        `egg-inventory-column__tier-badge--${entry.eggTier}`,
      ].join(' ')}>
        {entry.eggTier === 'rare' ? 'Rare' : 'Common'}
      </span>
    </button>
  );
}
