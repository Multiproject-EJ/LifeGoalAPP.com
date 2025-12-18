type Props = {
  spinsAvailable: number;
  totalSpinsUsed: number;
};

export function SpinTokenIndicator({ spinsAvailable, totalSpinsUsed }: Props) {
  return (
    <div className="spin-token-indicator">
      <div className="spin-token-indicator__available">
        <span className="spin-token-indicator__icon">🎟️</span>
        <span className="spin-token-indicator__count">{spinsAvailable}</span>
        <span className="spin-token-indicator__label">
          {spinsAvailable === 1 ? 'spin available' : 'spins available'}
        </span>
      </div>
      
      <div className="spin-token-indicator__total">
        <span className="spin-token-indicator__stat">
          Total spins: {totalSpinsUsed}
        </span>
      </div>
    </div>
  );
}
