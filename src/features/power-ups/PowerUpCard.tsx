import { PowerUp } from '../../types/gamification';

interface PowerUpCardProps {
  powerUp: PowerUp;
  currentPoints: number;
  onPurchase: (powerUp: PowerUp) => void;
  disabled?: boolean;
}

export function PowerUpCard({ powerUp, currentPoints, onPurchase, disabled }: PowerUpCardProps) {
  const canAfford = currentPoints >= powerUp.costPoints;
  const isDisabled = disabled || !canAfford;

  const getDurationText = () => {
    if (!powerUp.durationMinutes) return null;
    if (powerUp.durationMinutes < 60) {
      return `${powerUp.durationMinutes} min`;
    }
    const hours = Math.floor(powerUp.durationMinutes / 60);
    if (hours === 1) return '1 hour';
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  };

  const getEffectText = () => {
    switch (powerUp.effectType) {
      case 'xp_multiplier':
        return `${powerUp.effectValue}x XP`;
      case 'instant_xp':
        return `+${powerUp.effectValue} XP`;
      case 'extra_life':
        return `+${powerUp.effectValue} Life`;
      case 'streak_freeze':
        return `+${powerUp.effectValue} Shield`;
      case 'spin_token':
        return `+${powerUp.effectValue} Spin`;
      case 'mystery':
        return 'Random Reward';
      default:
        return '';
    }
  };

  return (
    <div className={`power-up-card ${isDisabled ? 'power-up-card--disabled' : ''}`}>
      <div className="power-up-card__icon">{powerUp.icon}</div>
      <div className="power-up-card__content">
        <h3 className="power-up-card__name">{powerUp.name}</h3>
        <p className="power-up-card__description">{powerUp.description}</p>
        
        <div className="power-up-card__details">
          <div className="power-up-card__effect">{getEffectText()}</div>
          {powerUp.durationMinutes && (
            <div className="power-up-card__duration">⏱️ {getDurationText()}</div>
          )}
        </div>

        <div className="power-up-card__footer">
          <div className="power-up-card__cost">
            <span className="power-up-card__cost-icon">💎</span>
            <span className="power-up-card__cost-value">{powerUp.costPoints}</span>
          </div>
          <button
            className="power-up-card__button"
            onClick={() => onPurchase(powerUp)}
            disabled={isDisabled}
          >
            {!canAfford ? 'Not Enough Points' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
