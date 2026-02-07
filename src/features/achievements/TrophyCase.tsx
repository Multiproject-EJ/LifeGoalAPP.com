import type { TrophyItem, UserTrophy } from '../../types/gamification';
import { splitGoldBalance } from '../../constants/economy';

const DEFAULT_LOCKED_LABEL = 'Unlock with diamonds in the shop.';

type Props = {
  trophies: TrophyItem[];
  ownedTrophies: UserTrophy[];
  currentGold: number;
  unlockedTiers: Array<'bronze' | 'silver' | 'gold' | 'diamond'>;
  isLoading: boolean;
  error: string | null;
  message: { type: 'success' | 'error'; text: string } | null;
  onRetry: () => void;
  onPurchase: (trophy: TrophyItem) => void;
};

export function TrophyCase({
  trophies,
  ownedTrophies,
  currentGold,
  unlockedTiers,
  isLoading,
  error,
  message,
  onRetry,
  onPurchase,
}: Props) {
  const ownedIds = new Set(ownedTrophies.map(item => item.trophyId));
  const goldBreakdown = splitGoldBalance(currentGold);
  const diamondBalance = goldBreakdown.diamonds;
  const diamondValueLabel = `💎 ${diamondBalance.toLocaleString()}`;
  const qualifiesForTier = (tier?: 'bronze' | 'silver' | 'gold' | 'diamond') =>
    !tier || unlockedTiers.includes(tier);

  return (
    <section className="trophy-case">
      <div className="trophy-case__header">
        <div>
          <p className="trophy-case__eyebrow">Trophy Case</p>
          <h2 className="trophy-case__title">🏅 Trophies & Plaques</h2>
          <p className="trophy-case__subtitle">
            Unlock achievements to earn the right to buy collectible plaques and jewelry with diamonds.
          </p>
        </div>
        <div className="trophy-case__balance">
          <span className="trophy-case__balance-label">Diamonds</span>
          <span className="trophy-case__balance-value">{diamondValueLabel}</span>
        </div>
      </div>

      {message && (
        <div className={`trophy-case__message trophy-case__message--${message.type}`}>
          {message.text}
        </div>
      )}

      {isLoading && <div className="trophy-case__status">Loading trophy case...</div>}

      {error && !isLoading && (
        <div className="trophy-case__status trophy-case__status--error">
          <p>⚠️ {error}</p>
          <button type="button" onClick={onRetry}>Try Again</button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="trophy-case__grid four-by-three-grid">
          {trophies.map(trophy => {
            const owned = ownedIds.has(trophy.id);
            const canAfford = diamondBalance >= trophy.costDiamonds;
            const isQualified = qualifiesForTier(trophy.requiredTier);
            const lockedLabel = trophy.requiredTier
              ? `Unlock a ${trophy.requiredTier} achievement to purchase.`
              : DEFAULT_LOCKED_LABEL;

            return (
              <article
                key={trophy.id}
                className={`trophy-card ${owned ? 'trophy-card--unlocked' : 'trophy-card--locked'}`}
              >
                <div className="trophy-card__icon" aria-hidden="true">
                  {trophy.icon}
                </div>
                <h3 className="trophy-card__name">{trophy.name}</h3>
                <p className="trophy-card__description">{trophy.description}</p>
                <div className="trophy-card__meta">
                  <span className="trophy-card__cost">💎 {trophy.costDiamonds}</span>
                  <span className="trophy-card__type">{trophy.category}</span>
                </div>
                <div className="trophy-card__footer">
                  {owned ? (
                    <span className="trophy-card__status">Unlocked</span>
                  ) : (
                    <>
                      <span className="trophy-card__lock">
                        {isQualified ? DEFAULT_LOCKED_LABEL : lockedLabel}
                      </span>
                      <button
                        type="button"
                        className="trophy-card__button"
                        onClick={() => onPurchase(trophy)}
                        disabled={!canAfford || !isQualified}
                      >
                        {!isQualified ? 'Earn the achievement' : canAfford ? 'Unlock' : 'Need more diamonds'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
