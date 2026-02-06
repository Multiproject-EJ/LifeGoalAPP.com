import type { TrophyItem, UserTrophy } from '../../types/gamification';

const DEFAULT_LOCKED_LABEL = 'Unlock with gold in the shop.';

type Props = {
  trophies: TrophyItem[];
  ownedTrophies: UserTrophy[];
  currentGold: number;
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
  isLoading,
  error,
  message,
  onRetry,
  onPurchase,
}: Props) {
  const ownedIds = new Set(ownedTrophies.map(item => item.trophyId));

  return (
    <section className="trophy-case">
      <div className="trophy-case__header">
        <div>
          <p className="trophy-case__eyebrow">Trophy Case</p>
          <h2 className="trophy-case__title">🏅 Trophies & Plaques</h2>
          <p className="trophy-case__subtitle">
            Spend gold to unlock cosmetic accolades and show off your progress.
          </p>
        </div>
        <div className="trophy-case__balance">
          <span className="trophy-case__balance-label">Gold</span>
          <span className="trophy-case__balance-value">🪙 {currentGold}</span>
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
            const canAfford = currentGold >= trophy.costGold;

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
                  <span className="trophy-card__cost">🪙 {trophy.costGold}</span>
                  <span className="trophy-card__type">{trophy.category}</span>
                </div>
                <div className="trophy-card__footer">
                  {owned ? (
                    <span className="trophy-card__status">Unlocked</span>
                  ) : (
                    <>
                      <span className="trophy-card__lock">{DEFAULT_LOCKED_LABEL}</span>
                      <button
                        type="button"
                        className="trophy-card__button"
                        onClick={() => onPurchase(trophy)}
                        disabled={!canAfford}
                      >
                        {canAfford ? 'Unlock' : 'Need more gold'}
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
