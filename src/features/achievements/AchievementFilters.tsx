type Props = {
  filterStatus: 'all' | 'unlocked' | 'locked';
  filterTier: string | null;
  searchQuery: string;
  onFilterStatusChange: (status: 'all' | 'unlocked' | 'locked') => void;
  onFilterTierChange: (tier: string | null) => void;
  onSearchQueryChange: (query: string) => void;
};

export function AchievementFilters({
  filterStatus,
  filterTier,
  searchQuery,
  onFilterStatusChange,
  onFilterTierChange,
  onSearchQueryChange,
}: Props) {
  return (
    <div className="achievement-filters">
      <div className="achievement-filters__status">
        <button
          className={`achievement-filters__button ${filterStatus === 'all' ? 'achievement-filters__button--active' : ''}`}
          onClick={() => onFilterStatusChange('all')}
        >
          All
        </button>
        <button
          className={`achievement-filters__button ${filterStatus === 'unlocked' ? 'achievement-filters__button--active' : ''}`}
          onClick={() => onFilterStatusChange('unlocked')}
        >
          Unlocked
        </button>
        <button
          className={`achievement-filters__button ${filterStatus === 'locked' ? 'achievement-filters__button--active' : ''}`}
          onClick={() => onFilterStatusChange('locked')}
        >
          Locked
        </button>
      </div>

      <div className="achievement-filters__tiers">
        <button
          className={`achievement-filters__tier ${filterTier === null ? 'achievement-filters__tier--active' : ''}`}
          onClick={() => onFilterTierChange(null)}
        >
          All Tiers
        </button>
        <button
          className={`achievement-filters__tier ${filterTier === 'bronze' ? 'achievement-filters__tier--active' : ''}`}
          onClick={() => onFilterTierChange('bronze')}
        >
          🥉 Bronze
        </button>
        <button
          className={`achievement-filters__tier ${filterTier === 'silver' ? 'achievement-filters__tier--active' : ''}`}
          onClick={() => onFilterTierChange('silver')}
        >
          🥈 Silver
        </button>
        <button
          className={`achievement-filters__tier ${filterTier === 'gold' ? 'achievement-filters__tier--active' : ''}`}
          onClick={() => onFilterTierChange('gold')}
        >
          🥇 Gold
        </button>
        <button
          className={`achievement-filters__tier ${filterTier === 'diamond' ? 'achievement-filters__tier--active' : ''}`}
          onClick={() => onFilterTierChange('diamond')}
        >
          💎 Diamond
        </button>
      </div>

      <div className="achievement-filters__search">
        <input
          type="search"
          placeholder="Search achievements..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="achievement-filters__search-input"
        />
      </div>
    </div>
  );
}
